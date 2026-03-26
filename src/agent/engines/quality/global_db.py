"""
GlobalQualityDB — cross-project SQLite store for quality learning.

Replaces per-project .quality_db.jsonl silos with a single global database.
All projects contribute to and benefit from accumulated knowledge.

Features:
  - Schema versioned (migrations without data loss)
  - sqlite-vec for vectorial KNN (native SQL, partitioned by issue_type)
  - Temporal decay (recent records weigh more, half-life 90 days)
  - Hybrid KNN: numeric features + semantic embeddings
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

# Try to load sqlite-vec for vectorial KNN
try:
    import sqlite_vec
    from sqlite_vec import serialize_float32
    HAS_SQLITE_VEC = True
except ImportError:
    HAS_SQLITE_VEC = False
    def serialize_float32(v): return b""  # type: ignore

CURRENT_SCHEMA = 3

# Semantic weight per issue type: how much embedding matters vs numeric features
SEMANTIC_WEIGHT: Dict[str, float] = {
    "stub_impl": 0.8,
    "shallow_algorithm": 0.7,
    "bad_naming": 0.6,
    "weak_types": 0.4,
    "poor_encapsulation": 0.4,
    "missing_error_handling": 0.3,
    "no_docs": 0.2,
    "hardcoded_template": 0.2,
    "private_access": 0.1,
    "code_typos": 0.1,
}


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
    language: str = "typescript"
    module_role: Optional[str] = None
    consumers_count: Optional[int] = None
    dependency_depth: Optional[int] = None
    corrected: bool = False
    correction_note: Optional[str] = None
    timestamp: float = 0.0
    run_id: Optional[str] = None
    project_hash: Optional[str] = None
    emb_model: Optional[str] = None

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

    def __init__(self, db_path: Optional[Path] = None, embedding_dim: int = 128):
        self.db_path = Path(db_path) if db_path else _default_db_path()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(self.db_path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._embedding_dim = embedding_dim
        self.has_vec = False

        # Load sqlite-vec extension if available
        if HAS_SQLITE_VEC:
            try:
                self._conn.enable_load_extension(True)
                sqlite_vec.load(self._conn)
                self._conn.enable_load_extension(False)
                self.has_vec = True
            except Exception:
                pass

        self._init_schema()

    def _init_schema(self):
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS quality_records (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                schema_version  INTEGER NOT NULL DEFAULT 3,
                project_name    TEXT NOT NULL,
                project_hash    TEXT,
                language        TEXT NOT NULL DEFAULT 'typescript',
                issue_type      TEXT NOT NULL,
                severity        TEXT NOT NULL,
                features        TEXT NOT NULL,
                emb_model       TEXT,
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
            CREATE INDEX IF NOT EXISTS idx_issue_lang
                ON quality_records(issue_type, language);
            CREATE INDEX IF NOT EXISTS idx_project
                ON quality_records(project_name);
            CREATE INDEX IF NOT EXISTS idx_timestamp
                ON quality_records(timestamp);
        """)

        # sqlite-vec: vectorial KNN table
        if self.has_vec:
            try:
                self._conn.execute(f"""
                    CREATE VIRTUAL TABLE IF NOT EXISTS vec_quality
                    USING vec0(embedding float[{self._embedding_dim}])
                """)
            except Exception:
                self.has_vec = False

        self._conn.commit()

    def record(self, rec: GlobalQualityRecord, embedding: Optional[List[float]] = None) -> int:
        """Insert a quality observation. Returns row id."""
        cur = self._conn.execute("""
            INSERT INTO quality_records (
                schema_version, project_name, project_hash, language,
                issue_type, severity, features, emb_model,
                module_role, consumers_count, dependency_depth,
                action, strategy, applied,
                score_before, score_after, quality_delta, tokens_used,
                corrected, correction_note, timestamp, run_id
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            CURRENT_SCHEMA, rec.project_name, rec.project_hash, rec.language,
            rec.issue_type, rec.severity, json.dumps(rec.features), rec.emb_model,
            rec.module_role, rec.consumers_count, rec.dependency_depth,
            rec.action, rec.strategy, int(rec.applied),
            rec.score_before, rec.score_after, rec.quality_delta, rec.tokens_used,
            int(rec.corrected), rec.correction_note, rec.timestamp, rec.run_id
        ))
        rowid = cur.lastrowid

        # Insert embedding into sqlite-vec (same rowid)
        if embedding and self.has_vec and len(embedding) == self._embedding_dim:
            try:
                self._conn.execute(
                    "INSERT INTO vec_quality(rowid, embedding) VALUES (?,?)",
                    [rowid, serialize_float32(embedding)]
                )
            except Exception:
                pass

        self._conn.commit()
        return rowid

    def find_similar(
        self,
        issue_type: str,
        features: dict,
        embedding: Optional[List[float]] = None,
        language: str = "typescript",
        k: int = 5,
        decay_halflife_days: float = 90.0,
    ) -> List[Tuple[float, GlobalQualityRecord]]:
        """Hybrid KNN: sqlite-vec semantic + numeric features + temporal decay.

        When embedding is provided and sqlite-vec is available:
          1. sqlite-vec finds top 50 by embedding distance
          2. Numeric feature distance is computed
          3. Combined score with SEMANTIC_WEIGHT per issue_type
          4. Temporal decay applied

        Without embedding: falls back to numeric-only KNN.
        """
        # Step 1: Get candidate rows
        if embedding and self.has_vec and len(embedding) == self._embedding_dim:
            # sqlite-vec KNN: native SQL, fast
            try:
                knn_rows = self._conn.execute("""
                    SELECT rowid, distance FROM vec_quality
                    WHERE embedding MATCH ?
                    ORDER BY distance LIMIT 50
                """, [serialize_float32(embedding)]).fetchall()
                rowids = [r[0] for r in knn_rows]
                dist_map = {r[0]: r[1] for r in knn_rows}

                if rowids:
                    placeholders = ",".join("?" * len(rowids))
                    rows = self._conn.execute(f"""
                        SELECT * FROM quality_records
                        WHERE id IN ({placeholders})
                        AND issue_type = ?
                        AND applied = 1 AND corrected = 0
                    """, rowids + [issue_type]).fetchall()
                else:
                    rows = []
            except Exception:
                rows = []
                dist_map = {}
        else:
            dist_map = {}
            rows = []

        # Fallback: numeric-only search
        if not rows:
            rows = self._conn.execute("""
                SELECT * FROM quality_records
                WHERE issue_type = ?
                AND applied = 1 AND corrected = 0
                AND quality_delta IS NOT NULL
                AND language IN (?, 'typescript')
                ORDER BY timestamp DESC LIMIT 500
            """, (issue_type, language)).fetchall()

        # Step 2: Score each candidate
        now = time.time()
        feature_keys = sorted(features.keys())
        w_sem = SEMANTIC_WEIGHT.get(issue_type, 0.3)
        scored: List[Tuple[float, GlobalQualityRecord]] = []

        for row in rows:
            rec_features = json.loads(row["features"])

            # Numeric distance
            numeric_dist = sum(
                (features.get(fk, 0) - rec_features.get(fk, 0)) ** 2
                for fk in feature_keys
            ) ** 0.5

            # Semantic distance from sqlite-vec (if available)
            semantic_dist = dist_map.get(row["id"], 1.0)

            # Hybrid: combine numeric + semantic with issue-specific weight
            if dist_map:
                dist = (1 - w_sem) * numeric_dist + w_sem * semantic_dist
            else:
                dist = numeric_dist

            # Temporal decay
            age_days = (now - row["timestamp"]) / 86400
            decay = math.exp(-age_days * 0.693 / max(decay_halflife_days, 1))

            # Synthetic records (pretrain) weigh less
            synth = 0.5 if row["project_name"] == "__synthetic__" else 1.0

            weight = (1.0 / (1.0 + dist)) * decay * synth
            scored.append((weight, self._row_to_record(row)))

        scored.sort(key=lambda x: x[0], reverse=True)
        return scored[:k]

    def count_failed(self, action: str, days: int = 30) -> int:
        """Count failed auto-fix attempts for an action in recent days."""
        cutoff = time.time() - days * 86400
        row = self._conn.execute("""
            SELECT COUNT(*) FROM quality_records
            WHERE action = ? AND applied = 0 AND timestamp > ?
        """, (action, cutoff)).fetchone()
        return row[0] if row else 0

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
            language=row["language"] if "language" in row.keys() else "typescript",
            issue_type=row["issue_type"],
            severity=row["severity"],
            features=json.loads(row["features"]),
            emb_model=row["emb_model"] if "emb_model" in row.keys() else None,
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
