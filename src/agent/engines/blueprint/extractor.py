"""
SourceExtractor — extracts real method signatures and hints from source code.

DEPRECATED: For generated project indexing, use engines/context/index.py (LiveIndex)
instead. SourceExtractor is still used by BlueprintComposer for REFERENCE project
extraction (reading source from repos/, not from generated code). It will be
replaced when LiveIndex gains reference-project support.

Instead of letting the LLM invent APIs, we read the ACTUAL source code of
reference projects and extract:
  - Method signatures with real parameter types and return types
  - First few lines of method body as implementation hint
  - Field declarations with types
  - Class hierarchy (extends, implements)

Supports: TypeScript, JavaScript, Python (regex-based, no AST dependency).
"""
from __future__ import annotations

import re
import yaml
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from ...dev.blueprint import FieldSpec, MethodSpec


@dataclass
class ExtractedMethod:
    """A method extracted from real source code."""
    name: str
    signature: str          # "(v: Vec3): Vec3"
    params: list[str]       # ["v: Vec3"]
    return_type: str        # "Vec3"
    body_hint: str          # first 3 lines of body
    complexity: int         # lines of code
    source: str             # "playcanvas/src/core/math/vec3.js:45"
    is_static: bool = False
    is_async: bool = False

    def to_method_spec(self) -> MethodSpec:
        """Convert to blueprint MethodSpec."""
        hint = self.body_hint[:80] if self.body_hint else ""
        return MethodSpec(
            name=self.name,
            sig=self.signature,
            hint=hint,
            is_static=self.is_static,
            is_async=self.is_async,
        )


@dataclass
class ExtractedType:
    """A complete type extracted from source code."""
    name: str
    kind: str = "class"
    extends: str = ""
    implements: list[str] = field(default_factory=list)
    fields: list[FieldSpec] = field(default_factory=list)
    methods: list[ExtractedMethod] = field(default_factory=list)
    static_methods: list[ExtractedMethod] = field(default_factory=list)
    source_file: str = ""
    total_loc: int = 0
    descriptor_path: str = ""   # Roska descriptor that pointed here

    @property
    def all_methods(self) -> list[ExtractedMethod]:
        return self.methods + self.static_methods

    @property
    def method_names(self) -> list[str]:
        return [m.name for m in self.all_methods]


# ── Regex patterns ──────────────────────────────────────────

# TypeScript/JavaScript method patterns
_TS_METHOD_RE = re.compile(
    r'(?:(?P<vis>public|private|protected)\s+)?'
    r'(?P<static>static\s+)?'
    r'(?P<async>async\s+)?'
    r'(?P<name>\w+)\s*'
    r'(?P<generics><[^>]*>\s*)?'
    r'\((?P<params>[^)]*)\)'
    r'(?:\s*:\s*(?P<return>[^{;]+?))?'
    r'\s*\{',
    re.MULTILINE
)

# TypeScript class declaration
_TS_CLASS_RE = re.compile(
    r'(?:export\s+)?(?:abstract\s+)?class\s+(?P<name>\w+)'
    r'(?:\s+extends\s+(?P<extends>\w+))?'
    r'(?:\s+implements\s+(?P<implements>[^{]+))?\s*\{',
    re.MULTILINE
)

# TypeScript field: name: Type = default  or  readonly name: Type
_TS_FIELD_RE = re.compile(
    r'(?:(?:public|private|protected|readonly)\s+)*'
    r'(?P<name>\w+)\s*(?::\s*(?P<type>[^=;{]+?))?'
    r'(?:\s*=\s*(?P<default>[^;]+))?\s*;',
    re.MULTILINE
)

# Python method
_PY_METHOD_RE = re.compile(
    r'(?P<indent>[ \t]+)'
    r'(?P<async>async\s+)?'
    r'def\s+(?P<name>\w+)\s*\((?P<params>[^)]*)\)'
    r'(?:\s*->\s*(?P<return>[^:]+))?\s*:',
    re.MULTILINE
)

# Python class
_PY_CLASS_RE = re.compile(
    r'class\s+(?P<name>\w+)\s*(?:\((?P<bases>[^)]*)\))?\s*:',
    re.MULTILINE
)

# Skip these method names
_SKIP_METHODS = {
    "if", "for", "while", "switch", "catch", "return", "new",
    "super", "constructor", "typeof", "instanceof", "throw",
    "function", "const", "let", "var", "require",
}


class SourceExtractor:
    """Extracts real method signatures and hints from source code.

    Flow:
    1. Roska descriptor gives us the file path and type names
    2. We locate the source file in reference project repos
    3. Regex-based extraction of methods, fields, signatures
    4. Return ExtractedType with real data
    """

    def __init__(self, out_dir: Path, project_roots: dict[str, Path] = None,
                 verbose: bool = False):
        """
        Args:
            out_dir: Where Roska descriptors live (out/)
            project_roots: Optional mapping project_name → source root path.
                          If not provided, tries common locations.
        """
        self.out_dir = out_dir
        self.project_roots = project_roots or {}
        self.verbose = verbose

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [extractor] {msg}")

    # ── Main API ────────────────────────────────────────────

    def extract_for_type(self, type_name: str,
                         descriptor_paths: list[str]) -> list[ExtractedType]:
        """Extract type info from source files referenced by descriptors.

        Tries each descriptor, finds the source file, extracts the type.
        Returns all successful extractions (multiple reference projects).
        """
        results = []

        for desc_path in descriptor_paths:
            full_desc = self.out_dir / desc_path
            if not full_desc.exists():
                continue

            try:
                text = full_desc.read_text()
                lines = [l for l in text.split("\n") if not l.startswith("##")]
                data = yaml.safe_load("\n".join(lines))
                if not data or not isinstance(data, dict):
                    continue
            except Exception:
                continue

            # Find the type definition in the descriptor
            source_path = data.get("path", "")
            project_name = desc_path.split("/")[0] if "/" in desc_path else ""

            for type_def in data.get("types", []):
                if not isinstance(type_def, dict):
                    continue
                if type_def.get("name", "").lower() != type_name.lower():
                    continue

                # Try to find and read actual source file
                source_code = self._find_source(project_name, source_path)

                if source_code:
                    # Extract from real source code
                    extracted = self._extract_from_source(
                        source_code, type_name, source_path,
                        desc_path, type_def
                    )
                else:
                    # Fallback: build from descriptor data (better than nothing)
                    extracted = self._extract_from_descriptor(
                        type_def, source_path, desc_path
                    )

                if extracted:
                    results.append(extracted)

        return results

    def extract_all_from_descriptor(self, descriptor_path: str) -> list[ExtractedType]:
        """Extract ALL types from a single descriptor."""
        full_path = self.out_dir / descriptor_path
        if not full_path.exists():
            return []

        try:
            text = full_path.read_text()
            lines = [l for l in text.split("\n") if not l.startswith("##")]
            data = yaml.safe_load("\n".join(lines))
            if not data:
                return []
        except Exception:
            return []

        source_path = data.get("path", "")
        project_name = descriptor_path.split("/")[0] if "/" in descriptor_path else ""
        source_code = self._find_source(project_name, source_path)

        results = []
        for type_def in data.get("types", []):
            if not isinstance(type_def, dict):
                continue
            type_name = type_def.get("name", "")
            if not type_name:
                continue

            if source_code:
                extracted = self._extract_from_source(
                    source_code, type_name, source_path,
                    descriptor_path, type_def
                )
            else:
                extracted = self._extract_from_descriptor(
                    type_def, source_path, descriptor_path
                )

            if extracted:
                results.append(extracted)

        return results

    # ── Source File Location ────────────────────────────────

    def _find_source(self, project_name: str, source_path: str) -> Optional[str]:
        """Try to find and read the actual source file."""
        if not source_path:
            return None

        candidates = []

        # Check configured project roots
        if project_name in self.project_roots:
            root = self.project_roots[project_name]
            candidates.append(root / source_path)

        # Common locations
        candidates.extend([
            Path("projects") / project_name / source_path,
            Path("repos") / project_name / source_path,
            self.out_dir.parent / "repos" / project_name / source_path,
            self.out_dir.parent / project_name / source_path,
        ])

        for path in candidates:
            if path.exists():
                try:
                    content = path.read_text()
                    self._log(f"found source: {path} ({len(content)} chars)")
                    return content
                except Exception:
                    continue

        return None

    # ── Source Code Extraction ──────────────────────────────

    def _extract_from_source(self, code: str, type_name: str,
                             source_path: str, descriptor_path: str,
                             type_def: dict) -> Optional[ExtractedType]:
        """Extract type info directly from source code."""
        lang = self._detect_language(source_path)

        if lang == "python":
            return self._extract_python(code, type_name, source_path,
                                        descriptor_path, type_def)
        else:
            return self._extract_typescript(code, type_name, source_path,
                                           descriptor_path, type_def)

    def _extract_typescript(self, code: str, type_name: str,
                           source_path: str, descriptor_path: str,
                           type_def: dict) -> Optional[ExtractedType]:
        """Extract from TypeScript/JavaScript source."""
        extracted = ExtractedType(
            name=type_name,
            kind=type_def.get("kind", "class"),
            source_file=source_path,
            descriptor_path=descriptor_path,
            total_loc=len(code.splitlines()),
        )

        # Find class declaration
        for m in _TS_CLASS_RE.finditer(code):
            if m.group("name") == type_name:
                extracted.extends = m.group("extends") or ""
                impl = m.group("implements") or ""
                if impl:
                    extracted.implements = [i.strip() for i in impl.split(",")]
                break

        # Find class body (rough: from class { to matching })
        class_body = self._find_class_body(code, type_name)
        if not class_body:
            class_body = code  # fallback to whole file

        # Extract methods
        known_methods = set()
        for method_key in ("methods", "static_methods"):
            for mdef in type_def.get(method_key, []):
                mname = mdef if isinstance(mdef, str) else mdef.get("name", "")
                if mname:
                    known_methods.add(mname)

        for m in _TS_METHOD_RE.finditer(class_body):
            name = m.group("name")
            if name in _SKIP_METHODS:
                continue
            if name == "constructor":
                continue

            is_static = bool(m.group("static"))
            is_async = bool(m.group("async"))
            params = m.group("params").strip()
            return_type = (m.group("return") or "").strip()

            # Build signature
            sig = f"({params})"
            if return_type:
                sig += f": {return_type}"

            # Extract body hint (first 3 meaningful lines after {)
            body_hint = self._extract_body_hint(class_body, m.end())

            method = ExtractedMethod(
                name=name,
                signature=sig,
                params=[p.strip() for p in params.split(",") if p.strip()],
                return_type=return_type,
                body_hint=body_hint,
                complexity=self._count_method_lines(class_body, m.end()),
                source=f"{source_path}:{m.start()}",
                is_static=is_static,
                is_async=is_async,
            )

            if is_static:
                extracted.static_methods.append(method)
            else:
                extracted.methods.append(method)

        # Extract fields
        for m in _TS_FIELD_RE.finditer(class_body[:2000]):  # fields are near top
            name = m.group("name")
            ftype = (m.group("type") or "").strip()
            default = (m.group("default") or "").strip()
            if name and name not in _SKIP_METHODS and not name.startswith("_"):
                extracted.fields.append(FieldSpec(
                    name=name, type=ftype, default=default
                ))

        self._log(f"extracted {type_name} from source: "
                  f"{len(extracted.methods)} methods, "
                  f"{len(extracted.static_methods)} static, "
                  f"{len(extracted.fields)} fields")
        return extracted

    def _extract_python(self, code: str, type_name: str,
                       source_path: str, descriptor_path: str,
                       type_def: dict) -> Optional[ExtractedType]:
        """Extract from Python source."""
        extracted = ExtractedType(
            name=type_name,
            kind=type_def.get("kind", "class"),
            source_file=source_path,
            descriptor_path=descriptor_path,
            total_loc=len(code.splitlines()),
        )

        # Find class
        for m in _PY_CLASS_RE.finditer(code):
            if m.group("name") == type_name:
                bases = m.group("bases") or ""
                if bases:
                    base_list = [b.strip() for b in bases.split(",")]
                    if base_list:
                        extracted.extends = base_list[0]
                break

        # Extract methods
        for m in _PY_METHOD_RE.finditer(code):
            name = m.group("name")
            if name.startswith("__") and name.endswith("__"):
                if name not in ("__init__", "__repr__", "__str__", "__eq__"):
                    continue
            if name.startswith("_") and not name.startswith("__"):
                continue

            is_async = bool(m.group("async"))
            params_raw = m.group("params")
            return_type = (m.group("return") or "").strip()

            # Clean params: remove self/cls
            params = [p.strip() for p in params_raw.split(",") if p.strip()]
            params = [p for p in params if p not in ("self", "cls")]

            sig = f"({', '.join(params)})"
            if return_type:
                sig += f" -> {return_type}"

            body_hint = self._extract_body_hint(code, m.end())

            is_static = "self" not in params_raw

            method = ExtractedMethod(
                name=name,
                signature=sig,
                params=params,
                return_type=return_type,
                body_hint=body_hint,
                complexity=self._count_method_lines(code, m.end()),
                source=f"{source_path}:{m.start()}",
                is_static=is_static,
                is_async=is_async,
            )

            if is_static:
                extracted.static_methods.append(method)
            else:
                extracted.methods.append(method)

        return extracted

    # ── Descriptor Fallback ────────────────────────────────

    def _extract_from_descriptor(self, type_def: dict, source_path: str,
                                 descriptor_path: str) -> ExtractedType:
        """Build ExtractedType from descriptor data when source isn't available.

        Less detailed than source extraction but better than nothing.
        """
        type_name = type_def.get("name", "")
        extracted = ExtractedType(
            name=type_name,
            kind=type_def.get("kind", "class"),
            extends=type_def.get("extends", ""),
            source_file=source_path,
            descriptor_path=descriptor_path,
        )

        # Fields from descriptor
        for f in type_def.get("fields", []):
            if isinstance(f, str):
                if ":" in f:
                    name, ftype = f.split(":", 1)
                    extracted.fields.append(FieldSpec(name=name.strip(), type=ftype.strip()))
                else:
                    extracted.fields.append(FieldSpec(name=f))
            elif isinstance(f, dict):
                extracted.fields.append(FieldSpec(
                    name=f.get("name", ""),
                    type=f.get("type", ""),
                ))

        # Methods from descriptor (names only, no signatures)
        for method_key, is_static in [("methods", False), ("static_methods", True)]:
            for mdef in type_def.get(method_key, []):
                mname = mdef if isinstance(mdef, str) else mdef.get("name", "")
                if not mname:
                    continue
                sig = "" if isinstance(mdef, str) else mdef.get("sig", "")
                method = ExtractedMethod(
                    name=mname,
                    signature=sig,
                    params=[],
                    return_type="",
                    body_hint="",
                    complexity=0,
                    source=f"{source_path}",
                    is_static=is_static,
                )
                if is_static:
                    extracted.static_methods.append(method)
                else:
                    extracted.methods.append(method)

        self._log(f"extracted {type_name} from descriptor (no source): "
                  f"{len(extracted.methods)} methods")
        return extracted

    # ── Helpers ──────────────────────────────────────────────

    def _detect_language(self, path: str) -> str:
        if path.endswith((".ts", ".tsx")):
            return "typescript"
        if path.endswith((".js", ".jsx", ".mjs")):
            return "javascript"
        if path.endswith(".py"):
            return "python"
        return "typescript"  # default

    def _find_class_body(self, code: str, class_name: str) -> Optional[str]:
        """Find the body of a class by matching braces."""
        pattern = re.compile(
            rf'(?:export\s+)?(?:abstract\s+)?class\s+{re.escape(class_name)}\b[^{{]*\{{',
            re.MULTILINE
        )
        m = pattern.search(code)
        if not m:
            return None

        start = m.end()
        depth = 1
        i = start
        while i < len(code) and depth > 0:
            if code[i] == '{':
                depth += 1
            elif code[i] == '}':
                depth -= 1
            i += 1

        return code[m.start():i]

    def _extract_body_hint(self, code: str, start_pos: int, max_lines: int = 3) -> str:
        """Extract first few meaningful lines after a method opening brace."""
        # Find content after the opening {
        remaining = code[start_pos:start_pos + 500]
        lines = remaining.split("\n")

        hint_lines = []
        for line in lines[1:]:  # skip the opening line
            stripped = line.strip()
            if not stripped or stripped == "}":
                if hint_lines:
                    break
                continue
            # Skip comments
            if stripped.startswith("//") or stripped.startswith("#"):
                continue
            hint_lines.append(stripped)
            if len(hint_lines) >= max_lines:
                break

        return "; ".join(hint_lines) if hint_lines else ""

    def _count_method_lines(self, code: str, start_pos: int) -> int:
        """Count lines in a method body (rough estimate)."""
        remaining = code[start_pos:]
        depth = 1
        lines = 0
        for char in remaining:
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth <= 0:
                    break
            elif char == '\n':
                lines += 1
        return max(lines, 1)
