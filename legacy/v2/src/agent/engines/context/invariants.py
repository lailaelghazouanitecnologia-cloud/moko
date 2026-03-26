"""
InvariantStore — project-level rules that code must respect.

Rules are YAML-stored patterns like:
  - "All DB access must go through db/*.ts"
  - "Error handling must use ApiError from core/errors"
  - "All routes must use auth middleware"

Rules can be:
  - Manual: written by the user or agent
  - Learned: inferred from patterns in the codebase across runs
"""
from __future__ import annotations

import re
import yaml
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Rule:
    """One project invariant rule."""
    id: str                   # unique identifier
    description: str          # human-readable description
    pattern: str = ""         # regex pattern to match violations
    scope: str = "**/*.ts"    # glob pattern for files this rule applies to
    severity: str = "error"   # error, warning
    learned: bool = False     # True if inferred, False if manual

    def matches_file(self, path: str) -> bool:
        """Check if this rule applies to the given file path."""
        import fnmatch
        return fnmatch.fnmatch(path, self.scope)


class InvariantStore:
    """Stores and checks project invariant rules."""

    def __init__(self):
        self.rules: list[Rule] = []

    def load(self, path: Path) -> None:
        """Load rules from a YAML file."""
        if not path.exists():
            return

        try:
            data = yaml.safe_load(path.read_text())
            if not data or not isinstance(data, list):
                return

            for item in data:
                if isinstance(item, dict):
                    self.rules.append(Rule(
                        id=item.get("id", ""),
                        description=item.get("description", ""),
                        pattern=item.get("pattern", ""),
                        scope=item.get("scope", "**/*.ts"),
                        severity=item.get("severity", "error"),
                        learned=item.get("learned", False),
                    ))
        except Exception:
            pass

    def save(self, path: Path) -> None:
        """Save rules to a YAML file."""
        path.parent.mkdir(parents=True, exist_ok=True)
        data = [
            {
                "id": r.id,
                "description": r.description,
                "pattern": r.pattern,
                "scope": r.scope,
                "severity": r.severity,
                "learned": r.learned,
            }
            for r in self.rules
        ]
        path.write_text(yaml.dump(data, default_flow_style=False, allow_unicode=True))

    def add(self, rule: Rule) -> None:
        """Add a rule. Replaces existing rule with same id."""
        self.rules = [r for r in self.rules if r.id != rule.id]
        self.rules.append(rule)

    def check(self, code: str, file_path: str) -> list[str]:
        """Check code against all applicable rules. Returns violation messages."""
        violations = []
        for rule in self.rules:
            if not rule.matches_file(file_path):
                continue
            if not rule.pattern:
                continue

            try:
                if re.search(rule.pattern, code):
                    violations.append(
                        f"Rule '{rule.id}' violated: {rule.description}"
                    )
            except re.error:
                pass

        return violations

    def rules_summary(self) -> str:
        """Compact summary of all rules for LLM context."""
        if not self.rules:
            return ""
        lines = ["## Project rules"]
        for r in self.rules:
            lines.append(f"- {r.description}")
        return "\n".join(lines)
