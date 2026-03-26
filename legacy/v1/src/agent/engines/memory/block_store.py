"""
CodeBlockStore — persistent storage for reusable code blocks.

Stores extracted methods, type patterns, and blueprint fragments
for reuse across multiple generation runs. Each block tracks its
usage count and density score to prioritize high-quality blocks.

Lifecycle:
  1. Extractor extracts methods from source → stored as blocks
  2. Composer queries blocks by type/method similarity
  3. After generation, density analyzer scores blocks
  4. High-density blocks get reused; low-density blocks decay
"""
from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class CodeBlock:
    """A reusable code block stored for future composition."""
    id: str                        # content hash
    content: str                   # code or YAML content
    kind: str                      # "method", "type", "pattern", "blueprint_fragment"
    name: str                      # identifier (method name, type name)
    source: str                    # origin: "playcanvas/core/math/mat4.js:multiply"
    language: str                  # "typescript", "javascript", "python"
    parent_type: str = ""          # owning type name
    signature: str = ""            # method signature if applicable
    tags: list[str] = field(default_factory=list)

    # Quality tracking
    usage_count: int = 0           # how many times used in generation
    density_score: float = 0.0     # measured quality (0.0-1.0)
    last_used: float = 0.0        # timestamp of last use

    # Metadata
    created_at: float = field(default_factory=time.time)
    lines: int = 0                 # line count

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "content": self.content,
            "kind": self.kind,
            "name": self.name,
            "source": self.source,
            "language": self.language,
            "parent_type": self.parent_type,
            "signature": self.signature,
            "tags": self.tags,
            "usage_count": self.usage_count,
            "density_score": self.density_score,
            "last_used": self.last_used,
            "created_at": self.created_at,
            "lines": self.lines,
        }

    @classmethod
    def from_dict(cls, d: dict) -> CodeBlock:
        return cls(
            id=d["id"],
            content=d["content"],
            kind=d["kind"],
            name=d["name"],
            source=d["source"],
            language=d.get("language", "typescript"),
            parent_type=d.get("parent_type", ""),
            signature=d.get("signature", ""),
            tags=d.get("tags", []),
            usage_count=d.get("usage_count", 0),
            density_score=d.get("density_score", 0.0),
            last_used=d.get("last_used", 0.0),
            created_at=d.get("created_at", time.time()),
            lines=d.get("lines", 0),
        )

    @staticmethod
    def make_id(content: str) -> str:
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def record_use(self, density: float = 0.0):
        """Record that this block was used in generation."""
        self.usage_count += 1
        self.last_used = time.time()
        if density > 0:
            # Running average of density
            if self.density_score > 0:
                self.density_score = (self.density_score * 0.7 + density * 0.3)
            else:
                self.density_score = density


class CodeBlockStore:
    """Persistent store for reusable code blocks.

    Supports querying by name, kind, tags, and parent type.
    Tracks usage and quality for intelligent reuse.
    """

    def __init__(self):
        self.blocks: dict[str, CodeBlock] = {}  # id → block

    # ── Storage ──────────────────────────────────────────

    def store(self, content: str, kind: str, name: str, source: str,
              language: str = "typescript", parent_type: str = "",
              signature: str = "", tags: list[str] = None) -> CodeBlock:
        """Store a code block. Deduplicates by content hash."""
        block_id = CodeBlock.make_id(content)
        if block_id in self.blocks:
            return self.blocks[block_id]

        block = CodeBlock(
            id=block_id,
            content=content,
            kind=kind,
            name=name,
            source=source,
            language=language,
            parent_type=parent_type,
            signature=signature,
            tags=tags or [],
            lines=len(content.splitlines()),
        )
        self.blocks[block_id] = block
        return block

    def store_method(self, name: str, signature: str, body_hint: str,
                     source: str, parent_type: str,
                     language: str = "typescript") -> CodeBlock:
        """Convenience: store an extracted method as a block."""
        content = f"{name}{signature}\n{body_hint}" if body_hint else f"{name}{signature}"
        return self.store(
            content=content,
            kind="method",
            name=name,
            source=source,
            language=language,
            parent_type=parent_type,
            signature=signature,
            tags=[parent_type.lower(), name.lower()],
        )

    # ── Query ────────────────────────────────────────────

    def get(self, block_id: str) -> Optional[CodeBlock]:
        return self.blocks.get(block_id)

    def find_by_name(self, name: str, kind: str = None) -> list[CodeBlock]:
        """Find blocks by exact name match."""
        results = []
        name_lower = name.lower()
        for block in self.blocks.values():
            if block.name.lower() == name_lower:
                if kind is None or block.kind == kind:
                    results.append(block)
        return sorted(results, key=lambda b: b.density_score, reverse=True)

    def find_by_parent(self, parent_type: str, kind: str = None) -> list[CodeBlock]:
        """Find all blocks belonging to a parent type."""
        results = []
        parent_lower = parent_type.lower()
        for block in self.blocks.values():
            if block.parent_type.lower() == parent_lower:
                if kind is None or block.kind == kind:
                    results.append(block)
        return sorted(results, key=lambda b: b.density_score, reverse=True)

    def find_by_tags(self, tags: list[str], kind: str = None) -> list[CodeBlock]:
        """Find blocks matching any of the given tags."""
        tag_set = {t.lower() for t in tags}
        results = []
        for block in self.blocks.values():
            block_tags = {t.lower() for t in block.tags}
            if tag_set & block_tags:
                if kind is None or block.kind == kind:
                    results.append(block)
        return sorted(results, key=lambda b: b.density_score, reverse=True)

    def top_quality(self, kind: str = None, limit: int = 20) -> list[CodeBlock]:
        """Return highest-density blocks."""
        candidates = self.blocks.values()
        if kind:
            candidates = [b for b in candidates if b.kind == kind]
        return sorted(candidates, key=lambda b: b.density_score, reverse=True)[:limit]

    def most_used(self, kind: str = None, limit: int = 20) -> list[CodeBlock]:
        """Return most frequently used blocks."""
        candidates = self.blocks.values()
        if kind:
            candidates = [b for b in candidates if b.kind == kind]
        return sorted(candidates, key=lambda b: b.usage_count, reverse=True)[:limit]

    # ── Persistence ──────────────────────────────────────

    def save(self, path: Path):
        """Save store to JSON."""
        data = {
            "blocks": [b.to_dict() for b in self.blocks.values()],
            "total": len(self.blocks),
        }
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data))

    @classmethod
    def load(cls, path: Path) -> CodeBlockStore:
        """Load store from JSON."""
        data = json.loads(path.read_text())
        store = cls()
        for bd in data.get("blocks", []):
            block = CodeBlock.from_dict(bd)
            store.blocks[block.id] = block
        return store

    def format_stats(self) -> str:
        kinds = {}
        for b in self.blocks.values():
            kinds[b.kind] = kinds.get(b.kind, 0) + 1
        parts = [f"{k}={v}" for k, v in sorted(kinds.items())]
        avg_density = 0.0
        scored = [b for b in self.blocks.values() if b.density_score > 0]
        if scored:
            avg_density = sum(b.density_score for b in scored) / len(scored)
        return (f"CodeBlockStore: {len(self.blocks)} blocks "
                f"({', '.join(parts)}), avg_density={avg_density:.0%}")
