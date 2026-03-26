"""
Fix strategies — specialized repair approaches for different error classes.

Instead of one generic "fix everything" prompt, each strategy knows how to
handle a specific class of TSC errors efficiently:

  - SyntaxStrategy: bracket matching, missing tokens — often no LLM needed
  - ImportStrategy: resolve missing imports using LiveIndex
  - TypeStrategy: fix type mismatches using type registry
  - GenericStrategy: fallback for anything else
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from ..context import LiveIndex

from .intelligence import TscError, ErrorCluster, SYNTAX_CODES, TYPE_CODES


@dataclass
class StrategyResult:
    """Result of applying a fix strategy."""
    fixed_code: Optional[str]  # None if strategy can't handle it
    errors_addressed: int
    description: str
    tokens_used: int = 0  # 0 for programmatic fixes


class SyntaxStrategy:
    """Fix syntax errors programmatically — no LLM needed.

    Handles: missing braces, missing semicolons, double dots,
    typo constructors (new Type → new TypeError).
    """

    def can_handle(self, cluster: ErrorCluster) -> bool:
        return cluster.root.code in SYNTAX_CODES

    def apply(self, code: str, cluster: ErrorCluster) -> Optional[StrategyResult]:
        lines = code.split('\n')
        new_lines = list(lines)
        fixes = []
        root = cluster.root

        # Fix: missing } before catch
        if root.code in ("TS1005", "TS1472") and any(
            kw in root.message for kw in ("'try'", "'catch'", "'finally'")
        ):
            fix = self._fix_missing_brace_before_catch(new_lines, root.line)
            if fix:
                fixes.append(fix)

        # Fix: missing } before catch (detected via cascade pattern)
        if root.code == "TS1005" and "'try'" in root.message:
            fix = self._fix_missing_brace_before_catch(new_lines, root.line)
            if fix:
                fixes.append(fix)

        # Check all errors in cluster for more fixable patterns
        all_errors = [root] + cluster.cascade
        for err in all_errors:
            line_idx = err.line - 1
            if line_idx < 0 or line_idx >= len(new_lines):
                continue
            line_text = new_lines[line_idx]

            # Fix: double dot
            if '..' in line_text and '...' not in line_text:
                new_lines[line_idx] = re.sub(r'(?<!\.)\.\.(?!\.)', '.', line_text)
                fixes.append(f"line {err.line}: fixed double dot")

        if not fixes:
            return None

        return StrategyResult(
            fixed_code='\n'.join(new_lines),
            errors_addressed=len(fixes) + len(cluster.cascade),
            description='; '.join(fixes),
        )

    def _fix_missing_brace_before_catch(self, lines: list[str], error_line: int) -> Optional[str]:
        """Find and fix a missing } before catch/finally."""
        # Search around the error line for catch without preceding }
        search_start = max(0, error_line - 5)
        search_end = min(len(lines), error_line + 5)

        for i in range(search_start, search_end):
            stripped = lines[i].strip()
            if re.match(r'^catch\s*(\([^)]*\))?\s*\{?', stripped):
                # Look back for missing }
                prev_idx = i - 1
                while prev_idx >= 0 and not lines[prev_idx].strip():
                    prev_idx -= 1
                if prev_idx >= 0 and not lines[prev_idx].strip().endswith('}'):
                    indent = len(lines[i]) - len(lines[i].lstrip())
                    lines[i] = ' ' * indent + '} ' + stripped
                    return f"line {i+1}: added missing '}}' before catch"
        return None


class ImportStrategy:
    """Fix missing import/name errors using LiveIndex.

    For TS2304 (Cannot find name) and TS2307 (Cannot find module):
    looks up the symbol in the project index and generates the correct import.
    """

    def __init__(self, index: Optional["LiveIndex"] = None):
        self.index = index

    def can_handle(self, cluster: ErrorCluster) -> bool:
        return cluster.root.code in ("TS2304", "TS2305", "TS2307")

    def apply(self, code: str, cluster: ErrorCluster, file_path: str = "") -> Optional[StrategyResult]:
        if not self.index:
            return None

        root = cluster.root
        name = self._extract_name(root.message)
        if not name:
            return None

        # Look up in index
        td = self.index.get_type(name)
        if not td:
            return None

        # Figure out the import path
        from_module = self._module_of(file_path)
        type_module = self._module_of(td.file)

        if from_module == type_module:
            # Same module — relative import
            kebab = self._kebab(name)
            import_path = f"./{kebab}"
        else:
            import_path = f"../{type_module}"

        # Check if already imported
        if re.search(rf'\bimport\b.*\b{re.escape(name)}\b', code):
            return None

        # Add import at top (after existing imports)
        lines = code.split('\n')
        last_import = 0
        for i, line in enumerate(lines):
            if line.strip().startswith('import '):
                last_import = i

        import_line = f"import {{ {name} }} from '{import_path}';"
        lines.insert(last_import + 1, import_line)

        return StrategyResult(
            fixed_code='\n'.join(lines),
            errors_addressed=cluster.total,
            description=f"added import for {name} from '{import_path}'",
        )

    def _extract_name(self, message: str) -> Optional[str]:
        m = re.search(r"'(\w+)'", message)
        return m.group(1) if m else None

    def _module_of(self, path: str) -> str:
        from pathlib import Path as P
        parts = P(path).parts
        # Skip 'src/' prefix
        parts = [p for p in parts if p != 'src']
        return parts[0] if parts else "_root"

    def _kebab(self, name: str) -> str:
        s = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", name)
        s = re.sub(r"([A-Z]{2,})([A-Z][a-z])", r"\1-\2", s)
        return s.lower()


class ConstructorTypoStrategy:
    """Fix common LLM typos in constructor names.

    Handles: new Type() → new TypeError(), new Range() → new RangeError(), etc.
    """

    TYPO_MAP = {
        'new Type(': 'new TypeError(',
        'new Range(': 'new RangeError(',
        'new Reference(': 'new ReferenceError(',
        'new Syntax(': 'new SyntaxError(',
    }

    def can_handle(self, cluster: ErrorCluster) -> bool:
        return (cluster.root.code == "TS2304" and
                any(f"'{k.split()[1].rstrip('(')}'" in cluster.root.message
                    for k in self.TYPO_MAP))

    def apply(self, code: str, cluster: ErrorCluster) -> Optional[StrategyResult]:
        original = code
        fixes = []
        for wrong, correct in self.TYPO_MAP.items():
            if wrong in code:
                code = code.replace(wrong, correct)
                fixes.append(f"'{wrong.strip()}' → '{correct.strip()}'")

        if code == original:
            return None

        return StrategyResult(
            fixed_code=code,
            errors_addressed=len(fixes),
            description='; '.join(fixes),
        )
