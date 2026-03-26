"""
QualityDB — persistent, append-only JSONL database for code quality patterns.

Records every quality observation: what was found, what features the code had,
what action was taken (auto-fix, manual, LLM rewrite), and whether it improved.

Same architecture as ErrorDB but tracks code quality, not TSC errors.
"""

import json
import os
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Tuple
from datetime import datetime


@dataclass
class QualityRecord:
    """A single quality observation + resolution."""
    # What was detected
    issue_type: str          # "stub_impl", "weak_types", "bad_naming", "no_docs",
                             # "private_access", "hardcoded_template", "missing_error_handling",
                             # "shallow_algorithm", "poor_structure", "generic_interface"
    severity: str            # "critical", "major", "minor", "style"
    file_pattern: str        # e.g. "*.ts", "index.ts", "agent.ts"
    module: str              # module name

    # Context features (numeric/bool dict for classifier training)
    features: Dict[str, float] = field(default_factory=dict)

    # What the original code looked like (pattern, not full code)
    original_pattern: str = ""    # normalized snippet showing the issue
    improved_pattern: str = ""    # what it was corrected to

    # Resolution
    action: str = ""         # "rewrite_algorithm", "add_types", "rename", "add_docs",
                             # "inject_interface", "add_error_handling", "restructure"
    strategy: str = ""       # "auto", "prompt_hint", "llm_rewrite", "manual", "template"
    success: bool = False
    quality_delta: float = 0.0   # improvement score (-1 to +1)
    tokens_cost: int = 0

    # Metadata
    project: str = ""
    timestamp: str = ""

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: dict) -> "QualityRecord":
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


class QualityDB:
    """Append-only JSONL database of quality observations."""

    def __init__(self, path: str = ".quality_db.jsonl"):
        self.path = path
        self.records: List[QualityRecord] = []
        self._patterns: Dict[str, List[QualityRecord]] = {}  # issue_type -> records
        self.load()

    def load(self):
        """Load existing records from disk."""
        self.records = []
        self._patterns = {}
        if not os.path.exists(self.path):
            return
        try:
            with open(self.path, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = QualityRecord.from_dict(json.loads(line))
                        self.records.append(rec)
                        self._patterns.setdefault(rec.issue_type, []).append(rec)
                    except (json.JSONDecodeError, TypeError):
                        continue
        except OSError:
            pass

    def save(self):
        """Write all records back to disk."""
        with open(self.path, "w") as f:
            for rec in self.records:
                f.write(json.dumps(rec.to_dict()) + "\n")

    def append(self, rec: QualityRecord):
        """Add a record and persist immediately."""
        if not rec.timestamp:
            rec.timestamp = datetime.now().isoformat()
        self.records.append(rec)
        self._patterns.setdefault(rec.issue_type, []).append(rec)
        # Append-only write
        try:
            with open(self.path, "a") as f:
                f.write(json.dumps(rec.to_dict()) + "\n")
        except OSError:
            pass

    def record_quality(
        self,
        issue_type: str,
        severity: str,
        features: Dict[str, float],
        action: str,
        strategy: str,
        success: bool,
        quality_delta: float = 0.0,
        tokens_cost: int = 0,
        module: str = "",
        project: str = "",
        original_pattern: str = "",
        improved_pattern: str = "",
        file_pattern: str = "",
    ) -> QualityRecord:
        """Convenience method to record a quality observation."""
        rec = QualityRecord(
            issue_type=issue_type,
            severity=severity,
            file_pattern=file_pattern,
            module=module,
            features=features,
            original_pattern=original_pattern,
            improved_pattern=improved_pattern,
            action=action,
            strategy=strategy,
            success=success,
            quality_delta=quality_delta,
            tokens_cost=tokens_cost,
            project=project,
        )
        self.append(rec)
        return rec

    def find_similar(
        self, issue_type: str, features: Dict[str, float], top_k: int = 5
    ) -> List[Tuple[QualityRecord, float]]:
        """Find past records similar to given features.

        Only uses records matching the issue_type — no cross-type fallback.
        """
        candidates = self._patterns.get(issue_type, [])
        if not candidates:
            # Only use records with matching issue type, not ALL records
            candidates = [r for r in self.records if r.issue_type == issue_type]

        scored: List[Tuple[QualityRecord, float]] = []
        for rec in candidates:
            sim = self._feature_similarity(features, rec.features)
            scored.append((rec, sim))

        scored.sort(key=lambda x: -x[1])
        return scored[:top_k]

    def best_action_for(
        self, issue_type: str, features: Dict[str, float]
    ) -> Optional[Tuple[str, str, float]]:
        """Predict best (action, strategy, confidence) from past successes.

        Requires at least 3 matching records to override rule-based fallback.
        """
        similar = self.find_similar(issue_type, features, top_k=10)
        if not similar or len(similar) < 3:
            return None  # Not enough data — let rules decide

        # Weighted voting on successful resolutions
        votes: Dict[str, float] = {}  # "action|strategy" -> weighted score
        total_weight = 0.0
        vote_count = 0

        for rec, sim in similar:
            if not rec.success or sim < 0.3:
                continue
            key = f"{rec.action}|{rec.strategy}"
            weight = sim * (1.0 + rec.quality_delta)  # better deltas = more weight
            votes[key] = votes.get(key, 0.0) + weight
            total_weight += weight
            vote_count += 1

        if not votes or total_weight == 0 or vote_count < 3:
            return None

        best_key = max(votes, key=lambda k: votes[k])
        action, strategy = best_key.split("|", 1)
        confidence = votes[best_key] / total_weight
        return (action, strategy, confidence)

    def patterns_for_type(self, issue_type: str) -> List[Tuple[str, str]]:
        """Get all (original, improved) pattern pairs for an issue type.

        These are the gold examples — what bad code looks like and what good
        code should look like. Used to build prompt hints.
        """
        pairs = []
        for rec in self._patterns.get(issue_type, []):
            if rec.success and rec.original_pattern and rec.improved_pattern:
                pairs.append((rec.original_pattern, rec.improved_pattern))
        return pairs

    def stats(self) -> Dict:
        """Summary statistics."""
        if not self.records:
            return {"total": 0, "success_rate": 0.0, "by_type": {}, "by_strategy": {}}

        total = len(self.records)
        successes = sum(1 for r in self.records if r.success)
        avg_delta = sum(r.quality_delta for r in self.records) / total

        by_type: Dict[str, Dict] = {}
        for rec in self.records:
            t = rec.issue_type
            if t not in by_type:
                by_type[t] = {"count": 0, "successes": 0, "tokens": 0}
            by_type[t]["count"] += 1
            if rec.success:
                by_type[t]["successes"] += 1
            by_type[t]["tokens"] += rec.tokens_cost

        by_strategy: Dict[str, int] = {}
        for rec in self.records:
            by_strategy[rec.strategy] = by_strategy.get(rec.strategy, 0) + 1

        return {
            "total": total,
            "success_rate": successes / total if total > 0 else 0.0,
            "avg_quality_delta": avg_delta,
            "by_type": by_type,
            "by_strategy": by_strategy,
            "tokens_total": sum(r.tokens_cost for r in self.records),
        }

    def _feature_similarity(
        self, a: Dict[str, float], b: Dict[str, float]
    ) -> float:
        """Compute similarity between two feature dicts (0-1)."""
        if not a or not b:
            return 0.0

        all_keys = set(a.keys()) | set(b.keys())
        if not all_keys:
            return 0.0

        matches = 0.0
        for key in all_keys:
            va = a.get(key, 0.0)
            vb = b.get(key, 0.0)
            # Boolean features: exact match
            if isinstance(va, bool) or isinstance(vb, bool):
                if va == vb:
                    matches += 1.0
            # Numeric: closeness
            elif isinstance(va, (int, float)) and isinstance(vb, (int, float)):
                diff = abs(va - vb)
                max_val = max(abs(va), abs(vb), 1.0)
                matches += 1.0 - min(diff / max_val, 1.0)
            # String: exact match
            else:
                if str(va) == str(vb):
                    matches += 1.0

        return matches / len(all_keys)
