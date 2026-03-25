"""
QualityStrategies — programmatic auto-fix for code quality issues.

Each strategy handles one category of quality issue. Strategies are
cheap (0 tokens) and handle the mechanical fixes, leaving complex
rewrites for the LLM.

Strategies:
  - TypeStrategy: aggressive any→unknown replacement in all positions
  - NamingStrategy: rename generic variables to semantic names
  - StructureStrategy: extract constants, fix bracket access
  - EncapsulationStrategy: add readonly, convert public→private
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
    """Replace weak types with stronger alternatives.

    Aggressively replaces 'any' in all positions: parameters, return types,
    variables, generics, arrays. Uses context clues to pick better types
    when possible (e.g., callback params → unknown, event data → unknown).
    """

    # Ordered: specific patterns first, then general
    REPLACEMENTS = [
        # Generic containers with any
        (r"Record<string,\s*any>", "Record<string, unknown>"),
        (r"Record<\w+,\s*any>", "Record<string, unknown>"),
        (r"Map<string,\s*any>", "Map<string, unknown>"),
        (r"Map<\w+,\s*any>", "Map<string, unknown>"),
        (r"Set<any>", "Set<unknown>"),
        (r"Array<any>", "Array<unknown>"),
        (r"Promise<any>", "Promise<unknown>"),
        (r"WeakMap<any,\s*any>", "WeakMap<object, unknown>"),
        # Arrays
        (r":\s*any\[\]", ": unknown[]"),
        # Parameters: (x: any) → (x: unknown)
        (r":\s*any\)", ": unknown)"),
        (r":\s*any,", ": unknown,"),
        # Return types: ): any { → ): unknown {
        (r"\):\s*any\s*\{", "): unknown {"),
        (r"\):\s*any\s*=>", "): unknown =>"),
        # Variable declarations: const x: any = → const x: unknown =
        (r":\s*any\s*=", ": unknown ="),
        # Standalone field type: fieldName: any;
        (r":\s*any\s*;", ": unknown;"),
        # Cast: as any → as unknown
        (r"\bas\s+any\b", "as unknown"),
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


class EncapsulationStrategy:
    """Improve class encapsulation: add readonly, private fields.

    Based on analysis showing AVA code has:
    - public_field_ratio 0.47-0.63 (vs Claude's 0.33)
    - readonly_ratio 0.06-0.17 (vs Claude's 1.24-1.70)

    This strategy:
    1. Adds 'readonly' to fields that are only assigned in constructor
    2. Converts 'public' fields to 'private' + adds getter (only simple cases)
    """

    def apply(self, code: str, features: Dict[str, float]) -> StrategyResult:
        """Add readonly and private modifiers to class fields."""
        changes = 0
        result = code

        # Step 1: Add 'readonly' to fields only assigned in constructor
        result, readonly_changes = self._add_readonly(result)
        changes += readonly_changes

        # Step 2: Convert public mutable fields to private (conservative)
        result, private_changes = self._add_private(result)
        changes += private_changes

        if changes == 0:
            return StrategyResult(None, 0, "No encapsulation improvements found")

        return StrategyResult(
            fixed_code=result,
            changes_made=changes,
            description=f"Improved encapsulation: {readonly_changes} readonly, {private_changes} private",
        )

    def _add_readonly(self, code: str) -> Tuple[str, int]:
        """Add readonly to fields that are never reassigned after declaration."""
        changes = 0
        lines = code.split("\n")

        # Find class fields (in constructor or class body)
        # Pattern: fields declared with type annotation in class body
        field_pattern = re.compile(
            r"^(\s+)(public\s+|protected\s+|private\s+)?(?!readonly\b)(\w+)\s*:\s*(\w[^=;]*);",
        )

        # Find fields that are assigned in constructor with this.x = ...
        constructor_assigns = set()
        in_constructor = False
        brace_depth = 0
        for line in lines:
            if "constructor(" in line:
                in_constructor = True
                brace_depth = 0
            if in_constructor:
                brace_depth += line.count("{") - line.count("}")
                if brace_depth <= 0 and in_constructor and "{" in "".join(lines[:lines.index(line)]):
                    in_constructor = False
                assign = re.match(r"\s+this\.(\w+)\s*=", line)
                if assign:
                    constructor_assigns.add(assign.group(1))

        # Find all reassignments outside constructor: this.x = ...
        all_assigns: Dict[str, int] = {}
        in_constructor = False
        brace_depth = 0
        for line in lines:
            if "constructor(" in line:
                in_constructor = True
                brace_depth = 0
            if in_constructor:
                brace_depth += line.count("{") - line.count("}")
                if brace_depth <= 0 and in_constructor:
                    in_constructor = False
                continue
            assign = re.match(r"\s+this\.(\w+)\s*=", line)
            if assign:
                name = assign.group(1)
                all_assigns[name] = all_assigns.get(name, 0) + 1

        # Fields that are only in constructor assigns but NOT reassigned elsewhere
        readonly_candidates = constructor_assigns - set(all_assigns.keys())

        # Apply readonly to matching field declarations
        new_lines = []
        for line in lines:
            match = field_pattern.match(line)
            if match:
                indent, modifier, name, type_ann = match.groups()
                modifier = modifier or ""
                if name in readonly_candidates and "readonly" not in modifier:
                    new_line = f"{indent}{modifier}readonly {name}: {type_ann};"
                    new_lines.append(new_line)
                    changes += 1
                    continue
            # Also handle constructor parameter properties
            # constructor(private x: Type) → constructor(private readonly x: Type)
            ctor_param = re.match(
                r"(\s*(?:constructor\s*\(|,\s*))(private|protected|public)\s+(?!readonly\b)(\w+)(\s*:\s*\w[^,)]*)",
                line,
            )
            if ctor_param:
                prefix, mod, name, type_part = ctor_param.groups()
                if name in readonly_candidates:
                    new_line = f"{prefix}{mod} readonly {name}{type_part}"
                    new_lines.append(new_line)
                    changes += 1
                    continue
            new_lines.append(line)

        return "\n".join(new_lines), changes

    def _add_private(self, code: str) -> Tuple[str, int]:
        """Convert public fields to private (only when no external access needed).

        Conservative: only converts fields that start with _ or are clearly internal.
        """
        changes = 0
        # Convert fields explicitly marked 'public' that have internal names
        # public _name: Type → private _name: Type
        result, count = re.subn(
            r"(\s+)public\s+(_\w+)\s*:",
            r"\1private \2:",
            code,
        )
        changes += count

        return result, changes


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

        Only includes what's relevant to the detected issues.
        Style hints come from the user's profile — no hardcoded rules
        that might contradict user preferences.
        """
        parts = []
        parts.append("Improve this TypeScript code. Fix these issues:\n")

        for i, (itype, severity, desc) in enumerate(issues, 1):
            parts.append(f"  {i}. [{severity}] {itype}: {desc}")

        # Deduplicate hints (style hints may overlap with classifier hints)
        if hints:
            seen = set()
            unique_hints = []
            for hint in hints:
                if hint and hint not in seen:
                    seen.add(hint)
                    unique_hints.append(hint)
            if unique_hints:
                parts.append("\nGuidance:")
                for hint in unique_hints[:8]:  # cap at 8
                    parts.append(f"  - {hint}")

        if examples:
            parts.append("\nLearned patterns:")
            for orig, improved in examples[:2]:  # max 2 (not 3)
                parts.append(f"  Before: {orig}")
                parts.append(f"  After:  {improved}")

        parts.append("\nReturn ONLY the improved code, no explanation.")

        return "\n".join(parts)
