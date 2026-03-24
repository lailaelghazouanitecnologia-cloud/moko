"""
BlueprintTranslator — converts YAML blueprints to source code via LLM.

Each translation is self-contained:
  1. Load ONE type from the blueprint (from disk)
  2. Load referenced Roska descriptors (from disk)
  3. One LLM call: blueprint + refs → complete code
  4. Write code to disk
  5. Update blueprint status

No context accumulation between calls. Infinite scalability.
"""
from __future__ import annotations

import re
from pathlib import Path


def to_kebab_case(name: str) -> str:
    """Convert PascalCase/camelCase to kebab-case.

    EventEmitter → event-emitter, Mat4 → mat4, Channel3d → channel3d,
    GraphicsDevice → graphics-device, WebGLDevice → web-gl-device
    """
    # Insert hyphen between lowercase/digit and uppercase: eventEmitter → event-Emitter
    s = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', name)
    # Insert hyphen between uppercase acronym and capitalized word: GLDevice → GL-Device
    # But keep acronyms together: WebGL stays as webgl
    s = re.sub(r'([A-Z]{2,})([A-Z][a-z])', r'\1-\2', s)
    return s.lower()


def build_import_map(module_bp, prior_modules: list = None) -> str:
    """Build an import map for the LLM: exact paths for every available type.

    Example output:
    ## Import map (use EXACTLY these paths)
    Same module (math): import { Vec3 } from './vec3';
    Same module (math): import { Mat4 } from './mat4';
    From core: import { EventEmitter } from '../core';
    From math: import { Vec3, Mat4, Quat } from '../math';
    """
    lines = []

    # Same-module imports
    for t in module_bp.types:
        kebab = to_kebab_case(t.name)
        lines.append(f"Same module ({module_bp.name}): import {{ {t.name} }} from './{kebab}';")

    # Cross-module imports (from prior layers via barrel)
    if prior_modules:
        for pm in prior_modules:
            type_names = [t.name for t in pm.types if t.status == "translated"]
            if type_names:
                names_str = ", ".join(type_names[:8])
                if len(type_names) > 8:
                    names_str += ", ..."
                lines.append(f"From {pm.name}: import {{ {names_str} }} from '../{pm.name}';")

    if not lines:
        return ""
    return "## Import map (use EXACTLY these paths)\n" + "\n".join(lines)

from ..llm.providers import LLMProvider, LLMMessage
from .. import OUT_DIR

from .blueprint import ModuleBlueprint, TypeBlueprint
from .compaction import needs_compaction, prepare_translation_context
from .emission import EmissionIndex


def _extract_rich_api(code: str, type_name: str, file_path: str) -> str:
    """Extract a rich API surface from TypeScript source code.

    Captures:
    - Enum values (complete list)
    - Interface/type fields with types
    - Class declarations, constructors, public/protected methods
    - Exported constants and type aliases

    Returns a block like:
      // src/Registers/eflags-register.ts (EFlagsRegister)
      export class EFlagsRegister {
        constructor()
        getCF(): boolean
        setCF(value: boolean): void
        ...
      }
    """
    lines = code.splitlines()
    result = [f"// {file_path} ({type_name})"]
    in_enum = False
    in_block = False
    brace_depth = 0

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
            continue

        # Track braces for context
        open_braces = stripped.count("{")
        close_braces = stripped.count("}")

        # Enum: capture all values
        if in_enum:
            brace_depth += open_braces - close_braces
            if brace_depth <= 0:
                result.append("}")
                in_enum = False
                brace_depth = 0
            elif not stripped.startswith("//"):
                result.append(f"  {stripped}")
            continue

        # Export enum — capture entire body
        if ("enum " in stripped and ("export" in stripped or stripped.startswith("enum "))):
            decl = stripped.split("{")[0].rstrip() + " {"
            result.append(decl)
            brace_depth = open_braces - close_braces
            if brace_depth > 0:
                in_enum = True
                # If values on same line as declaration
                after_brace = stripped.split("{", 1)[1] if "{" in stripped else ""
                if after_brace.strip() and after_brace.strip() != "}":
                    result.append(f"  {after_brace.strip()}")
            elif "}" in stripped:
                result.append("}")
            continue

        # Export type alias — full line
        if stripped.startswith("export type ") and "=" in stripped:
            result.append(stripped.rstrip(";") + ";")
            continue

        # Interface/class declaration
        if any(stripped.startswith(kw) for kw in
               ("export class ", "export abstract class ", "export interface ",
                "class ", "interface ")):
            decl = stripped.split("{")[0].rstrip() + " {"
            result.append(decl)
            in_block = True
            brace_depth = open_braces - close_braces
            continue

        if in_block:
            brace_depth += open_braces - close_braces
            if brace_depth <= 0:
                result.append("}")
                in_block = False
                brace_depth = 0
                continue

            # Only capture top-level members (depth 1)
            if brace_depth == 1:
                # Constructor, methods, getters, setters, properties
                for prefix in ("constructor", "public ", "protected ", "private ",
                               "static ", "get ", "set ", "readonly ",
                               "abstract "):
                    if stripped.startswith(prefix):
                        sig = stripped.split("{")[0].rstrip()
                        if sig.endswith(")") or sig.endswith(";") or ":" in sig:
                            result.append(f"  {sig};")
                        else:
                            result.append(f"  {sig}")
                        break
                else:
                    # Property declarations like "name: type"
                    if ":" in stripped and not stripped.startswith("if") and not stripped.startswith("return"):
                        prop = stripped.split("=")[0].rstrip().rstrip(";")
                        if prop and not any(c in prop for c in ("(", ")", "//", "/*")):
                            result.append(f"  {prop};")

    if len(result) <= 1:
        return ""
    return "\n".join(result)


# ── System Prompts ──────────────────────────────────────────

TRANSLATE_SYSTEM = """You are a code translator. You convert YAML blueprints into complete, production-ready source code.

Rules:
1. Implement EVERY method listed in the blueprint. No stubs, no TODOs.
2. Follow the method signatures exactly as specified.
3. Use the 'hint' field for implementation guidance.
4. Follow the 'constraints' strictly.
5. Reference the provided Roska descriptors for patterns and conventions.
6. Output ONLY the source code. No markdown fences, no explanations.
7. Include proper imports at the top.
8. Use idiomatic style for the target language.
9. Make the code complete and runnable — someone should be able to import it directly.

CODE ORGANIZATION (STRICT):
10. File naming: kebab-case ONLY (e.g., graphics-device.ts, vertex-buffer.ts, event-emitter.ts).
11. Cross-module imports: ALWAYS use barrel imports via index. Example: import { Vec3, Mat4 } from '../math';
12. Same-module imports: use relative path to the file. Example: import { VertexBuffer } from './vertex-buffer';
13. NEVER add .js extension to imports.
14. NEVER use PascalCase or camelCase for file names in import paths.
15. If an IMPORT MAP is provided, use EXACTLY those paths. Do not invent import paths."""

BLUEPRINT_SYSTEM = """You are a software architect. You generate detailed YAML blueprints from reference Roska descriptors.

A blueprint specifies:
- Every type (class/interface/enum) with its fields and methods
- Method signatures with parameter types and return types
- Implementation hints (not full code, but algorithmic guidance)
- References to the Roska descriptors that inspired each type

Format (YAML):
```yaml
name: module_name
language: typescript
target_dir: src/module_name
constraints:
  - "constraint 1"
  - "constraint 2"
references:
  - project/path/descriptor.yaml
types:
  - name: ClassName
    kind: class
    target_file: src/module_name/classname.ts
    extends: BaseClass
    description: "what this class does"
    fields:
      - name: fieldName
        type: fieldType
        default: defaultValue
    methods:
      - name: methodName
        sig: "(param: Type): ReturnType"
        hint: "algorithmic description"
    static:
      - name: CONSTANT
        hint: "description"
    references:
      - project/path/descriptor.yaml
```

Be thorough: include ALL methods from references that add value. Skip trivial getters unless they have non-obvious logic. Include 15-25 methods per class for substantial types."""


class BlueprintTranslator:
    """Translates YAML blueprints to source code, one type at a time."""

    def __init__(self, llm: LLMProvider, out_dir: Path = None,
                 verbose: bool = False, emission_index: EmissionIndex = None,
                 prior_layers_context: str = ""):
        self.llm = llm
        self.out_dir = out_dir or OUT_DIR
        self.verbose = verbose
        self.total_tokens = 0
        self.emission_index = emission_index
        self.prior_layers_context = prior_layers_context
        self.prior_modules: list = []  # ModuleBlueprints from prior layers
        self.semantic_store = None  # Optional SemanticStore for enriched context

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [translator] {msg}")

    def _llm_call(self, system: str, user: str,
                  temperature: float = 0.2, max_tokens: int = 6000) -> tuple[str, int]:
        """Make an LLM call. Returns (content, tokens_used)."""
        resp = self.llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", user)],
            temperature=temperature, max_tokens=max_tokens,
        )
        self.total_tokens += resp.usage.total_tokens
        return resp.content, resp.usage.total_tokens

    # ── Reference Loading ───────────────────────────────────

    def load_references(self, ref_paths: list[str], max_chars: int = 4000) -> str:
        """Load Roska descriptors from disk. Fresh each time, no caching."""
        parts = []
        used = 0
        for ref_path in ref_paths:
            # Try exact path first, then under out_dir
            candidates = [
                self.out_dir / ref_path,
                self.out_dir / ref_path.lstrip("/"),
                Path(ref_path),
            ]
            for p in candidates:
                if p.exists():
                    content = p.read_text()
                    if used + len(content) > max_chars:
                        content = content[:max_chars - used]
                    parts.append(f"## Reference: {ref_path}\n{content}")
                    used += len(content)
                    break
            if used >= max_chars:
                break
        return "\n\n".join(parts)

    # ── Type Translation ────────────────────────────────────

    def translate_type(self, type_bp: TypeBlueprint,
                       module_bp: ModuleBlueprint,
                       project_dir: Path) -> tuple[str, int, list[str]]:
        """Translate ONE type from blueprint to code. Self-contained call.

        Returns (relative_file_path, tokens_used, references_used).
        """
        self._log(f"translating {type_bp.name} [{type_bp.kind}]...")

        # 1. Load references — use emission index if available, else fallback
        refs_used = []
        if self.emission_index:
            ref_context, refs_used = self.emission_index.emit_for_type(
                type_bp, module_bp, max_results=5, max_chars=4000
            )
            if refs_used:
                self._log(f"  emission: {len(refs_used)} refs matched")
        else:
            all_refs = list(set(type_bp.references + module_bp.references))
            ref_context = self.load_references(all_refs)
            refs_used = all_refs

        # 2. Serialize this type's blueprint to YAML (with compaction if needed)
        if needs_compaction(module_bp):
            compacted = prepare_translation_context(type_bp, module_bp, token_budget=2000)
            bp_yaml = compacted.full_type_yaml
            sibling_context = compacted.sibling_summary
            if compacted.prioritized_types:
                self._log(f"  compacted: prioritized {compacted.prioritized_types}")
        else:
            bp_yaml = module_bp.type_to_yaml(type_bp.name)
            sibling_context = None

        # 3. Build user prompt
        user = f"## Blueprint to translate\n```yaml\n{bp_yaml}```\n\n"
        user += f"## Module context\n"
        user += f"Language: {module_bp.language}\n"
        user += f"Module: {module_bp.name}\n"
        user += f"Target file: {type_bp.target_file}\n"
        if module_bp.constraints:
            user += f"Constraints:\n"
            for c in module_bp.constraints:
                user += f"  - {c}\n"

        # Import map — exact paths the LLM must use
        import_map = build_import_map(module_bp, self.prior_modules)
        if import_map:
            user += f"\n{import_map}\n"

        # Sibling awareness — include signatures of already-translated siblings
        if sibling_context:
            user += f"\n## Sibling types (for import awareness)\n{sibling_context}\n"
        else:
            # Inject full YAML of all sibling types so parallel types see each other's contracts
            other_types = [t for t in module_bp.types if t.name != type_bp.name]
            if other_types:
                import yaml as _yaml
                sibling_yamls = []
                for ot in other_types:
                    sibling_yamls.append(_yaml.dump(
                        ot.to_dict(), default_flow_style=False,
                        allow_unicode=True, sort_keys=False, width=120
                    ).strip())
                user += (f"\n## Sibling type blueprints (implement ONLY {type_bp.name}, "
                         f"but conform to these sibling contracts)\n```yaml\n")
                user += "\n---\n".join(sibling_yamls)
                user += "\n```\n"

        # Contracts — inter-type usage rules from dependency analysis
        if module_bp.constraints:
            # Contracts are stored as constraints prefixed with "CONTRACT:"
            contract_lines = [c for c in module_bp.constraints if c.startswith("CONTRACT:")]
            if contract_lines:
                user += "\n## Inter-type contracts (MUST follow these rules)\n"
                for c in contract_lines:
                    user += f"  - {c[9:].strip()}\n"

        # Intra-module sibling signatures: read already-generated code for this module
        sibling_sigs = self._build_sibling_signatures(type_bp, module_bp, project_dir)
        if sibling_sigs:
            user += f"\n## Already generated in this module (use these exact signatures)\n{sibling_sigs}\n"

        if ref_context:
            user += f"\n{ref_context}\n"

        # Cross-module signatures: read actual .ts files from other modules
        cross_sigs = self._build_cross_module_signatures(type_bp, module_bp, project_dir)
        if cross_sigs:
            user += f"\n## Available from other modules (use these exact signatures for imports)\n{cross_sigs}\n"
        elif self.prior_layers_context:
            # Fallback to compact summaries if no files found
            user += f"\n## {self.prior_layers_context}\n"

        # Semantic store — similar patterns from reference codebases
        if self.semantic_store:
            method_names = [m.name for m in type_bp.methods] if type_bp.methods else []
            matches = self.semantic_store.search_for_type(
                type_bp.name, method_names, top_k=5
            )
            if matches:
                sem_lines = []
                for m in matches[:5]:
                    ctx = f" — {m.entry.context}" if m.entry.context else ""
                    sem_lines.append(
                        f"- {m.entry.source}: {m.entry.kind} `{m.entry.name}`{ctx}"
                    )
                user += f"\n## Semantic hints (similar patterns in reference code)\n"
                user += "\n".join(sem_lines) + "\n"

        # 4. LLM call — all token budget for this one type
        code, tokens = self._llm_call(TRANSLATE_SYSTEM, user, max_tokens=6000)

        # 5. Clean output (strip markdown fences if present)
        clean = self._strip_fences(code)

        # 6. Write to disk
        target = type_bp.target_file or f"{module_bp.target_dir}/{to_kebab_case(type_bp.name)}.ts"
        full_path = project_dir / target
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(clean + "\n")

        # 7. Mark as translated
        type_bp.status = "translated"

        self._log(f"  wrote {target} ({len(clean)} chars, {tokens} tokens, {len(refs_used)} refs)")
        return (target, tokens, refs_used)

    def generate_index(self, module_bp: ModuleBlueprint,
                       project_dir: Path) -> str:
        """Generate index.ts with exports from all translated types."""
        lines = []
        for t in module_bp.types:
            if t.status == "translated" and t.target_file:
                # Extract relative import path
                filename = Path(t.target_file).stem
                lines.append(f"export {{ {t.name} }} from './{filename}';")

        target = f"{module_bp.target_dir}/index.ts"
        full_path = project_dir / target
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text("\n".join(lines) + "\n")

        self._log(f"  wrote {target} (index, {len(lines)} exports)")
        return target

    def generate_root_index(self, module_names: list[str],
                            project_dir: Path) -> str:
        """Generate src/index.ts that re-exports all modules."""
        lines = [f"// z86 engine — public API"]
        for mod in module_names:
            lines.append(f"export * from './{mod}';")
        lines.append("")

        target = "src/index.ts"
        full_path = project_dir / target
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text("\n".join(lines))
        self._log(f"  wrote {target} (root index, {len(module_names)} modules)")
        return target

    def _build_sibling_signatures(self, type_bp, module_bp,
                                     project_dir: Path) -> str:
        """Extract signatures from already-translated siblings in same module.

        Reads generated .ts files for translated types and extracts
        export/class/interface/method signatures so the next type
        knows the exact API to use for imports.
        """
        parts = []
        chars = 0
        max_chars = 2000

        for t in module_bp.types:
            if t.name == type_bp.name or t.status != "translated":
                continue

            target = t.target_file or f"{module_bp.target_dir}/{to_kebab_case(t.name)}.ts"
            full_path = project_dir / target
            if not full_path.exists():
                continue

            try:
                code = full_path.read_text()
            except Exception:
                continue

            # Extract signatures: export, class, interface, public method lines
            sig_lines = []
            for line in code.splitlines():
                stripped = line.strip()
                if (stripped.startswith("export ") or
                    stripped.startswith("class ") or
                    stripped.startswith("interface ") or
                    stripped.startswith("enum ") or
                    stripped.startswith("public ") or
                    stripped.startswith("private ") or
                    stripped.startswith("protected ") or
                    stripped.startswith("static ") or
                    stripped.startswith("constructor") or
                    stripped.startswith("get ") or
                    stripped.startswith("set ")):
                    # Remove body
                    clean = stripped.split("{")[0].rstrip()
                    if clean:
                        sig_lines.append(clean)

            if sig_lines:
                rel_path = f"./{to_kebab_case(t.name)}"
                block = f"// {rel_path} ({t.name})\n" + "\n".join(sig_lines[:20])
                if chars + len(block) > max_chars:
                    break
                parts.append(block)
                chars += len(block)

        return "\n\n".join(parts)

    def _build_cross_module_signatures(self, type_bp, module_bp,
                                        project_dir: Path) -> str:
        """Extract rich API surface from generated .ts files in OTHER modules.

        Goes beyond simple signature extraction: captures enum values, interface
        fields, class methods with full signatures, and type aliases. This gives
        the translator the REAL API to code against, preventing phantom types.
        """
        if not self.prior_modules:
            return ""

        parts = []
        chars = 0
        max_chars = 6000  # Generous budget — cross-module coherence is critical

        # Determine which cross-module types THIS type actually references
        from .compaction import _extract_type_references
        my_refs = _extract_type_references(type_bp)
        # Also scan blueprint fields for module-level references
        for f in type_bp.fields:
            if f.type:
                for word in f.type.replace("[]", "").replace("<", " ").replace(">", " ").split():
                    if word and word[0].isupper() and word.isalnum():
                        my_refs.add(word)

        for mod_bp in self.prior_modules:
            mod_types = {t.name for t in mod_bp.types}
            # Prioritize types referenced by our target type
            referenced = [t for t in mod_bp.types if t.name in my_refs]
            unreferenced = [t for t in mod_bp.types if t.name not in my_refs]

            for t in referenced + unreferenced:
                if t.status != "translated":
                    continue

                target = t.target_file or f"{mod_bp.target_dir}/{to_kebab_case(t.name)}.ts"
                full_path = project_dir / target
                if not full_path.exists():
                    continue

                try:
                    code = full_path.read_text()
                except Exception:
                    continue

                api_block = _extract_rich_api(code, t.name, target)
                if not api_block:
                    continue

                # Referenced types get full budget, unreferenced get trimmed
                if t.name not in my_refs:
                    lines = api_block.splitlines()
                    api_block = "\n".join(lines[:10])

                if chars + len(api_block) > max_chars:
                    break
                parts.append(api_block)
                chars += len(api_block)

            if chars >= max_chars:
                break

        return "\n\n".join(parts)

    def generate_project_config(self, project_name: str,
                                module_names: list[str],
                                project_dir: Path) -> list[str]:
        """Generate tsconfig.json and package.json for the project."""
        files = []

        # tsconfig.json with path aliases
        path_aliases = {}
        for mod in module_names:
            path_aliases[f"@{project_name}/{mod}"] = [f"src/{mod}/index.ts"]
            path_aliases[f"@{project_name}/{mod}/*"] = [f"src/{mod}/*"]

        import json
        tsconfig = {
            "compilerOptions": {
                "target": "ES2020",
                "module": "ESNext",
                "moduleResolution": "bundler",
                "lib": ["ES2020", "DOM"],
                "strict": True,
                "esModuleInterop": True,
                "skipLibCheck": True,
                "forceConsistentCasingInFileNames": True,
                "declaration": True,
                "declarationMap": True,
                "sourceMap": True,
                "outDir": "dist",
                "rootDir": "src",
                "baseUrl": ".",
                "paths": path_aliases,
            },
            "include": ["src/**/*.ts"],
            "exclude": ["node_modules", "dist"],
        }

        ts_path = project_dir / "tsconfig.json"
        ts_path.write_text(json.dumps(tsconfig, indent=2) + "\n")
        files.append("tsconfig.json")
        self._log(f"  wrote tsconfig.json ({len(module_names)} path aliases)")

        # package.json
        pkg = {
            "name": project_name,
            "version": "0.1.0",
            "type": "module",
            "main": "dist/index.js",
            "types": "dist/index.d.ts",
            "scripts": {
                "build": "tsc",
                "check": "tsc --noEmit",
            },
            "devDependencies": {
                "typescript": "^5.4.0",
            },
        }
        pkg_path = project_dir / "package.json"
        pkg_path.write_text(json.dumps(pkg, indent=2) + "\n")
        files.append("package.json")
        self._log(f"  wrote package.json")

        return files

    # ── Blueprint Generation ────────────────────────────────

    def generate_blueprint(self, module_name: str, goal: str,
                           ref_paths: list[str],
                           language: str = "typescript",
                           target_dir: str = "") -> tuple[ModuleBlueprint, int]:
        """Use LLM to generate a blueprint from Roska descriptors.

        Returns (ModuleBlueprint, tokens_used).
        """
        self._log(f"generating blueprint for {module_name}...")

        # Load references
        ref_context = self.load_references(ref_paths, max_chars=6000)

        user = f"## Task\n"
        user += f"Generate a detailed YAML blueprint for module '{module_name}'.\n"
        user += f"Language: {language}\n"
        user += f"Target directory: {target_dir or 'src/' + module_name}\n"
        user += f"Goal: {goal}\n\n"
        user += f"## Reference descriptors (Roska format)\n{ref_context}\n\n"
        user += ("Output ONLY the YAML content (no markdown fences). "
                 "Include ALL valuable methods from references. "
                 "Keep method hints SHORT (under 10 words each) to stay within token limits.")

        content, tokens = self._llm_call(BLUEPRINT_SYSTEM, user,
                                         temperature=0.3, max_tokens=8192)

        # Parse the generated YAML (tolerant of truncation)
        clean = self._strip_fences(content)
        data = self._parse_yaml_tolerant(clean)

        def _is_valid_bp(d):
            return isinstance(d, dict) and d.get("types") and len(d["types"]) > 0

        if not _is_valid_bp(data):
            # Retry once with explicit instruction
            self._log(f"  WARNING: blueprint parse failed, retrying...")
            self._log(f"  Raw LLM output (first 300 chars): {clean[:300]}")
            retry_user = (
                user + "\n\nIMPORTANT: Output RAW YAML only. No markdown fences, no explanations. "
                "The YAML MUST contain a 'types' list with at least 2 type definitions."
            )
            content2, tokens2 = self._llm_call(BLUEPRINT_SYSTEM, retry_user,
                                               temperature=0.2, max_tokens=8192)
            tokens += tokens2
            clean = self._strip_fences(content2)
            data = self._parse_yaml_tolerant(clean)

        if not _is_valid_bp(data):
            self._log(f"  FAILED after retry")
            raise ValueError(
                f"Blueprint generation failed for '{module_name}': empty or invalid YAML\n"
                f"First 200 chars: {clean[:200]}"
            )

        bp = ModuleBlueprint(
            name=data.get("name", module_name),
            language=data.get("language", language),
            target_dir=data.get("target_dir", target_dir or f"src/{module_name}"),
            types=[TypeBlueprint.from_dict(t) for t in data.get("types", [])],
            constraints=data.get("constraints", []),
            references=ref_paths,
            description=data.get("description", ""),
        )

        self._log(f"  generated blueprint: {len(bp.types)} types, "
                  f"{sum(len(t.methods) for t in bp.types)} methods")
        return (bp, tokens)

    # ── Helpers ──────────────────────────────────────────────

    def _parse_yaml_tolerant(self, text: str) -> dict | None:
        """Parse YAML, handling truncated output from token limits.

        If the YAML is truncated mid-stream, progressively remove trailing
        lines until it parses. This recovers partial blueprints instead of
        failing completely.
        """
        import yaml
        # Try full text first
        try:
            data = yaml.safe_load(text)
            if isinstance(data, dict):
                return data
        except yaml.YAMLError:
            pass

        # Maybe there are leftover fences or preamble — try aggressive cleanup
        # Remove any line containing only backticks
        cleaned = '\n'.join(
            line for line in text.split('\n')
            if not re.match(r'^```\w*\s*$', line.strip())
        )
        if cleaned != text:
            try:
                data = yaml.safe_load(cleaned)
                if isinstance(data, dict):
                    self._log(f"  recovered YAML after removing stray fences")
                    return data
            except yaml.YAMLError:
                pass

        # Truncated — strip lines from the end until it parses
        lines = cleaned.split("\n")
        for cut in range(1, min(len(lines), 80)):
            truncated = "\n".join(lines[:-cut])
            try:
                data = yaml.safe_load(truncated)
                if isinstance(data, dict) and "types" in data:
                    self._log(f"  recovered truncated YAML (cut {cut} lines)")
                    return data
            except yaml.YAMLError:
                continue

        return None

    def _strip_fences(self, text: str) -> str:
        """Remove markdown code fences from LLM output.

        Handles:
          - Simple: ```yaml\\n...\\n```
          - Prefixed: "Here is the blueprint:\\n```yaml\\n...\\n```"
          - Double-fenced: ```yaml\\n```yaml\\n...\\n```\\n```
          - No fences: returns as-is
        """
        text = text.strip()

        # Remove ALL fence lines (```yaml, ```, etc.) and take what's left
        if '```' in text:
            lines = text.split('\n')
            content_lines = [
                line for line in lines
                if not re.match(r'^\s*```\w*\s*$', line)
            ]
            # Find where YAML content starts (look for key: value pattern)
            for i, line in enumerate(content_lines):
                stripped = line.strip()
                if re.match(r'^[a-zA-Z_]\w*\s*:', stripped):
                    return '\n'.join(content_lines[i:]).strip()
            return '\n'.join(content_lines).strip()

        # No fences found — strip any leading non-YAML text
        # (LLM sometimes prefixes with explanation before the YAML)
        lines = text.split('\n')
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped and (stripped[0] in ('-', '#') or ':' in stripped):
                # Looks like YAML starts here
                # But skip if it's a markdown heading before yaml content
                if stripped.startswith('#') and i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    if not next_line or not (':' in next_line or next_line.startswith('-')):
                        continue
                return '\n'.join(lines[i:]).strip()

        return text
