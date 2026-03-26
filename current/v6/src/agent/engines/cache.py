"""
cache.py — Semantic response cache for /fast mode.

Caches LLM responses keyed by query similarity. Avoids
re-calling the LLM for queries that are semantically equivalent
to recently answered ones.

Uses in-memory storage with TTL eviction. No external dependencies
beyond the existing EmbeddingProvider (optional — falls back to
exact string matching if embeddings unavailable).
"""
from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field


@dataclass
class CacheEntry:
    query: str
    query_hash: str
    response: str
    agents_used: list[str]
    total_tokens: int
    timestamp: float
    embedding: list[float] | None = None


class ResponseCache:
    """Semantic + exact response cache.

    Two-tier lookup:
      1. Exact hash match (free, 100% precision)
      2. Embedding similarity match (requires embedder, configurable threshold)
    """

    def __init__(self, embedder=None, similarity_threshold: float = 0.95,
                 ttl: int = 300, max_entries: int = 100):
        self.embedder = embedder
        self.threshold = similarity_threshold
        self.ttl = ttl
        self.max_entries = max_entries
        self._entries: list[CacheEntry] = []
        self._hash_index: dict[str, int] = {}  # hash -> entry index

    @staticmethod
    def _hash(query: str) -> str:
        """Normalize and hash query for exact matching."""
        normalized = " ".join(query.lower().split())
        return hashlib.sha256(normalized.encode()).hexdigest()[:16]

    def get(self, query: str) -> CacheEntry | None:
        """Look up a cached response. Returns None on miss."""
        now = time.time()
        q_hash = self._hash(query)

        # Tier 1: exact hash match
        if q_hash in self._hash_index:
            idx = self._hash_index[q_hash]
            if idx < len(self._entries):
                entry = self._entries[idx]
                if now - entry.timestamp < self.ttl:
                    return entry

        # Tier 2: semantic similarity (if embedder available)
        if self.embedder is not None:
            try:
                q_emb = self.embedder.embed_query(query)
                best_score = 0.0
                best_entry = None

                for entry in self._entries:
                    if now - entry.timestamp > self.ttl:
                        continue
                    if entry.embedding is None:
                        continue
                    score = _cosine_similarity(q_emb, entry.embedding)
                    if score > best_score:
                        best_score = score
                        best_entry = entry

                if best_entry and best_score >= self.threshold:
                    return best_entry
            except Exception:
                pass  # embedder failed, skip semantic lookup

        return None

    def put(self, query: str, response: str,
            agents_used: list[str] = None, total_tokens: int = 0):
        """Store a response in the cache."""
        q_hash = self._hash(query)

        # Compute embedding if possible
        embedding = None
        if self.embedder is not None:
            try:
                embedding = self.embedder.embed_query(query)
            except Exception:
                pass

        entry = CacheEntry(
            query=query,
            query_hash=q_hash,
            response=response,
            agents_used=agents_used or [],
            total_tokens=total_tokens,
            timestamp=time.time(),
            embedding=embedding,
        )

        self._entries.append(entry)
        self._hash_index[q_hash] = len(self._entries) - 1

        # Evict old entries
        self._evict()

    def _evict(self):
        """Remove expired and excess entries."""
        now = time.time()
        # Remove expired
        self._entries = [e for e in self._entries if now - e.timestamp < self.ttl]
        # Trim to max_entries (keep newest)
        if len(self._entries) > self.max_entries:
            self._entries = self._entries[-self.max_entries:]
        # Rebuild hash index
        self._hash_index = {e.query_hash: i for i, e in enumerate(self._entries)}

    @property
    def size(self) -> int:
        return len(self._entries)

    def clear(self):
        self._entries.clear()
        self._hash_index.clear()


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two vectors."""
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
