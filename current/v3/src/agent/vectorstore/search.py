"""
Vector Store Search — hybrid search combining vector similarity with structured filters.

Supports:
- Semantic search (vector similarity via embeddings)
- Structured filters (project, descriptor_type, layer)
- Symbol search (find by type or function name)
"""

import json
from dataclasses import dataclass, field
from typing import Optional

from .embeddings import EmbeddingProvider


@dataclass
class SearchResult:
    """A single search result from the vector store."""
    id: str
    project: str
    file_path: str
    descriptor_type: str
    content: str
    score: float
    types: list[str] = field(default_factory=list)
    functions: list[str] = field(default_factory=list)
    layer: str = "logic"
    lines: int = 0


class VectorStore:
    """Hybrid search over Roska descriptor embeddings in LanceDB."""

    def __init__(self, db_path: str, embedder: EmbeddingProvider = None):
        try:
            import lancedb
            self.db = lancedb.connect(db_path)
        except ImportError:
            self.db = None
        self.embedder = embedder
        self._table = None

    def _get_table(self):
        if self.db is None:
            return None
        if self._table is None:
            try:
                self._table = self.db.open_table("descriptors")
            except Exception:
                return None
        return self._table

    def is_indexed(self) -> bool:
        """Check if the vector index exists and has data."""
        tbl = self._get_table()
        if tbl is None:
            return False
        try:
            return len(tbl) > 0
        except Exception:
            return False

    def count(self, project: str = None) -> int:
        """Count indexed chunks, optionally filtered by project."""
        tbl = self._get_table()
        if tbl is None:
            return 0
        try:
            if project:
                return len(tbl.search().where(f"project = '{project}'").to_pandas())
            return len(tbl)
        except Exception:
            return 0

    def search(self, query: str, projects: list[str] = None,
               descriptor_type: str = None, layer: str = None,
               top_k: int = 10) -> list[SearchResult]:
        """Hybrid search: vector similarity + structured WHERE filters."""
        tbl = self._get_table()
        if tbl is None or self.embedder is None:
            return []

        query_vec = self.embedder.embed_query(query)

        # Build query — over-fetch for filtering
        q = tbl.search(query_vec).limit(top_k * 3)

        # Apply structured filters
        where_clauses = []
        if projects:
            proj_list = ", ".join(f"'{p}'" for p in projects)
            where_clauses.append(f"project IN ({proj_list})")
        if descriptor_type:
            where_clauses.append(f"descriptor_type = '{descriptor_type}'")
        if layer:
            where_clauses.append(f"layer = '{layer}'")

        if where_clauses:
            q = q.where(" AND ".join(where_clauses))

        try:
            results = q.to_pandas()
        except Exception:
            return []

        # Convert to SearchResult objects
        out = []
        for _, row in results.head(top_k).iterrows():
            types = []
            functions = []
            try:
                types = json.loads(row.get("types", "[]"))
            except (json.JSONDecodeError, TypeError):
                pass
            try:
                functions = json.loads(row.get("functions", "[]"))
            except (json.JSONDecodeError, TypeError):
                pass

            out.append(SearchResult(
                id=row.get("id", ""),
                project=row.get("project", ""),
                file_path=row.get("file_path", ""),
                descriptor_type=row.get("descriptor_type", ""),
                content=row.get("content", ""),
                score=float(row.get("_distance", 0)),
                types=types,
                functions=functions,
                layer=row.get("layer", "logic"),
                lines=int(row.get("lines", 0)),
            ))

        return out

    def search_by_symbol(self, symbol_name: str,
                         projects: list[str] = None) -> list[SearchResult]:
        """Structured search: find descriptors containing a specific type or function."""
        tbl = self._get_table()
        if tbl is None:
            return []

        where = (
            f"types LIKE '%\"{symbol_name}\"%' OR "
            f"functions LIKE '%\"{symbol_name}\"%'"
        )
        if projects:
            proj_list = ", ".join(f"'{p}'" for p in projects)
            where = f"({where}) AND project IN ({proj_list})"

        try:
            results = tbl.search().where(where).to_pandas()
        except Exception:
            return []

        out = []
        for _, row in results.iterrows():
            types = []
            functions = []
            try:
                types = json.loads(row.get("types", "[]"))
            except (json.JSONDecodeError, TypeError):
                pass
            try:
                functions = json.loads(row.get("functions", "[]"))
            except (json.JSONDecodeError, TypeError):
                pass

            out.append(SearchResult(
                id=row.get("id", ""),
                project=row.get("project", ""),
                file_path=row.get("file_path", ""),
                descriptor_type=row.get("descriptor_type", ""),
                content=row.get("content", ""),
                score=0.0,
                types=types,
                functions=functions,
                layer=row.get("layer", "logic"),
                lines=int(row.get("lines", 0)),
            ))

        return out

    def list_projects(self) -> list[str]:
        """List all indexed projects."""
        tbl = self._get_table()
        if tbl is None:
            return []
        try:
            df = tbl.to_pandas()
            return sorted(df["project"].unique().tolist())
        except Exception:
            return []
