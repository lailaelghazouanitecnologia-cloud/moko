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

        # Sibling awareness — compacted or simple list
        if sibling_context:
            user += f"\n## Sibling types (for import awareness)\n{sibling_context}\n"
        else:
            other_types = [t.name for t in module_bp.types if t.name != type_bp.name]
            if other_types:
                user += f"Other types in this module: {', '.join(other_types)}\n"

        if ref_context:
            user += f"\n{ref_context}\n"

        # Prior layers context (types from already-translated modules)
        if self.prior_layers_context:
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

        if not data or not isinstance(data, dict):
            self._log(f"  WARNING: blueprint parse produced no data")
            self._log(f"  Raw LLM output (first 500 chars): {clean[:500]}")
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
            return yaml.safe_load(text)
        except yaml.YAMLError:
            pass

        # Truncated — strip lines from the end until it parses
        lines = text.split("\n")
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
        """Remove markdown code fences from LLM output."""
        text = text.strip()
        # Remove opening fence: ```typescript or ```yaml etc
        text = re.sub(r'^```\w*\s*\n?', '', text)
        # Remove closing fence
        text = re.sub(r'\n?```\s*$', '', text)
        return text.strip()
