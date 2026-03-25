"""
QualityStrategies — programmatic auto-fix for code quality issues.

Each strategy handles one category of quality issue. Strategies are
cheap (0 tokens) and handle the mechanical fixes, leaving complex
rewrites for the LLM.

Strategies:
  - TypeStrategy: replace 'any' with proper types, add unions
  - NamingStrategy: rename generic variables to semantic names
  - StructureStrategy: extract constants, fix bracket access
  - DocStrategy: add JSDoc stubs for public methods
  - PromptHintStrategy: builds targeted LLM prompt for complex fixes
"""

import re
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple


@dataclass
class StrategyResult:
    """Result of applying a quality strategy."""
    fixed_code: Optional[str]    # None if strategy can't handle
    changes_made: int            # number of modifications
    description: str             # human-readable summary
    tokens_used: int = 0         # 0 for programmatic, >0 for LLM


class TypeStrategy:
    """Replace weak types with stronger alternatives."""

    # Common any → specific type replacements
    REPLACEMENTS = [
        # Record<string, any> → Record<string, unknown>
        (r"Record<string,\s*any>", "Record<string, unknown>"),
        # : any[] → : unknown[]
        (r":\s*any\[\]", ": unknown[]"),
        # : any) → : unknown) in parameters
        (r":\s*any\)", ": unknown)"),
        # Map<string, any> → Map<string, unknown>
        (r"Map<string,\s*any>", "Map<string, unknown>"),
    ]

    def apply(self, code: str, features: Dict[str, float]) -> StrategyResult:
        """Replace obvious 'any' types with 'unknown' or specific types."""
        changes = 0
        result = code

        for pattern, replacement in self.REPLACEMENTS:
            new_result, count = re.subn(pattern, replacement, result)
            if count > 0:
                changes += count
                result = new_result

        if changes == 0:
            return StrategyResult(None, 0, "No auto-fixable type issues")

        return StrategyResult(
            fixed_code=result,
            changes_made=changes,
            description=f"Replaced {changes} weak type annotations",
        )


class NamingStrategy:
    """Rename generic variables to more descriptive alternatives."""

    # Context-aware renaming: (generic_name, context_hint) → better_name
    RENAME_MAP: Dict[str, Dict[str, str]] = {
        "data": {
            "paper": "paperData",
            "search": "searchResults",
            "evidence": "evidenceData",
            "graph": "graphData",
            "report": "reportContent",
            "default": "payload",
        },
        "result": {
            "search": "searchResult",
            "parse": "parsedContent",
            "extract": "extraction",
            "score": "scoredResult",
            "default": "outcome",
        },
        "item": {
            "paper": "paper",
            "node": "graphNode",
            "edge": "graphEdge",
            "evidence": "evidencePiece",
            "default": "entry",
        },
        "obj": {
            "default": "instance",
        },
        "tmp": {
            "default": "intermediate",
        },
        "val": {
            "score": "scoreValue",
            "weight": "weightValue",
            "default": "value",
        },
        "res": {
            "search": "searchResponse",
            "fetch": "fetchResponse",
            "default": "response",
        },
    }

    def apply(self, code: str, features: Dict[str, float]) -> StrategyResult:
        """Rename generic variable names based on surrounding context."""
        changes = 0
        result = code
        lines = result.split("\n")

        for generic_name, context_map in self.RENAME_MAP.items():
            # Find declarations: const/let/var generic_name
            pattern = re.compile(
                rf"\b(const|let|var)\s+({generic_name})\s*([=:])",
                re.IGNORECASE,
            )

            new_lines = []
            for line in lines:
                match = pattern.search(line)
                if match:
                    # Detect context from surrounding code
                    context = self._detect_context(line, lines)
                    new_name = context_map.get(context, context_map.get("default", generic_name))
                    if new_name != generic_name:
                        new_line = line.replace(
                            f"{match.group(1)} {generic_name}{match.group(3)}",
                            f"{match.group(1)} {new_name}{match.group(3)}",
                        )
                        new_lines.append(new_line)
                        changes += 1
                        continue
                new_lines.append(line)

            if changes > 0:
                result = "\n".join(new_lines)

        if changes == 0:
            return StrategyResult(None, 0, "No auto-renameable variables")

        return StrategyResult(
            fixed_code=result,
            changes_made=changes,
            description=f"Renamed {changes} generic variables to descriptive names",
        )

    def _detect_context(self, line: str, all_lines: List[str]) -> str:
        """Detect domain context from line content."""
        line_lower = line.lower()
        for keyword in ["paper", "search", "evidence", "graph", "report",
                         "parse", "extract", "score", "node", "edge",
                         "fetch", "weight"]:
            if keyword in line_lower:
                return keyword
        return "default"


class StructureStrategy:
    """Fix structural anti-patterns programmatically."""

    def apply(self, code: str, features: Dict[str, float]) -> StrategyResult:
        """Fix bracket access to private fields and extract magic numbers."""
        changes = 0
        result = code

        # Fix bracket access to private fields: this.x['field'] → this.x.field
        bracket_pattern = re.compile(r"(this\.\w+)\[(['\"])(\w+)\2\]")
        new_result = bracket_pattern.sub(r"\1.\3", result)
        bracket_changes = len(bracket_pattern.findall(result))
        if bracket_changes > 0:
            result = new_result
            changes += bracket_changes

        if changes == 0:
            return StrategyResult(None, 0, "No auto-fixable structure issues")

        return StrategyResult(
            fixed_code=result,
            changes_made=changes,
            description=f"Fixed {changes} structural anti-patterns",
        )


class DocStrategy:
    """Add JSDoc stubs for undocumented public methods."""

    def apply(self, code: str, features: Dict[str, float]) -> StrategyResult:
        """Add empty JSDoc blocks before undocumented public methods."""
        lines = code.split("\n")
        new_lines = []
        changes = 0

        # Pattern for public method declarations
        method_pattern = re.compile(
            r"^(\s*)((?:async\s+)?(?:public\s+)?(?!private|protected)\w+\s*\([^)]*\))"
        )

        i = 0
        while i < len(lines):
            line = lines[i]
            match = method_pattern.match(line)

            if match and "constructor" not in line:
                # Check if previous line is already a doc comment
                has_doc = False
                for j in range(i - 1, max(i - 5, -1), -1):
                    stripped = lines[j].strip()
                    if stripped == "*/":
                        has_doc = True
                        break
                    if stripped and not stripped.startswith("*") and not stripped.startswith("//"):
                        break

                if not has_doc:
                    indent = match.group(1)
                    # Extract method name and params
                    sig = match.group(2)
                    name_match = re.search(r"(\w+)\s*\(([^)]*)\)", sig)
                    if name_match:
                        method_name = name_match.group(1)
                        params_str = name_match.group(2)

                        doc_lines = [f"{indent}/**"]
                        doc_lines.append(f"{indent} * {self._describe_method(method_name)}")

                        # Add @param for each parameter
                        if params_str.strip():
                            for param in params_str.split(","):
                                param = param.strip()
                                pname = re.match(r"(\w+)", param)
                                if pname:
                                    doc_lines.append(
                                        f"{indent} * @param {pname.group(1)}"
                                    )

                        doc_lines.append(f"{indent} */")
                        new_lines.extend(doc_lines)
                        changes += 1

            new_lines.append(line)
            i += 1

        if changes == 0:
            return StrategyResult(None, 0, "All public methods documented")

        return StrategyResult(
            fixed_code="\n".join(new_lines),
            changes_made=changes,
            description=f"Added JSDoc stubs for {changes} undocumented methods",
        )

    def _describe_method(self, name: str) -> str:
        """Generate a basic description from method name."""
        # Split camelCase
        words = re.sub(r"([A-Z])", r" \1", name).lower().split()
        if not words:
            return "TODO: describe this method."

        verb = words[0]
        rest = " ".join(words[1:])
        verb_map = {
            "get": f"Get {rest}.",
            "set": f"Set {rest}.",
            "is": f"Check if {rest}.",
            "has": f"Check if has {rest}.",
            "add": f"Add {rest}.",
            "remove": f"Remove {rest}.",
            "create": f"Create {rest}.",
            "build": f"Build {rest}.",
            "parse": f"Parse {rest}.",
            "format": f"Format {rest}.",
            "validate": f"Validate {rest}.",
            "calculate": f"Calculate {rest}.",
            "find": f"Find {rest}.",
            "search": f"Search for {rest}.",
            "update": f"Update {rest}.",
            "delete": f"Delete {rest}.",
            "render": f"Render {rest}.",
            "generate": f"Generate {rest}.",
            "resolve": f"Resolve {rest}.",
        }
        return verb_map.get(verb, f"TODO: describe {name}.")


class PromptHintStrategy:
    """Builds targeted LLM prompts for complex quality fixes.

    Instead of generic "fix the code", builds specific prompts based
    on detected issues and learned patterns from QualityDB.
    """

    def build_prompt(
        self,
        code: str,
        issues: List[Tuple[str, str, str]],
        hints: List[str],
        examples: List[Tuple[str, str]] = None,
    ) -> str:
        """Build a targeted quality improvement prompt.

        Args:
            code: The source code to improve
            issues: List of (issue_type, severity, description)
            hints: Classifier-generated hints
            examples: Optional (before, after) pairs from QualityDB
        """
        parts = []
        parts.append("Improve this TypeScript code. Specific issues to fix:\n")

        for i, (itype, severity, desc) in enumerate(issues, 1):
            parts.append(f"  {i}. [{severity}] {itype}: {desc}")

        if hints:
            parts.append("\nGuidance:")
            for hint in hints:
                if hint:
                    parts.append(f"  - {hint}")

        if examples:
            parts.append("\nLearned patterns (from past corrections):")
            for orig, improved in examples[:3]:  # max 3 examples
                parts.append(f"  Before: {orig}")
                parts.append(f"  After:  {improved}")

        parts.append("\nRules:")
        parts.append("  - Use discriminated unions for state/status types")
        parts.append("  - Replace 'any' with specific interfaces")
        parts.append("  - Use semantic names (not data/result/item)")
        parts.append("  - Implement real algorithms (not heuristic stubs)")
        parts.append("  - Add JSDoc with algorithm descriptions")
        parts.append("  - Use dependency injection, not private field access")
        parts.append("  - Return 'this' for fluent/builder APIs")
        parts.append("  - Handle errors with typed exceptions")
        parts.append("\nReturn ONLY the improved code, no explanation.")

        return "\n".join(parts)
