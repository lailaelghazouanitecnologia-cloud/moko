"""
Prompt components — modular, reusable sections for system prompts.

Each component is a function that receives PromptContext and returns a string.
Components can be assembled in different orders and combinations by variants.
Inspired by Cline's 13-component system but adapted for code generation (not editing).

Components:
  role        — who AVA is
  rules       — core rules (type safety, naming, organization)
  style       — from StyleProfile + .ava/rules.md
  spec        — from FunctionalSpec (domain requirements)
  context     — imports, siblings, cross-module signatures
  output      — what format to produce
  anti        — anti-patterns to avoid
"""
from .role import get_role
from .rules import get_rules
from .style import get_style
from .spec import get_spec
from .context import get_context
from .output import get_output
from .anti import get_anti_patterns

__all__ = [
    "get_role", "get_rules", "get_style", "get_spec",
    "get_context", "get_output", "get_anti_patterns",
]
