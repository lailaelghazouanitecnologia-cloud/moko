"""
ToolRegistry — registers and stores available tools.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional


@dataclass
class ToolSpec:
    """Specification of a tool the LLM can call."""
    name: str
    description: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    requires_approval: bool = False
    category: str = "builtin"       # "builtin", "mcp", "custom"


@dataclass
class ToolResult:
    """Result of a tool execution."""
    success: bool
    output: str = ""
    error: str = ""
    tokens_used: int = 0
    files_changed: List[str] = field(default_factory=list)


class ToolRegistry:
    """Registry of available tools."""

    def __init__(self):
        self._tools: Dict[str, ToolSpec] = {}
        self._handlers: Dict[str, Callable] = {}
        self._register_builtins()

    def _register_builtins(self):
        self.register(ToolSpec(
            name="read_file",
            description="Read the contents of a file from the project",
            parameters={"path": "string — relative path to the file"},
        ))
        self.register(ToolSpec(
            name="write_file",
            description="Write content to a file (creates directories if needed)",
            parameters={"path": "string", "content": "string"},
            requires_approval=False,
        ))
        self.register(ToolSpec(
            name="run_tsc",
            description="Run TypeScript compiler in noEmit mode, returns errors",
            parameters={"directory": "string — module directory to check"},
        ))
        self.register(ToolSpec(
            name="search",
            description="Search for a pattern in project files (regex)",
            parameters={"pattern": "string", "path": "string (optional)"},
        ))
        self.register(ToolSpec(
            name="update_plan",
            description="Update the visible plan with steps and progress",
            parameters={"steps": "list of {step: string, status: pending|in_progress|completed}"},
        ))

    def register(self, spec: ToolSpec, handler: Optional[Callable] = None):
        self._tools[spec.name] = spec
        if handler:
            self._handlers[spec.name] = handler

    def get_spec(self, name: str) -> Optional[ToolSpec]:
        return self._tools.get(name)

    def get_handler(self, name: str) -> Optional[Callable]:
        return self._handlers.get(name)

    def all_specs(self) -> List[ToolSpec]:
        return list(self._tools.values())

    def visible_specs(self) -> List[ToolSpec]:
        """Specs visible to the LLM (excludes internal-only tools)."""
        return [s for s in self._tools.values() if s.category != "internal"]

    def to_prompt(self) -> str:
        """Format tools for LLM system prompt."""
        lines = ["## Available Tools"]
        for spec in self.visible_specs():
            params = ", ".join(f"{k}: {v}" for k, v in spec.parameters.items())
            approval = " (requires approval)" if spec.requires_approval else ""
            lines.append(f"- **{spec.name}**({params}){approval}: {spec.description}")
        return "\n".join(lines)
