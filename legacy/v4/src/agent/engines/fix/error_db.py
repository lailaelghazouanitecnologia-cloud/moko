"""
ErrorDB — persistent database of TSC errors and their resolutions.

Every time the FixEngine resolves an error (auto-fix or LLM), it records:
  - The error signature (code, message pattern, context features)
  - What fixed it (which strategy, what action)
  - Whether it worked (success/failure)
  - Cost (tokens used, 0 for auto-fix)

Over time this builds a corpus that the classifier uses to predict
the best fix strategy for new errors without needing LLM.

Storage: JSON lines file (one record per line, append-only, fast).
"""
from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Optional


@dataclass
class ErrorRecord:
    """One recorded error + its resolution."""
    # Error identity
    error_code: str             # "TS1005"
    message_pattern: str        # normalized message (names replaced with <NAME>)
    file_pattern: str           # file type pattern, e.g. "module/class.ts"

    # Context features (extracted from code around the error)
    features: dict = field(default_factory=dict)

    # Resolution
    action: str = ""            # "insert_brace", "fix_typo", "add_import", "llm_fix", etc.
    strategy: str = ""          # "syntax", "import", "typo", "llm", "none"
    success: bool = False
    tokens_cost: int = 0

    # Metadata
    project: str = ""
    timestamp: float = 0.0

    def to_dict(self) -> dict:
        return asdict(self)

    @staticmethod
    def from_dict(d: dict) -> "ErrorRecord":
        return ErrorRecord(**{k: v for k, v in d.items()
                             if k in ErrorRecord.__dataclass_fields__})


class ErrorDB:
    """Append-only database of error resolutions.

    Usage:
        db = ErrorDB(Path("projects/zzo/.error_db.jsonl"))
        db.load()
        db.record(error_record)
        db.save()

        # Query
        similar = db.find_similar("TS1005", {"has_catch_nearby": True})
    """

    def __init__(self, path: Optional[Path] = None):
        self.path = path
        self.records: list[ErrorRecord] = []
        self._index: dict[str, list[int]] = {}  # error_code -> record indices

    def load(self) -> None:
        """Load records from JSONL file."""
        if not self.path or not self.path.exists():
            return
        try:
            for line in self.path.read_text().splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    d = json.loads(line)
                    self.records.append(ErrorRecord.from_dict(d))
                except (json.JSONDecodeError, TypeError):
                    continue
            self._rebuild_index()
        except (OSError, IOError):
            pass

    def save(self) -> None:
        """Save all records to JSONL file."""
        if not self.path:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        lines = [json.dumps(r.to_dict()) for r in self.records]
        self.path.write_text('\n'.join(lines) + '\n')

    def record(self, rec: ErrorRecord) -> None:
        """Add a new error resolution record."""
        if not rec.timestamp:
            rec.timestamp = time.time()
        idx = len(self.records)
        self.records.append(rec)
        self._index.setdefault(rec.error_code, []).append(idx)

    def record_fix(self, error_code: str, message: str, features: dict,
                   action: str, strategy: str, success: bool,
                   tokens: int = 0, project: str = "") -> None:
        """Convenience: record a fix in one call."""
        self.record(ErrorRecord(
            error_code=error_code,
            message_pattern=self._normalize_message(message),
            file_pattern="",
            features=features,
            action=action,
            strategy=strategy,
            success=success,
            tokens_cost=tokens,
            project=project,
        ))

    def find_similar(self, error_code: str,
                     features: dict = None,
                     limit: int = 20) -> list[ErrorRecord]:
        """Find similar past errors by code and feature overlap.

        Returns records sorted by similarity (most similar first).
        """
        candidates = []
        indices = self._index.get(error_code, [])

        for idx in indices:
            rec = self.records[idx]
            if not rec.success:
                continue
            score = self._similarity(features or {}, rec.features)
            candidates.append((score, rec))

        candidates.sort(key=lambda x: -x[0])
        return [rec for _, rec in candidates[:limit]]

    def best_action_for(self, error_code: str,
                        features: dict = None) -> Optional[tuple[str, str, float]]:
        """Predict the best (action, strategy) for an error.

        Returns (action, strategy, confidence) or None if no data.
        Confidence = success_rate * similarity for the top action.
        """
        similar = self.find_similar(error_code, features, limit=50)
        if not similar:
            return None

        # Vote: which (action, strategy) has most successful uses?
        votes: dict[tuple[str, str], list[float]] = {}
        for rec in similar:
            key = (rec.action, rec.strategy)
            sim = self._similarity(features or {}, rec.features)
            votes.setdefault(key, []).append(sim)

        if not votes:
            return None

        # Weighted vote: sum of similarities
        best_key = max(votes, key=lambda k: sum(votes[k]))
        confidence = sum(votes[best_key]) / len(similar)
        return (best_key[0], best_key[1], min(confidence, 1.0))

    def stats(self) -> dict:
        """Summary statistics."""
        total = len(self.records)
        if total == 0:
            return {"total": 0, "success_rate": 0, "by_strategy": {}}

        success = sum(1 for r in self.records if r.success)
        by_strategy: dict[str, dict] = {}
        for r in self.records:
            s = by_strategy.setdefault(r.strategy, {"count": 0, "success": 0, "tokens": 0})
            s["count"] += 1
            if r.success:
                s["success"] += 1
            s["tokens"] += r.tokens_cost

        return {
            "total": total,
            "success_rate": success / total if total else 0,
            "auto_fix_rate": sum(1 for r in self.records if r.strategy != "llm" and r.success) / total,
            "by_strategy": by_strategy,
            "unique_codes": len(self._index),
        }

    def format_stats(self) -> str:
        s = self.stats()
        if s["total"] == 0:
            return "ErrorDB: empty"
        parts = [f"ErrorDB: {s['total']} records, {s['success_rate']:.0%} success"]
        for strat, info in s["by_strategy"].items():
            rate = info["success"] / info["count"] if info["count"] else 0
            parts.append(f"  {strat}: {info['count']}x ({rate:.0%} success, {info['tokens']:,} tokens)")
        return '\n'.join(parts)

    # ── Internal ─────────────────────────────────────────────

    def _rebuild_index(self) -> None:
        self._index.clear()
        for i, rec in enumerate(self.records):
            self._index.setdefault(rec.error_code, []).append(i)

    def _normalize_message(self, message: str) -> str:
        """Normalize error message for pattern matching.

        Replace specific names/paths with placeholders so similar
        errors match regardless of specific identifiers.
        """
        s = re.sub(r"'[A-Z]\w+'", "'<TYPE>'", message)
        s = re.sub(r"'[a-z]\w+'", "'<name>'", s)
        s = re.sub(r"'\./[^']+?'", "'<path>'", s)
        s = re.sub(r"'\.\./[^']+?'", "'<path>'", s)
        return s

    def _similarity(self, a: dict, b: dict) -> float:
        """Compute feature similarity between two feature dicts.

        Uses Jaccard-like overlap for booleans, closeness for numbers.
        """
        if not a or not b:
            return 0.0

        all_keys = set(a) | set(b)
        if not all_keys:
            return 0.0

        matches = 0.0
        for k in all_keys:
            va, vb = a.get(k), b.get(k)
            if va is None or vb is None:
                continue
            if isinstance(va, bool) and isinstance(vb, bool):
                matches += 1.0 if va == vb else 0.0
            elif isinstance(va, (int, float)) and isinstance(vb, (int, float)):
                # Closeness: 1.0 if equal, decays with distance
                diff = abs(va - vb)
                matches += 1.0 / (1.0 + diff)
            elif isinstance(va, str) and isinstance(vb, str):
                matches += 1.0 if va == vb else 0.0
            else:
                matches += 1.0 if va == vb else 0.0

        return matches / len(all_keys)
