"""
ToolRouter — dispatches tool calls to handlers.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Optional

from .registry import ToolRegistry, ToolResult


class ToolRouter:
    """Routes tool calls to handlers. Provides built-in implementations."""

    def __init__(self, registry: ToolRegistry, project_dir: Path,
                 verbose: bool = False):
        self.registry = registry
        self.project_dir = project_dir
        self.verbose = verbose
        self._plan_steps: list = []

    def dispatch(self, tool_name: str, args: dict) -> ToolResult:
        """Dispatch a tool call. Uses registered handler or built-in."""
        handler = self.registry.get_handler(tool_name)
        if handler:
            return handler(args)

        # Built-in handlers
        builtins = {
            "read_file": self._handle_read_file,
            "write_file": self._handle_write_file,
            "run_tsc": self._handle_run_tsc,
            "search": self._handle_search,
            "update_plan": self._handle_update_plan,
        }
        builtin = builtins.get(tool_name)
        if builtin:
            return builtin(args)

        return ToolResult(success=False, error=f"Unknown tool: {tool_name}")

    def _handle_read_file(self, args: dict) -> ToolResult:
        path = self.project_dir / args.get("path", "")
        if not path.exists():
            return ToolResult(success=False, error=f"File not found: {path}")
        try:
            content = path.read_text()
            return ToolResult(success=True, output=content[:10000])
        except Exception as e:
            return ToolResult(success=False, error=str(e))

    def _handle_write_file(self, args: dict) -> ToolResult:
        rel_path = args.get("path", "")
        content = args.get("content", "")
        path = self.project_dir / rel_path
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
            return ToolResult(
                success=True,
                output=f"Wrote {len(content)} chars to {rel_path}",
                files_changed=[rel_path],
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))

    def _handle_run_tsc(self, args: dict) -> ToolResult:
        directory = args.get("directory", "src")
        try:
            result = subprocess.run(
                ["npx", "tsc", "--noEmit"],
                capture_output=True, text=True, timeout=30,
                cwd=str(self.project_dir),
            )
            errors = [l for l in result.stdout.splitlines() if "error TS" in l]
            if not errors:
                return ToolResult(success=True, output="No errors")
            return ToolResult(
                success=False,
                output=f"{len(errors)} errors:\n" + "\n".join(errors[:20]),
            )
        except Exception as e:
            return ToolResult(success=False, error=str(e))

    def _handle_search(self, args: dict) -> ToolResult:
        pattern = args.get("pattern", "")
        search_path = args.get("path", "src")
        if not pattern:
            return ToolResult(success=False, error="No pattern provided")

        results = []
        src_dir = self.project_dir / search_path
        if not src_dir.exists():
            return ToolResult(success=False, error=f"Path not found: {search_path}")

        try:
            regex = re.compile(pattern, re.IGNORECASE)
            for ts_file in sorted(src_dir.rglob("*.ts")):
                try:
                    content = ts_file.read_text()
                    for i, line in enumerate(content.splitlines(), 1):
                        if regex.search(line):
                            rel = ts_file.relative_to(self.project_dir)
                            results.append(f"{rel}:{i}: {line.strip()}")
                except Exception:
                    continue

            if not results:
                return ToolResult(success=True, output="No matches found")
            return ToolResult(
                success=True,
                output=f"{len(results)} matches:\n" + "\n".join(results[:30]),
            )
        except re.error as e:
            return ToolResult(success=False, error=f"Invalid regex: {e}")

    def _handle_update_plan(self, args: dict) -> ToolResult:
        steps = args.get("steps", [])
        self._plan_steps = steps
        if self.verbose:
            for step in steps:
                status = step.get("status", "pending")
                icon = {"pending": "○", "in_progress": "◉", "completed": "✓"}.get(status, "?")
                print(f"    {icon} {step.get('step', '?')}")
        return ToolResult(success=True, output=f"Plan updated: {len(steps)} steps")

    @property
    def current_plan(self) -> list:
        return self._plan_steps
