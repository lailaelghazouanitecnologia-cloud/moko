"""
Knowledge engine — cross-session learning from past generation runs.

Inspired by Codex's 2-phase memory system:
  Phase 1 (extract): After each run, extract learnings (what worked, what didn't)
  Phase 2 (inject): Before next run, inject relevant memories into prompts

Unlike Codex (which uses a mini LLM for extraction), AVA extracts learnings
programmatically from pipeline metrics + quality data (0 LLM tokens).
"""
from .extractor import MemoryExtractor, Memory
from .store import KnowledgeStore
from .injector import KnowledgeInjector

__all__ = ["MemoryExtractor", "Memory", "KnowledgeStore", "KnowledgeInjector"]
