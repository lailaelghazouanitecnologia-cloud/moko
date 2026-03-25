"""
GlobalQualityDB — cross-project SQLite store for quality learning.

Replaces per-project .quality_db.jsonl silos with a single global database.
All projects contribute to and benefit from accumulated knowledge.

Features:
  - Schema versioned (migrations without data loss)
  - KNN indexed by issue_type (O(n_type) not O(n_total))
  - Temporal decay (recent records weigh more, half-life 90 days)
  - Migration from legacy JSONL files
"""
from __future__ import annotations

import json
import math
import sqlite3
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

CURRENT_SCHEMA = 2


def _default_db_path() -> Path:
    """Resolve global DB path: data/quality/global.db relative to workspace root."""
    here = Path(__file__).resolve()
    # Walk up to find workspace root (has src/agent/)
    for parent in [here] + list(here.parents):
        if (parent / "src" / "agent").exists():
            return parent / "data" / "quality" / "global.db"
    return here.parent / "global.db"


@dataclass
class GlobalQualityRecord:
    """A single quality observation in the global store."""
    project_name: str
    issue_type: str
    severity: str
    features: dict
    action: str
    strategy: str
    applied: bool
    score_before: Optional[float]
    score_after: Optional[float]
    quality_delta: float
    tokens_used: int = 0
    module_role: Optional[str] = None
    consumers_count: Optional[int] = None
    dependency_depth: Optional[int] = None
    corrected: bool = False
    correction_note: Optional[str] = None
    timestamp: float = 0.0
    run_id: Optional[str] = None
    project_hash: Optional[str] = None

    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()

    @property
    def success(self) -> bool:
        return self.quality_delta > 0 and self.applied


class GlobalQualityDB:
    """Cross-project SQLite store for quality learning.

    Usage:
        db = GlobalQualityDB()
        db.record(GlobalQualityRecord(...))
        similar = db.find_similar("weak_types", features_dict)
        action = db.best_action_for("weak_types", features_dict)
    """

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = Path(db_path) if db_path else _default_db_path()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self):
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS quality_records (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                schema_version  INTEGER NOT NULL DEFAULT 2,
                project_name    TEXT NOT NULL,
                project_hash    TEXT,
                issue_type      TEXT NOT NULL,
                severity        TEXT NOT NULL,
                features        TEXT NOT NULL,
                module_role     TEXT,
                consumers_count INTEGER,
                dependency_depth INTEGER,
                action          TEXT NOT NULL,
                strategy        TEXT NOT NULL,
                applied         INTEGER NOT NULL DEFAULT 1,
                score_before    REAL,
                score_after     REAL,
                quality_delta   REAL NOT NULL,
                tokens_used     INTEGER NOT NULL DEFAULT 0,
                corrected       INTEGER DEFAULT 0,
                correction_note TEXT,
                timestamp       REAL NOT NULL,
                run_id          TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_issue_type
                ON quality_records(issue_type);
            CREATE INDEX IF NOT EXISTS idx_project
                ON quality_records(project_name);
            CREATE INDEX IF NOT EXISTS idx_timestamp
                ON quality_records(timestamp);
        """)
        self._conn.commit()

    def record(self, rec: GlobalQualityRecord) -> int:
        """Insert a quality observation. Returns row id."""
        cur = self._conn.execute("""
            INSERT INTO quality_records (
                schema_version, project_name, project_hash,
                issue_type, severity, features,
                module_role, consumers_count, dependency_depth,
                action, strategy, applied,
                score_before, score_after, quality_delta, tokens_used,
                corrected, correction_note, timestamp, run_id
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            CURRENT_SCHEMA, rec.project_name, rec.project_hash,
            rec.issue_type, rec.severity, json.dumps(rec.features),
            rec.module_role, rec.consumers_count, rec.dependency_depth,
            rec.action, rec.strategy, int(rec.applied),
            rec.score_before, rec.score_after, rec.quality_delta, rec.tokens_used,
            int(rec.corrected), rec.correction_note, rec.timestamp, rec.run_id
        ))
        self._conn.commit()
        return cur.lastrowid

    def find_similar(
        self,
        issue_type: str,
        features: dict,
        k: int = 5,
        decay_halflife_days: float = 90.0,
    ) -> List[Tuple[float, GlobalQualityRecord]]:
        """KNN with index by issue_type + temporal decay.

        Complexity: O(n_issue_type) instead of O(n_total).
        """
        rows = self._conn.execute("""
            SELECT * FROM quality_records
            WHERE issue_type = ?
            AND applied = 1
            AND corrected = 0
            AND quality_delta IS NOT NULL
            ORDER BY timestamp DESC
            LIMIT 500
        """, (issue_type,)).fetchall()

        now = time.time()
        feature_keys = sorted(features.keys())
        scored: List[Tuple[float, GlobalQualityRecord]] = []

        for row in rows:
            rec_features = json.loads(row["features"])
            dist = sum(
                (features.get(fk, 0) - rec_features.get(fk, 0)) ** 2
                for fk in feature_keys
            ) ** 0.5
            age_days = (now - row["timestamp"]) / 86400
            decay = math.exp(-age_days * 0.693 / max(decay_halflife_days, 1))
            weight = (1.0 / (1.0 + dist)) * decay
            scored.append((weight, self._row_to_record(row)))

        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[:k]

    def best_action_for(
        self,
        issue_type: str,
        features: dict,
        min_records: int = 3,
        min_similarity: float = 0.3,
    ) -> Optional[Tuple[str, str, float]]:
        """Predict (action, strategy, confidence) from past successes."""
        similar = self.find_similar(issue_type, features, k=20)
        similar = [(w, r) for w, r in similar if w > min_similarity]

        if len(similar) < min_records:
            return None

        votes: Dict[Tuple[str, str], float] = {}
        total_weight = 0.0
        for weight, rec in similar:
            if rec.quality_delta <= 0:
                continue
            key = (rec.action, rec.strategy)
            votes[key] = votes.get(key, 0) + weight * max(rec.quality_delta, 0)
            total_weight += weight

        if not votes or total_weight == 0:
            return None

        best_key = max(votes, key=votes.get)
        confidence = votes[best_key] / total_weight
        return (best_key[0], best_key[1], confidence)

    def training_records(
        self, limit: int = 5000
    ) -> List[GlobalQualityRecord]:
        """Get valid records for classifier training."""
        rows = self._conn.execute("""
            SELECT * FROM quality_records
            WHERE corrected = 0 AND applied = 1
            AND quality_delta > 0
            ORDER BY timestamp DESC
            LIMIT ?
        """, (limit,)).fetchall()
        return [self._row_to_record(r) for r in rows]

    def total_records(self, project: Optional[str] = None) -> int:
        if project:
            return self._conn.execute(
                "SELECT COUNT(*) FROM quality_records WHERE project_name=?",
                (project,)
            ).fetchone()[0]
        return self._conn.execute(
            "SELECT COUNT(*) FROM quality_records"
        ).fetchone()[0]

    def patterns_for_type(self, issue_type: str, limit: int = 5) -> List[dict]:
        """Get high-delta records for prompt hints."""
        rows = self._conn.execute("""
            SELECT features, action, quality_delta
            FROM quality_records
            WHERE issue_type = ?
            AND applied = 1 AND quality_delta > 0.05
            ORDER BY quality_delta DESC
            LIMIT ?
        """, (issue_type, limit)).fetchall()
        return [{"features": json.loads(r["features"]),
                 "action": r["action"],
                 "delta": r["quality_delta"]} for r in rows]

    def stats(self) -> dict:
        """Summary statistics."""
        total = self.total_records()
        if total == 0:
            return {"total": 0, "success_rate": 0.0, "by_type": {}, "by_strategy": {}}

        successes = self._conn.execute(
            "SELECT COUNT(*) FROM quality_records WHERE quality_delta > 0 AND applied = 1"
        ).fetchone()[0]

        by_type: Dict[str, Dict] = {}
        for row in self._conn.execute(
            "SELECT issue_type, COUNT(*) as cnt, "
            "SUM(CASE WHEN quality_delta > 0 AND applied = 1 THEN 1 ELSE 0 END) as ok, "
            "SUM(tokens_used) as tok "
            "FROM quality_records GROUP BY issue_type"
        ).fetchall():
            by_type[row["issue_type"]] = {
                "count": row["cnt"], "successes": row["ok"], "tokens": row["tok"]
            }

        by_strategy: Dict[str, int] = {}
        for row in self._conn.execute(
            "SELECT strategy, COUNT(*) as cnt FROM quality_records GROUP BY strategy"
        ).fetchall():
            by_strategy[row["strategy"]] = row["cnt"]

        return {
            "total": total,
            "success_rate": successes / total if total > 0 else 0.0,
            "by_type": by_type,
            "by_strategy": by_strategy,
            "tokens_total": self._conn.execute(
                "SELECT COALESCE(SUM(tokens_used),0) FROM quality_records"
            ).fetchone()[0],
        }

    # ── Migration ────────────────────────────────────────────

    def migrate_from_jsonl(self, jsonl_path: Path, project_name: str) -> int:
        """Import records from a legacy .quality_db.jsonl. Returns count imported."""
        if not jsonl_path.exists():
            return 0
        count = 0
        with open(jsonl_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                data = self._migrate_v1(data, project_name)
                rec = GlobalQualityRecord(
                    project_name=data.get("project_name", project_name),
                    issue_type=data.get("issue_type", "unknown"),
                    severity=data.get("severity", "minor"),
                    features=data.get("features", {}),
                    action=data.get("action", "unknown"),
                    strategy=data.get("strategy", "unknown"),
                    applied=data.get("applied", True),
                    score_before=data.get("score_before"),
                    score_after=data.get("score_after"),
                    quality_delta=data.get("quality_delta", 0.0),
                    tokens_used=data.get("tokens_cost", 0),
                    timestamp=data.get("timestamp", time.time()),
                    module_role=data.get("module_role"),
                )
                self.record(rec)
                count += 1
        return count

    @staticmethod
    def _migrate_v1(data: dict, project_name: str) -> dict:
        """Migrate v1 JSONL record to v2 schema."""
        data.setdefault("project_name", project_name)
        data.setdefault("applied", True)
        data.setdefault("score_before", None)
        data.setdefault("score_after", None)
        # v1 had hardcoded delta 0.1/0.2 — discount to weak signal
        if data.get("quality_delta") in (0.1, 0.2):
            data["quality_delta"] = 0.05
        return data

    @staticmethod
    def _row_to_record(row) -> GlobalQualityRecord:
        return GlobalQualityRecord(
            project_name=row["project_name"],
            project_hash=row["project_hash"],
            issue_type=row["issue_type"],
            severity=row["severity"],
            features=json.loads(row["features"]),
            module_role=row["module_role"],
            consumers_count=row["consumers_count"],
            dependency_depth=row["dependency_depth"],
            action=row["action"],
            strategy=row["strategy"],
            applied=bool(row["applied"]),
            score_before=row["score_before"],
            score_after=row["score_after"],
            quality_delta=row["quality_delta"],
            tokens_used=row["tokens_used"],
            corrected=bool(row["corrected"]),
            correction_note=row["correction_note"],
            timestamp=row["timestamp"],
            run_id=row["run_id"],
        )

    def close(self):
        self._conn.close()

    @staticmethod
    def new_run_id() -> str:
        return uuid.uuid4().hex[:12]
