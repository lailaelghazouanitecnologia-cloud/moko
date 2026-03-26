"""
distiller.py — Context distillation for /fast mode.

Aggressively reduces descriptor context by:
1. Ranking chunks by relevance to the query
2. Keeping only top-N most relevant
3. Compressing each chunk to essential structure
4. Building a compact "distilled context" string
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class DistilledContext:
    """Compact context ready for LLM injection."""
    text: str
    chunks_used: int
    chunks_available: int
    tokens_estimate: int

    @property
    def compression_ratio(self) -> float:
        if self.chunks_available == 0:
            return 0.0
        return 1.0 - (self.chunks_used / self.chunks_available)


def distill_for_query(
    query: str,
    descriptors: list[dict],
    max_chunks: int = 3,
    max_tokens: int = 2000,
) -> DistilledContext:
    """Distill a list of descriptor dicts into a compact context string.

    Args:
        query: The user's query for relevance scoring.
        descriptors: List of parsed YAML descriptor dicts.
        max_chunks: Maximum number of chunks to include.
        max_tokens: Target token budget (estimated as chars/4).

    Returns:
        DistilledContext with compact text and metadata.
    """
    if not descriptors:
        return DistilledContext(text="", chunks_used=0,
                                chunks_available=0, tokens_estimate=0)

    # Score each descriptor by keyword overlap with query
    query_words = set(query.lower().split())
    scored = []
    for desc in descriptors:
        text = _descriptor_to_text(desc)
        desc_words = set(text.lower().split())
        overlap = len(query_words & desc_words)
        scored.append((overlap, desc, text))

    # Sort by relevance (highest first)
    scored.sort(key=lambda x: -x[0])

    # Take top N chunks, respecting token budget
    selected = []
    token_count = 0
    for _score, _desc, text in scored[:max_chunks * 2]:  # overfetch for budget
        chunk = _compress_chunk(text, max_tokens=max_tokens // max(max_chunks, 1))
        chunk_tokens = len(chunk) // 4
        if token_count + chunk_tokens > max_tokens and selected:
            break
        selected.append(chunk)
        token_count += chunk_tokens
        if len(selected) >= max_chunks:
            break

    result_text = "\n\n".join(selected) if selected else ""

    return DistilledContext(
        text=result_text,
        chunks_used=len(selected),
        chunks_available=len(descriptors),
        tokens_estimate=token_count,
    )


def _descriptor_to_text(desc: dict) -> str:
    """Convert a descriptor dict to searchable text."""
    parts = []
    if "name" in desc:
        parts.append(desc["name"])
    if "purpose" in desc:
        parts.append(str(desc["purpose"]))
    if "types" in desc:
        for t in desc.get("types", []):
            if isinstance(t, dict):
                parts.append(t.get("name", ""))
            else:
                parts.append(str(t))
    if "functions" in desc:
        for f in desc.get("functions", []):
            if isinstance(f, dict):
                parts.append(f.get("name", ""))
            else:
                parts.append(str(f))
    if "modules" in desc:
        for m in desc.get("modules", []):
            if isinstance(m, dict):
                parts.append(m.get("name", ""))
            else:
                parts.append(str(m))
    return " ".join(parts)


def _compress_chunk(text: str, max_tokens: int = 500) -> str:
    """Compress a text chunk to fit within token budget."""
    max_chars = max_tokens * 4
    if len(text) <= max_chars:
        return text
    # Keep first portion (has most structure info)
    return text[:max_chars - 3] + "..."
