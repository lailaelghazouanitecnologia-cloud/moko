"""
SemanticStore — semantic search over code identifiers and descriptors.

Uses TF-IDF by default (zero external dependencies). Can be upgraded to
API embeddings for better quality. The store indexes method names, type
names, and descriptions for semantic matching.

Key capability: finds `mul` when searching for `multiply`, or
`setFromEulerAngles` when searching for `fromEuler`.
"""
from __future__ import annotations

import json
import hashlib
from dataclasses import dataclass, field
from pathlib import Path

from .similarity import NameNormalizer, cosine_similarity, tfidf_vectorize


@dataclass
class SemanticEntry:
    """One indexed entry in the semantic store."""
    id: str                      # hash of source + name
    name: str                    # original name (e.g. "multiply")
    normalized: str              # normalized tokens as string
    kind: str                    # "method", "type", "field"
    source: str                  # "playcanvas/core/math/mat4.yaml"
    parent_type: str             # "Mat4"
    context: str                 # extra context (signature, description)
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "normalized": self.normalized,
            "kind": self.kind,
            "source": self.source,
            "parent_type": self.parent_type,
            "context": self.context,
            "tags": self.tags,
        }

    @classmethod
    def from_dict(cls, d: dict) -> SemanticEntry:
        return cls(**d)


@dataclass
class SemanticMatch:
    """Result of a semantic search."""
    entry: SemanticEntry
    score: float               # 0.0-1.0 similarity
    match_reason: str          # "name_exact", "name_semantic", "context"


class SemanticStore:
    """Semantic search engine over code identifiers.

    Default: TF-IDF vectorization (zero dependencies).
    All entries are indexed as normalized token strings for matching.
    """

    def __init__(self):
        self.entries: list[SemanticEntry] = []
        self._vectors: list[list[float]] = []
        self._documents: list[str] = []  # normalized text per entry
        self._dirty = True  # needs re-vectorization

    # ── Indexing ──────────────────────────────────────────

    def add_entry(self, name: str, kind: str, source: str,
                  parent_type: str = "", context: str = "",
                  tags: list[str] = None):
        """Add one entry to the store."""
        normalized = NameNormalizer.normalized_str(name)
        entry_id = hashlib.sha256(
            f"{source}:{parent_type}:{name}".encode()
        ).hexdigest()[:12]

        entry = SemanticEntry(
            id=entry_id,
            name=name,
            normalized=normalized,
            kind=kind,
            source=source,
            parent_type=parent_type,
            context=context,
            tags=tags or [],
        )
        self.entries.append(entry)
        # Build document for TF-IDF: normalized name + parent type + context tokens
        doc_parts = NameNormalizer.normalize(name)
        if parent_type:
            doc_parts.extend(NameNormalizer.normalize(parent_type))
        if context:
            doc_parts.extend(context.lower().split()[:20])
        if tags:
            doc_parts.extend(t.lower() for t in tags)
        self._documents.append(" ".join(doc_parts))
        self._dirty = True

    def index_descriptor(self, descriptor_path: str, data: dict):
        """Index all types/methods/fields from a Roska descriptor."""
        for type_def in data.get("types", []):
            if not isinstance(type_def, dict):
                continue
            type_name = type_def.get("name", "")
            if not type_name:
                continue

            # Index the type itself
            self.add_entry(
                name=type_name,
                kind="type",
                source=descriptor_path,
                parent_type=type_name,
                context=type_def.get("kind", "class"),
                tags=[type_def.get("kind", "class")],
            )

            # Index methods
            for method_key in ("methods", "static_methods"):
                for m in type_def.get(method_key, []):
                    mname = m if isinstance(m, str) else m.get("name", "")
                    if mname:
                        sig = "" if isinstance(m, str) else m.get("sig", "")
                        self.add_entry(
                            name=mname,
                            kind="method",
                            source=descriptor_path,
                            parent_type=type_name,
                            context=sig,
                        )

            # Index fields
            for f in type_def.get("fields", []):
                fname = f if isinstance(f, str) else f.get("name", "")
                if ":" in fname:
                    fname = fname.split(":")[0].strip()
                if fname:
                    self.add_entry(
                        name=fname,
                        kind="field",
                        source=descriptor_path,
                        parent_type=type_name,
                    )

    def _rebuild_vectors(self):
        """Rebuild TF-IDF vectors from documents."""
        if not self._dirty or not self._documents:
            return
        self._vectors = tfidf_vectorize(self._documents)
        self._dirty = False

    # ── Search ────────────────────────────────────────────

    def search(self, query: str, kind: str = None,
               top_k: int = 10, min_score: float = 0.1) -> list[SemanticMatch]:
        """Search for entries semantically similar to query."""
        if not self.entries:
            return []

        self._rebuild_vectors()

        # Build query vector
        query_tokens = NameNormalizer.normalize(query)
        query_doc = " ".join(query_tokens + query.lower().split()[:10])
        all_docs = self._documents + [query_doc]
        all_vectors = tfidf_vectorize(all_docs)
        query_vec = all_vectors[-1]

        # Score all entries
        results = []
        for i, entry in enumerate(self.entries):
            if kind and entry.kind != kind:
                continue

            # TF-IDF cosine similarity
            if i < len(self._vectors):
                # Use pre-computed for efficiency on repeated queries
                entry_vec = all_vectors[i]
            else:
                continue

            tfidf_score = cosine_similarity(entry_vec, query_vec)

            # Bonus: exact name match
            name_sim = NameNormalizer.similarity(query, entry.name)
            if name_sim > 0.8:
                reason = "name_exact"
            elif tfidf_score > 0.3:
                reason = "name_semantic"
            else:
                reason = "context"

            # Combined score
            combined = tfidf_score * 0.6 + name_sim * 0.4

            if combined >= min_score:
                results.append(SemanticMatch(
                    entry=entry,
                    score=combined,
                    match_reason=reason,
                ))

        results.sort(key=lambda m: m.score, reverse=True)
        return results[:top_k]

    def search_for_type(self, type_name: str, method_names: list[str],
                        field_names: list[str] = None,
                        top_k: int = 15) -> list[SemanticMatch]:
        """Search for entries relevant to a whole type definition."""
        all_matches: dict[str, SemanticMatch] = {}

        # Search by type name (weight: 3x)
        for m in self.search(type_name, kind="type", top_k=5):
            key = m.entry.id
            if key not in all_matches or m.score * 3 > all_matches[key].score:
                all_matches[key] = SemanticMatch(
                    entry=m.entry, score=m.score * 3.0, match_reason=m.match_reason
                )

        # Search by method names (weight: 2x)
        for method in method_names:
            for m in self.search(method, kind="method", top_k=3, min_score=0.15):
                key = m.entry.id
                new_score = m.score * 2.0
                if key in all_matches:
                    all_matches[key] = SemanticMatch(
                        entry=all_matches[key].entry,
                        score=all_matches[key].score + new_score,
                        match_reason="combined",
                    )
                else:
                    all_matches[key] = SemanticMatch(
                        entry=m.entry, score=new_score, match_reason=m.match_reason
                    )

        # Search by field names (weight: 1x)
        for fname in (field_names or []):
            for m in self.search(fname, kind="field", top_k=3, min_score=0.15):
                key = m.entry.id
                if key in all_matches:
                    all_matches[key] = SemanticMatch(
                        entry=all_matches[key].entry,
                        score=all_matches[key].score + m.score,
                        match_reason="combined",
                    )
                else:
                    all_matches[key] = m

        ranked = sorted(all_matches.values(), key=lambda m: m.score, reverse=True)
        return ranked[:top_k]

    def find_duplicates(self, name: str, threshold: float = 0.7) -> list[SemanticMatch]:
        """Find semantically duplicate entries (mul ≈ multiply)."""
        return self.search(name, min_score=threshold, top_k=5)

    # ── Persistence ──────────────────────────────────────

    def save(self, path: Path):
        """Save store to JSON."""
        data = {
            "entries": [e.to_dict() for e in self.entries],
            "total": len(self.entries),
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data))

    @classmethod
    def load(cls, path: Path) -> SemanticStore:
        """Load store from JSON."""
        data = json.loads(path.read_text())
        store = cls()
        for ed in data.get("entries", []):
            entry = SemanticEntry.from_dict(ed)
            store.entries.append(entry)
            # Rebuild document
            doc_parts = NameNormalizer.normalize(entry.name)
            if entry.parent_type:
                doc_parts.extend(NameNormalizer.normalize(entry.parent_type))
            if entry.context:
                doc_parts.extend(entry.context.lower().split()[:20])
            store._documents.append(" ".join(doc_parts))
        store._dirty = True
        return store

    def format_stats(self) -> str:
        types = sum(1 for e in self.entries if e.kind == "type")
        methods = sum(1 for e in self.entries if e.kind == "method")
        fields = sum(1 for e in self.entries if e.kind == "field")
        sources = len(set(e.source for e in self.entries))
        return (f"SemanticStore: {len(self.entries)} entries "
                f"({types} types, {methods} methods, {fields} fields) "
                f"from {sources} sources")
