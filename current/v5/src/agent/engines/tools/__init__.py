"""
Tools engine — extensible tool execution pipeline.

Inspired by Codex's 54-handler system but focused on code generation:
  - read_file: read a file from the generated project
  - write_file: write/overwrite a file
  - run_tsc: execute tsc --noEmit
  - search: grep-like search in generated code
  - plan: update visible plan for user feedback
"""
from .registry import ToolRegistry, ToolSpec
from .router import ToolRouter

__all__ = ["ToolRegistry", "ToolSpec", "ToolRouter"]
