"""
KnowledgeStore — persistent YAML store of memories across projects.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional

from .extractor import Memory


class KnowledgeStore:
    """Persistent store of cross-project memories."""

    def __init__(self, store_path: Optional[Path] = None):
        self._path = store_path or self._default_path()
        self.memories: List[Memory] = []
        self._load()

    @staticmethod
    def _default_path() -> Path:
        here = Path(__file__).resolve()
        for parent in [here] + list(here.parents):
            if (parent / "src" / "agent").exists():
                return parent / "data" / "knowledge" / "memories.json"
        return here.parent / "memories.json"

    def _load(self):
        if not self._path.exists():
            return
        try:
            data = json.loads(self._path.read_text())
            if isinstance(data, list):
                self.memories = [Memory.from_dict(d) for d in data]
        except Exception:
            pass

    def save(self):
        self._path.parent.mkdir(parents=True, exist_ok=True)
        data = [m.to_dict() for m in self.memories]
        self._path.write_text(json.dumps(data, indent=2))

    def add(self, memory: Memory):
        self.memories.append(memory)
        self.save()

    def search(self, domain: str = "", project: str = "",
               limit: int = 5) -> List[Memory]:
        """Search memories by domain or project."""
        scored = []
        for mem in self.memories:
            score = 0.0
            if domain and mem.domain == domain:
                score += 3.0
            if project and mem.project == project:
                score += 2.0
            if mem.quality_score > 0:
                score += mem.quality_score
            if mem.modules_failed == 0:
                score += 1.0
            if score > 0:
                scored.append((score, mem))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [m for _, m in scored[:limit]]

    def format_for_injection(self, memories: List[Memory],
                             max_tokens: int = 2000) -> str:
        """Format memories for prompt injection."""
        if not memories:
            return ""
        lines = ["## Learnings from previous runs"]
        total_chars = 0
        for mem in memories:
            header = f"\n### {mem.project} ({mem.domain})"
            for learning in mem.learnings[:5]:
                line = f"- {learning}"
                if total_chars + len(header) + len(line) > max_tokens * 4:
                    break
                lines.append(header)
                header = ""  # Only add header once
                lines.append(line)
                total_chars += len(line)
        return "\n".join(lines)
