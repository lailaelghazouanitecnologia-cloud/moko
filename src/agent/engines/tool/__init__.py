"""
Tool Engine — project introspection for generated codebases.

Provides real-time awareness of what files exist, what they export,
and what imports are valid. Eliminates phantom imports by giving the
LLM and post-generation validators a source of truth.

Components:
  scanner.py        — FileScanner: parse .ts files → exports/imports/enums
  graph.py          — ProjectGraph: complete project map (files, symbols, modules)
  shared_types.py   — SharedTypeDetector: auto-generate types.ts for shared types
  import_resolver.py — ImportResolver: fix imports post-generation
  validator.py      — PostGenValidator: validate imports + enums + density
"""
from .scanner import FileScanner, ExportInfo, ImportInfo
from .graph import ProjectGraph, FileNode, ModuleNode, ExportedSymbol
from .shared_types import SharedTypeDetector
from .import_resolver import ImportResolver
from .validator import PostGenValidator

__all__ = [
    "FileScanner", "ExportInfo", "ImportInfo",
    "ProjectGraph", "FileNode", "ModuleNode", "ExportedSymbol",
    "SharedTypeDetector",
    "ImportResolver",
    "PostGenValidator",
]
