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
from ..tools.emission import EmissionIndex


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

TRANSLATE_SYSTEM = """You are a code translator. You convert YAML blueprints into complete, production-ready TypeScript code.

Rules:
1. Implement EVERY method listed in the blueprint. No stubs, no TODOs.
2. Follow the method signatures exactly as specified.
3. Use the 'hint' field for implementation guidance.
4. Follow the 'constraints' strictly.
5. Reference the provided Roska descriptors for patterns and conventions.
6. Output ONLY the source code. No markdown fences, no explanations.
7. Include proper imports at the top.
8. Make the code complete and runnable — someone should be able to import it directly.

TYPE SAFETY (CRITICAL — follow these strictly):
9. NEVER use 'any'. Use 'unknown', generics, or specific interfaces instead.
10. Use generic type parameters <T> for reusable containers, handlers, and factories.
11. Use discriminated unions for state/status types: type Result = { kind: 'ok'; value: T } | { kind: 'error'; error: string }.
12. Mark ALL fields that are only set in the constructor as 'readonly'.
13. Use 'private readonly' for injected dependencies.
14. Define type aliases for domain concepts: type PlayerId = string & { readonly __brand: 'PlayerId' }.
15. Use ReadonlyArray<T> for arrays that should not be mutated.

NAMING (STRICT):
16. The exported type MUST use the EXACT name from the blueprint. Do NOT rename it.
17. The main export MUST be: export class/interface/enum <BlueprintName>.

CODE ORGANIZATION (STRICT):
18. File naming: kebab-case ONLY (e.g., graphics-device.ts, vertex-buffer.ts, event-emitter.ts).
19. Cross-module imports: ALWAYS use barrel imports via index. Example: import { Vec3, Mat4 } from '../math';
20. Same-module imports: use relative path to the file. Example: import { VertexBuffer } from './vertex-buffer';
21. NEVER add .js extension to imports.
22. NEVER use PascalCase or camelCase for file names in import paths.
23. If an IMPORT MAP is provided, use EXACTLY those paths. Do not invent import paths.

TYPE REUSE (IMPORTANT):
24. ALWAYS import and use types from dependency modules. Do NOT redefine types that already exist.
25. When a method accepts or returns domain objects (e.g., Task, Player, Config), use the imported type — NEVER use generic Record<string, unknown> or inline object literals as substitutes.
26. Reference types listed in 'Available from other modules' section. Import and use them in method signatures, fields, and generics.
27. Create interfaces for abstractions that other modules should depend on. Prefer interface over class for pure contracts.

CODE STYLE (CRITICAL — write clean, production code like a senior engineer):
28. NO unnecessary comments. NEVER add JSDoc that just describes what is already obvious from the signature. BAD: "/** Add a task. */ addTask(task: Task)". GOOD: "/** Merge overlapping intervals using sweep-line algorithm. */".
29. NEVER add typeof/instanceof checks on typed parameters. WRONG: "if (typeof id !== 'string') throw new TypeError(...)". The type signature already enforces this. Delete ALL such checks.
30. Use OPTIONAL CHAINING (?.) everywhere: "user?.name" not "if (user) { user.name }".
31. Use NULLISH COALESCING (??) for defaults: "value ?? 0" not "value !== undefined ? value : 0".
32. Use TERNARY for simple branches: "const x = cond ? a : b" not 4-line if/else.
33. Use EARLY RETURNS for control flow, but NEVER for type-checking typed params.
34. Every line must earn its place. REMOVE: validation of typed params, comments restating code, empty catch blocks, redundant null checks on non-nullable fields.
35. Use string literal union types: type Status = 'active' | 'paused' | 'done'.

ANTI-PATTERNS (NEVER DO THESE):
- if (typeof x !== 'string') throw new TypeError(...) — when x: string in signature
- /** Gets the name. */ getName(): string — comment restates signature
- if (!param) throw new TypeError('param is required') — when param is typed non-optional
- @param x - The x value. @returns The result. — JSDoc restating the obvious"""

BLUEPRINT_SYSTEM = """You are a software architect. You generate detailed YAML blueprints from reference Roska descriptors.

A blueprint specifies:
- Every type (class/interface/enum) with its fields and methods
- Method signatures with parameter types and return types
- Implementation hints (not full code, but algorithmic guidance)

CRITICAL: Output the 'types' list EARLY in the YAML. Keep constraints to max 3 short lines.

Format (YAML):
```yaml
name: module_name
language: typescript
target_dir: src/module_name
constraints:
  - "max 3 short constraints"
types:
  - name: ClassName
    kind: class
    target_file: src/module_name/classname.ts
    extends: BaseClass
    description: "what this class does"
    fields:
      - name: fieldName
        type: "fieldType"
    methods:
      - name: methodName
        sig: "(param: Type): ReturnType"
        hint: "short algorithmic description"
    static:
      - name: CONSTANT
        hint: "description"
```

Include key methods that define the class API. Skip trivial getters/setters. Target 5-10 methods per class.
Keep method hints to 3-5 words MAX. Do NOT write long descriptions.
Generate ONLY the types listed in the task goal. If a type starts with I (e.g., IRepository), make it an interface.
For classes, ALWAYS create a matching interface that other modules can depend on.
If a supporting type is needed, define it inline (e.g. as a field type) — do NOT create a separate type entry.

TYPE QUALITY:
- Use generic parameters <T> where a type is reusable (e.g., EventEmitter<T>, Store<T>).
- Mark constructor-injected fields as 'private readonly' in the field type.
- Use discriminated unions in method signatures (e.g., Result<T> = {kind:'ok',value:T}|{kind:'error',error:string}).
- Prefer ReadonlyArray<T> over T[] for immutable collections.

IMPORTANT: Keep total YAML under 150 lines to avoid truncation."""


class BlueprintTranslator:
    """Translates YAML blueprints to source code, one type at a time."""

    def __init__(self, llm: LLMProvider, out_dir: Path = None,
                 verbose: bool = False, emission_index: EmissionIndex = None,
                 prior_layers_context: str = "",
                 rich_mode: bool = False):
        self.llm = llm
        self.out_dir = out_dir or OUT_DIR
        self.verbose = verbose
        self.total_tokens = 0
        self.emission_index = emission_index
        self.prior_layers_context = prior_layers_context
        self.prior_modules: list = []  # ModuleBlueprints from prior layers
        self.semantic_store = None  # Optional SemanticStore for enriched context
        self.rich_mode = rich_mode  # When True, use higher token budget
        self.functional_spec_context: str = ""  # From GoalReasoner — domain requirements
        self.context_engine = None  # Optional ContextEngine for richer snapshots
        self.quality_engine = None # Optional QualityEngine for style-aware hints
        self.style_rules = None    # Optional StyleRules for user-configurable style
        self.pi_context = ""       # Optional PI pattern/style context for generation

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

    def _build_system_prompt(self, file_path: str = "", task: str = "translate") -> str:
        """Build system prompt using modular PromptEngine when available.

        Falls back to monolithic TRANSLATE_SYSTEM for backwards compatibility.
        """
        try:
            from ..prompts.engine import PromptEngine, PromptContext

            engine = PromptEngine(
                project_dir=self.out_dir.parent if self.out_dir else None
            )

            # Collect style hints
            style_hints = []
            if self.quality_engine:
                style_hints = self.quality_engine.get_style_hints()

            ctx = PromptContext(
                task=task,
                model=getattr(self.llm, "model", ""),
                functional_spec=self.functional_spec_context,
                style_hints=style_hints,
                target_file=file_path,
            )

            # Inject invariants if available
            if self.context_engine:
                inv_store = getattr(self.context_engine, "invariant_store", None)
                if inv_store and hasattr(inv_store, "rules"):
                    ctx.invariants = [r.text for r in inv_store.rules[:5]]

            prompt = engine.build(ctx)
            if prompt and len(prompt) > 100:
                # Add style rules on top if available
                if self.style_rules and self.style_rules.has_custom_rules():
                    style_section = (
                        self.style_rules.to_system_prompt_for_file(file_path)
                        if file_path
                        else self.style_rules.to_system_prompt()
                    )
                    if style_section:
                        prompt += "\n\n## User Style Rules\n" + style_section
                return prompt

        except Exception:
            pass

        # Fallback to monolithic prompt
        base = TRANSLATE_SYSTEM
        if self.style_rules and self.style_rules.has_custom_rules():
            style_section = (
                self.style_rules.to_system_prompt_for_file(file_path)
                if file_path
                else self.style_rules.to_system_prompt()
            )
            if style_section:
                base += "\n\n## User Style Rules (follow these preferences)\n" + style_section
        return base

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

        # PI pattern context — architectural inspiration from reference intelligence
        if self.pi_context:
            user += f"\n{self.pi_context}\n"

        # Style hints — only what the existing context doesn't already show
        if self.quality_engine:
            style_ctx = self.quality_engine.get_style_context(
                existing_context=user,
                type_name=type_bp.name,
                module_name=module_bp.name,
            )
            if style_ctx:
                user += f"\n{style_ctx}\n"

        # 4. Strategy selection — pick the right approach for this type
        target_file = type_bp.target_file or f"{module_bp.target_dir}/{to_kebab_case(type_bp.name)}.ts"
        system_prompt = self._build_system_prompt(target_file)
        model_max = getattr(self.llm, 'max_output', 8000)

        # Check if a non-default strategy should be used
        method_count = len(type_bp.methods) if type_bp.methods else 0
        output_estimate = method_count * 30  # ~30 tokens per method rough estimate

        try:
            from ..engines.strategies.selector import StrategySelector, TaskProfile, StrategyChoice
            selector = StrategySelector(verbose=self.verbose)
            profile = TaskProfile(
                task_type="translate",
                input_tokens=len(user) // 4,
                output_tokens_estimate=output_estimate,
                method_count=method_count,
                complexity="complex" if method_count > 10 else "medium" if method_count > 5 else "simple",
                context_window=getattr(self.llm, 'context_window', 131072),
                max_output=model_max,
                has_sub_llm=True,  # Groq always has llama-3.1-8b available
            )
            choice = selector.select(profile)

            if choice == StrategyChoice.RLM and method_count > 20:
                from ..engines.strategies.rlm import RLMStrategy
                from ..core.llm.providers import LLMProvider
                sub_llm = LLMProvider("groq", model="llama-3.1-8b-instant")
                rlm = RLMStrategy(root_llm=self.llm, sub_llm=sub_llm, verbose=self.verbose)
                result = rlm.execute({
                    "llm": self.llm, "sub_llm": sub_llm,
                    "blueprint_yaml": bp_yaml, "spec_context": self.functional_spec_context,
                    "system_prompt": system_prompt, "user_prompt": user,
                })
                if result.success and result.code:
                    code = result.code
                    tokens = result.tokens_used
                    clean = self._strip_code_fences(code)
                    clean = self._fix_orphaned_class_body(clean, type_bp, module_bp)
                    # Jump to write phase
                    self._write_output(clean, target_file, type_bp, module_bp, project_dir, tokens, [])
                    return (target_file, tokens, [])

            if choice == StrategyChoice.SKELETON_FILL and method_count > 10:
                from ..engines.strategies.skeleton_fill import SkeletonFillStrategy
                skel = SkeletonFillStrategy()
                max_tok = min(model_max, 16384)
                result = skel.execute({
                    "llm": self.llm, "system_prompt": system_prompt,
                    "user_prompt": user, "blueprint_yaml": bp_yaml,
                    "spec_context": self.functional_spec_context,
                    "max_tokens": max_tok,
                })
                if result.success and result.code:
                    code = result.code
                    tokens = result.tokens_used
                    clean = self._strip_code_fences(code)
                    clean = self._fix_orphaned_class_body(clean, type_bp, module_bp)
                    self._write_output(clean, target_file, type_bp, module_bp, project_dir, tokens, [])
                    return (target_file, tokens, [])
        except Exception as e:
            if self.verbose:
                self._log(f"  strategy selection failed ({e}), using default")

        # Default: BigContext — 1 call
        max_tok = min(model_max, 16384) if self.rich_mode else min(model_max, 12000)
        code, tokens = self._llm_call(system_prompt, user, max_tokens=max_tok)

        # 5. Clean output (strip markdown fences only — no YAML heuristics)
        clean = self._strip_code_fences(code)

        # 5.5. Fix orphaned class body (LLM sometimes omits class wrapper)
        clean = self._fix_orphaned_class_body(clean, type_bp, module_bp)

        # 6. Write to disk
        target = target_file
        full_path = project_dir / target
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(clean + "\n")

        # 7. Mark as translated
        type_bp.status = "translated"

        self._log(f"  wrote {target} ({len(clean)} chars, {tokens} tokens, {len(refs_used)} refs)")
        return (target, tokens, refs_used)

    def _write_output(self, code: str, target_file: str, type_bp, module_bp,
                      project_dir, tokens: int, refs_used: list):
        """Write generated code to disk and mark as translated."""
        full_path = project_dir / target_file
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(code + "\n")
        type_bp.status = "translated"
        self._log(f"  wrote {target_file} ({len(code)} chars, {tokens} tokens, {len(refs_used)} refs)")

    def translate_type_rich(self, type_bp: TypeBlueprint,
                            module_bp: ModuleBlueprint,
                            project_dir: Path) -> tuple[str, int, list[str]]:
        """Two-pass translation: skeleton + enhancement for richer output.

        Pass 1: Standard translate_type() with rich_mode for higher token budget.
        Pass 2: Enhancement pass that fleshes out the generated code.

        Returns (relative_file_path, tokens_used, references_used).
        """
        # Pass 1: Generate skeleton with rich mode
        old_rich = self.rich_mode
        self.rich_mode = True
        file_path, tokens1, refs_used = self.translate_type(type_bp, module_bp, project_dir)
        self.rich_mode = old_rich

        # Pass 2: Enhance the generated code
        code_path = project_dir / file_path
        if not code_path.exists():
            return file_path, tokens1, refs_used

        code = code_path.read_text()
        if len(code.splitlines()) >= 300:
            # Already substantial
            return file_path, tokens1, refs_used

        import yaml as _yaml
        bp_yaml = _yaml.dump(
            type_bp.to_dict(), default_flow_style=False,
            allow_unicode=True, sort_keys=False, width=120,
        )

        enhance_system = (
            "You are enhancing TypeScript code. The code below is functionally correct "
            "but sparse. Add: complete error handling, edge case coverage, JSDoc comments, "
            "private helper methods, and any missing method implementations from the blueprint.\n\n"
            "Rules:\n"
            "1. Output the COMPLETE enhanced file.\n"
            "2. Keep all existing functionality intact.\n"
            "3. Add missing methods from the blueprint.\n"
            "4. Add JSDoc for public methods.\n"
            "5. Add input validation and error handling.\n"
            "6. Output ONLY the source code. No markdown fences."
        )
        enhance_user = (
            f"## Current code\n```typescript\n{code}\n```\n\n"
            f"## Blueprint\n```yaml\n{bp_yaml}\n```\n\n"
            f"Enhance this code. Output the COMPLETE file."
        )

        enhanced, tokens2 = self._llm_call(enhance_system, enhance_user, max_tokens=12000)
        clean = self._strip_code_fences(enhanced)

        if clean.strip() and len(clean.splitlines()) > len(code.splitlines()):
            code_path.write_text(clean + "\n")
            self._log(f"  enhanced {type_bp.name}: "
                      f"{len(code.splitlines())} -> {len(clean.splitlines())} LOC")

        return file_path, tokens1 + tokens2, refs_used

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

        If a ContextEngine is available, uses its snapshot for precise signatures
        with resolved import paths.
        """
        # Use context engine for richer, indexed signatures
        if self.context_engine and self.context_engine.is_initialized:
            try:
                dep_modules = [m.name for m in self.prior_modules]
                snapshot = self.context_engine.snapshot.for_translator(
                    type_bp.name, module_bp.name, dep_modules,
                    self.context_engine.index,
                )
                if snapshot and len(snapshot) > 50:
                    return snapshot
            except Exception:
                pass  # Fall through to original logic

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

        Generates one type at a time to avoid YAML truncation from token limits.
        Returns (ModuleBlueprint, tokens_used).
        """
        self._log(f"generating blueprint for {module_name}...")

        # Load references once
        ref_context = self.load_references(ref_paths, max_chars=4000)

        # Extract type names from goal (format: "Module 'X' with types: A, B, C. ...")
        import re as _re
        type_match = _re.search(r'types:\s*(.+?)\.', goal)
        requested_types = []
        if type_match:
            requested_types = [t.strip() for t in type_match.group(1).split(',') if t.strip()]

        if not requested_types:
            # Fallback: generate full module blueprint in one shot (old behavior)
            return self._generate_blueprint_full(module_name, goal, ref_paths,
                                                  ref_context, language, target_dir)

        # Per-type blueprint generation — one LLM call per type, no truncation
        per_type_system = (
            "You are a software architect. Generate a YAML blueprint for ONE type.\n\n"
            "Output ONLY raw YAML (no markdown fences). Format:\n"
            "```yaml\n"
            "name: TypeName\n"
            "kind: class|interface|enum\n"
            "description: \"brief purpose\"\n"
            "fields:\n"
            "  - name: fieldName\n"
            "    type: \"fieldType\"\n"
            "methods:\n"
            "  - name: methodName\n"
            "    sig: \"(param: Type): ReturnType\"\n"
            "    hint: \"3-5 words max\"\n"
            "```\n\n"
            "IMPORTANT: ALWAYS quote 'type' values with double quotes. Example: type: \"Map<string, number>\"\n\n"
            "Rules:\n"
            "- Target 5-10 methods per class, 3-6 for interfaces.\n"
            "- Keep hints to 3-5 words MAX.\n"
            "- Use the EXACT type name given. Do NOT rename it.\n"
            "- Include fields that this type needs.\n"
            "- Output ONLY the YAML. No explanations."
        )

        all_types = []
        total_tokens = 0
        # Build sibling context so each type knows about the others
        sibling_list = ", ".join(requested_types)

        for type_name in requested_types:
            user = (
                f"## Type to blueprint: {type_name}\n"
                f"Module: {module_name}\n"
                f"Module goal: {goal}\n"
                f"Sibling types in this module: {sibling_list}\n"
                f"Language: {language}\n"
            )
            if self.functional_spec_context:
                user += f"\n{self.functional_spec_context}\n"
            if self.pi_context:
                user += f"\n{self.pi_context}\n"
            if ref_context:
                user += f"\n## Reference descriptors\n{ref_context}\n"
            user += f"\nGenerate the YAML for {type_name} ONLY."

            content, tokens = self._llm_call(per_type_system, user,
                                             temperature=0.3, max_tokens=2048)
            total_tokens += tokens

            clean = self._strip_fences(content)
            data = self._parse_yaml_tolerant(clean)

            if isinstance(data, dict) and data.get("name"):
                # Force the correct name (LLM may rename)
                data["name"] = type_name
                all_types.append(data)
                methods_count = len(data.get("methods", []))
                self._log(f"  blueprint {type_name}: {methods_count} methods")
            else:
                self._log(f"  blueprint {type_name}: FAILED parse, will use empty fallback")

        td = target_dir or f"src/{module_name}"
        bp = ModuleBlueprint(
            name=module_name,
            language=language,
            target_dir=td,
            types=[TypeBlueprint.from_dict(t) for t in all_types
                   if isinstance(t, dict) and t.get("name")],
            constraints=[],
            references=ref_paths,
            description="",
        )

        self._log(f"  generated blueprint: {len(bp.types)} types, "
                  f"{sum(len(t.methods) for t in bp.types)} methods")
        return (bp, total_tokens)

    def _generate_blueprint_full(self, module_name: str, goal: str,
                                  ref_paths: list[str], ref_context: str,
                                  language: str, target_dir: str
                                  ) -> tuple[ModuleBlueprint, int]:
        """Fallback: generate full module blueprint in one LLM call."""
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

        clean = self._strip_fences(content)
        data = self._parse_yaml_tolerant(clean)

        def _is_valid_bp(d):
            return isinstance(d, dict) and d.get("types") and len(d["types"]) > 0

        if not _is_valid_bp(data):
            self._log(f"  WARNING: blueprint parse failed, retrying...")
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
            raise ValueError(f"Blueprint generation failed for '{module_name}'")

        bp = ModuleBlueprint(
            name=data.get("name", module_name),
            language=data.get("language", language),
            target_dir=data.get("target_dir", target_dir or f"src/{module_name}"),
            types=[TypeBlueprint.from_dict(t) for t in data.get("types", [])
                   if isinstance(t, dict) and t.get("name")],
            constraints=data.get("constraints", []),
            references=ref_paths,
            description=data.get("description", ""),
        )

        self._log(f"  generated blueprint: {len(bp.types)} types, "
                  f"{sum(len(t.methods) for t in bp.types)} methods")
        return (bp, tokens)

    # ── Helpers ──────────────────────────────────────────────

    def _sanitize_yaml_values(self, text: str) -> str:
        """Quote YAML values that contain characters that break parsing.

        LLM-generated blueprint YAML often has unquoted values like:
          type: Map<string, Task>   → colon inside <> breaks YAML
          type: boolean             → parsed as Python True
          type: string[]            → brackets confuse parser
          sig: "(p: Type): Ret"     → already quoted, leave alone

        This quotes the 'type:', 'sig:', 'hint:', and 'default:' field values.
        Also fixes missing colons: 'type "value"' → 'type: "value"'.
        """
        result_lines = []
        for line in text.split('\n'):
            # Fix missing colon: `type "value"` → `type: "value"`
            m_missing = re.match(r'^(\s*)(type|sig|hint|default)\s+(".*"|\S+)$', line)
            if m_missing:
                indent, key, value = m_missing.group(1), m_missing.group(2), m_missing.group(3)
                line = f'{indent}{key}: {value}'

            # Match lines like "    type: someValue" or "    sig: something"
            m = re.match(r'^(\s*)(type|sig|hint|default|description):\s*(.+)$', line)
            if m:
                indent, key, value = m.group(1), m.group(2), m.group(3)
                # Skip if already quoted
                if not ((value.startswith('"') and value.endswith('"')) or
                        (value.startswith("'") and value.endswith("'"))):
                    # Quote if value contains YAML-breaking chars or is a YAML keyword
                    needs_quote = (
                        ':' in value or
                        '<' in value or
                        '>' in value or
                        '[' in value or
                        ']' in value or
                        '{' in value or
                        '}' in value or
                        '#' in value or
                        '|' in value or
                        value.lower() in ('true', 'false', 'yes', 'no', 'null',
                                          'on', 'off', 'string', 'boolean',
                                          'number', 'object', 'array')
                    )
                    if needs_quote:
                        # Escape existing double quotes in the value
                        escaped = value.replace('\\', '\\\\').replace('"', '\\"')
                        line = f'{indent}{key}: "{escaped}"'
            result_lines.append(line)
        return '\n'.join(result_lines)

    def _parse_yaml_tolerant(self, text: str) -> dict | None:
        """Parse YAML, handling truncated output from token limits.

        If the YAML is truncated mid-stream, progressively remove trailing
        lines until it parses. This recovers partial blueprints instead of
        failing completely.
        """
        import yaml

        # Pre-sanitize: quote values that break YAML parsing
        text = self._sanitize_yaml_values(text)

        # Try full text first
        try:
            data = yaml.safe_load(text)
            if isinstance(data, dict):
                # Fix any values that YAML parsed as non-string (bool, etc.)
                self._fix_yaml_types(data)
                self._log(f"  yaml: direct parse OK, keys={list(data.keys())[:5]}")
                return data
        except yaml.YAMLError as e:
            self._log(f"  yaml: direct parse failed: {str(e)[:100]}")

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
                    self._fix_yaml_types(data)
                    self._log(f"  recovered YAML after removing stray fences")
                    return data
            except yaml.YAMLError:
                pass

        # Strategy 0.5: Remove individually broken lines and retry
        # Lines that don't have proper YAML key: value format
        repair_lines = []
        for line in cleaned.split("\n"):
            stripped = line.strip()
            # Keep empty lines, comments, and properly formatted lines
            if not stripped or stripped.startswith("#"):
                repair_lines.append(line)
            elif re.match(r'^[\w-]+:', stripped) or stripped.startswith("- ") or stripped.startswith("```"):
                repair_lines.append(line)
            elif re.match(r'^\s+[\w-]+:', stripped):
                repair_lines.append(line)
            # Skip malformed lines (e.g., `type "3"` that wasn't caught)
            else:
                continue
        repaired = "\n".join(repair_lines)
        if repaired != cleaned:
            try:
                data = yaml.safe_load(repaired)
                if isinstance(data, dict):
                    self._fix_yaml_types(data)
                    self._log(f"  recovered YAML by removing broken lines")
                    return data
            except yaml.YAMLError:
                pass

        # Strategy 1: Find type boundaries and try parsing up to each one
        # Type entries in the YAML are "  - name: ..." at 4-space indent under types:
        lines = cleaned.split("\n")
        type_starts = []
        for i, line in enumerate(lines):
            if re.match(r'^  - name:\s', line) or re.match(r'^    - name:\s', line):
                type_starts.append(i)

        if len(type_starts) >= 2:
            # Try parsing up to the last N type boundaries (from most to fewest types)
            for end_idx in reversed(type_starts[1:]):  # Skip first, need at least 1 type
                truncated = "\n".join(lines[:end_idx])
                try:
                    data = yaml.safe_load(truncated)
                    if isinstance(data, dict) and data.get("types") and len(data["types"]) > 0:
                        self._fix_yaml_types(data)
                        self._log(f"  recovered at type boundary (line {end_idx}, {len(data['types'])} types)")
                        return data
                except yaml.YAMLError:
                    continue

        # Strategy 2: Progressive end-truncation
        max_cut = min(len(lines) - 1, 200)
        for cut in range(1, max_cut):
            truncated = "\n".join(lines[:-cut])
            try:
                data = yaml.safe_load(truncated)
                if isinstance(data, dict) and data.get("types") and len(data["types"]) > 0:
                    self._fix_yaml_types(data)
                    self._log(f"  recovered truncated YAML (cut {cut} lines, {len(data['types'])} types)")
                    return data
            except yaml.YAMLError:
                continue

        self._log(f"  yaml: all recovery attempts failed ({len(lines)} lines, tried {max_cut} cuts)")
        return None

    def _fix_yaml_types(self, data: dict):
        """Fix values that YAML parsed incorrectly (bool instead of string).

        YAML parses 'type: boolean' as True, 'type: true' as True, etc.
        Walk the data tree and convert non-string values back to strings
        where they should be strings (type, sig, hint, description fields).
        """
        str_fields = {'type', 'sig', 'hint', 'description', 'default', 'name', 'kind'}

        def fix_dict(d):
            if not isinstance(d, dict):
                return
            for key, val in d.items():
                if key in str_fields and not isinstance(val, str):
                    if isinstance(val, bool):
                        d[key] = 'boolean' if val else 'false'
                    elif val is None:
                        d[key] = ''
                    else:
                        d[key] = str(val)
                elif isinstance(val, dict):
                    fix_dict(val)
                elif isinstance(val, list):
                    for item in val:
                        if isinstance(item, dict):
                            fix_dict(item)

        fix_dict(data)
        # Also fix items in 'types', 'fields', 'methods' lists
        for key in ('types', 'fields', 'methods'):
            items = data.get(key, [])
            if isinstance(items, list):
                for item in items:
                    if isinstance(item, dict):
                        fix_dict(item)

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

    def _strip_code_fences(self, text: str) -> str:
        """Strip markdown code fences from TypeScript/code output.

        Unlike _strip_fences, this does NOT apply YAML heuristics.
        It only removes ```lang and ``` fence lines.
        """
        text = text.strip()
        if '```' not in text:
            return text
        lines = text.split('\n')
        content_lines = [
            line for line in lines
            if not re.match(r'^\s*```\w*\s*$', line)
        ]
        return '\n'.join(content_lines).strip()

    def _fix_orphaned_class_body(self, code: str, type_bp, module_bp) -> str:
        """Fix code that is a bare class body without class declaration.

        LLM sometimes generates just the class internals (private fields,
        constructor, methods) without the wrapping class/interface declaration
        and imports. Detect this and wrap it.
        """
        lines = code.strip().split('\n')
        if not lines:
            return code

        first_line = lines[0].strip()
        is_orphaned = (
            first_line.startswith('private ') or
            first_line.startswith('public ') or
            first_line.startswith('protected ') or
            first_line.startswith('readonly ') or
            (first_line.startswith('constructor(') and not any(
                l.strip().startswith('export class') or l.strip().startswith('class ')
                for l in lines
            ))
        )

        if not is_orphaned:
            return code

        kind = type_bp.kind if hasattr(type_bp, 'kind') else 'class'
        name = type_bp.name if hasattr(type_bp, 'name') else 'Unknown'

        import_lines = []
        if hasattr(module_bp, 'types'):
            for t in module_bp.types:
                if t.name != name and t.name in code:
                    file_name = to_kebab_case(t.name)
                    import_lines.append(f"import {{ {t.name} }} from './{file_name}';")

        if hasattr(self, 'prior_modules') and self.prior_modules:
            for mod_name, mod_types in self.prior_modules.items():
                for t in mod_types:
                    type_name = t if isinstance(t, str) else getattr(t, 'name', '')
                    if type_name and type_name in code and type_name != name:
                        import_lines.append(
                            f"import {{ {type_name} }} from '../{mod_name}';")

        import_lines = list(dict.fromkeys(import_lines))

        imports = '\n'.join(import_lines)
        if imports:
            imports += '\n\n'

        indented_body = '\n'.join('  ' + l if l.strip() else '' for l in lines)

        if kind == 'interface':
            wrapped = f"{imports}export interface {name} {{\n{indented_body}\n}}\n"
        else:
            wrapped = f"{imports}export class {name} {{\n{indented_body}\n}}\n"

        self._log(f"  fixed orphaned class body for {name}")
        return wrapped
