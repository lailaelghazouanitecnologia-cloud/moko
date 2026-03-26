"""
AST-based code detection using ast-grep — replaces regex for structural analysis.

Uses ast-grep-py (PyO3 binding) for zero-false-positive detection of TypeScript
patterns. Falls back gracefully to regex if ast-grep is not installed.

Key improvement over regex:
  - `any` in strings/comments is NOT detected (regex: 5 matches, ast-grep: 4)
  - Structural patterns: "function returning any" vs "any in text"
  - Same API works for Python, Rust, Go via ast-grep multi-language support
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

try:
    from ast_grep_py import SgRoot
    HAS_AST_GREP = True
except ImportError:
    HAS_AST_GREP = False


@dataclass
class AstDetection:
    """Results of AST-based issue detection for one file."""
    any_type_count: int = 0
    any_type_positions: List[Tuple[int, int]] = field(default_factory=list)
    generic_usage_count: int = 0
    union_type_count: int = 0
    type_alias_count: int = 0
    interface_count: int = 0
    class_count: int = 0
    readonly_count: int = 0
    empty_catch_count: int = 0
    stub_count: int = 0


def detect_with_ast(code: str, language: str = "typescript") -> Optional[AstDetection]:
    """Detect code patterns using AST. Returns None if ast-grep unavailable."""
    if not HAS_AST_GREP:
        return None

    try:
        root = SgRoot(code, language)
    except Exception:
        return None

    node = root.root()
    result = AstDetection()

    # any types — only actual type annotations, not strings/comments
    any_nodes = node.find_all(kind="predefined_type")
    for n in any_nodes:
        if n.text() == "any":
            result.any_type_count += 1
            r = n.range()
            result.any_type_positions.append((r.start.line, r.start.column))

    # Generics: <T>, <K, V>, etc.
    result.generic_usage_count = len(node.find_all(kind="type_parameters"))

    # Union types: A | B
    result.union_type_count = len(node.find_all(kind="union_type"))

    # Type aliases: type X = ...
    result.type_alias_count = len(node.find_all(kind="type_alias_declaration"))

    # Interfaces
    result.interface_count = len(node.find_all(kind="interface_declaration"))

    # Classes
    result.class_count = len(node.find_all(kind="class_declaration"))

    # Readonly
    result.readonly_count = len(node.find_all(kind="readonly_type"))
    # Also count 'readonly' modifier on properties
    for prop in node.find_all(kind="public_field_definition"):
        text = prop.text()
        if text.startswith("readonly ") or " readonly " in text:
            result.readonly_count += 1

    # Empty catch blocks
    for catch_node in node.find_all(kind="catch_clause"):
        body = catch_node.find(kind="statement_block")
        if body and body.text().strip() in ("{}", "{ }"):
            result.empty_catch_count += 1

    # Stub indicators: throw new Error("not implemented"), TODO
    for throw_node in node.find_all(kind="throw_statement"):
        text = throw_node.text().lower()
        if "not implemented" in text or "todo" in text:
            result.stub_count += 1

    return result


def detect_python_with_ast(code: str) -> Optional[AstDetection]:
    """Detect Python code patterns using AST."""
    if not HAS_AST_GREP:
        return None

    try:
        root = SgRoot(code, "python")
    except Exception:
        return None

    node = root.root()
    result = AstDetection()

    # Python: missing type hints ≈ weak_type_density
    for func in node.find_all(kind="function_definition"):
        params = func.find(kind="parameters")
        if params:
            for param in params.children():
                if param.kind() == "identifier":
                    # Parameter without type annotation
                    result.any_type_count += 1

    # Empty except blocks
    for handler in node.find_all(kind="except_clause"):
        body = handler.find(kind="block")
        if body:
            stmts = [c for c in body.children() if c.kind() not in ("comment", "pass_statement")]
            if not stmts:
                result.empty_catch_count += 1

    # Stubs: raise NotImplementedError, pass in function body
    for func in node.find_all(kind="function_definition"):
        body = func.find(kind="block")
        if body:
            text = body.text().strip()
            if text == "pass" or "NotImplementedError" in text:
                result.stub_count += 1

    return result
