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

from ..llm.providers import LLMProvider, LLMMessage
from .. import OUT_DIR

from .blueprint import ModuleBlueprint, TypeBlueprint


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
9. Make the code complete and runnable — someone should be able to import it directly."""

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

    def __init__(self, llm: LLMProvider, out_dir: Path = None, verbose: bool = False):
        self.llm = llm
        self.out_dir = out_dir or OUT_DIR
        self.verbose = verbose
        self.total_tokens = 0

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
                self.out_dir / ref_path.replace("/", "/", 1),
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
                       project_dir: Path) -> tuple[str, int]:
        """Translate ONE type from blueprint to code. Self-contained call.

        Returns (relative_file_path, tokens_used).
        """
        self._log(f"translating {type_bp.name} [{type_bp.kind}]...")

        # 1. Load references from disk (fresh, not accumulated)
        all_refs = list(set(type_bp.references + module_bp.references))
        ref_context = self.load_references(all_refs)

        # 2. Serialize this type's blueprint to YAML
        bp_yaml = module_bp.type_to_yaml(type_bp.name)

        # 3. Build user prompt
        user = f"## Blueprint to translate\n```yaml\n{bp_yaml}```\n\n"
        user += f"## Module context\n"
        user += f"Language: {module_bp.language}\n"
        user += f"Module: {module_bp.name}\n"
        if module_bp.constraints:
            user += f"Constraints:\n"
            for c in module_bp.constraints:
                user += f"  - {c}\n"

        # List other types in the module for import awareness
        other_types = [t.name for t in module_bp.types if t.name != type_bp.name]
        if other_types:
            user += f"Other types in this module: {', '.join(other_types)}\n"

        if ref_context:
            user += f"\n{ref_context}\n"

        # 4. LLM call — all token budget for this one type
        code, tokens = self._llm_call(TRANSLATE_SYSTEM, user, max_tokens=6000)

        # 5. Clean output (strip markdown fences if present)
        clean = self._strip_fences(code)

        # 6. Write to disk
        target = type_bp.target_file or f"{module_bp.target_dir}/{type_bp.name.lower()}.ts"
        full_path = project_dir / target
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(clean + "\n")

        # 7. Mark as translated
        type_bp.status = "translated"

        self._log(f"  wrote {target} ({len(clean)} chars, {tokens} tokens)")
        return (target, tokens)

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
                 "Include ALL valuable methods from references.")

        content, tokens = self._llm_call(BLUEPRINT_SYSTEM, user,
                                         temperature=0.3, max_tokens=4096)

        # Parse the generated YAML
        clean = self._strip_fences(content)
        try:
            import yaml
            data = yaml.safe_load(clean)
            bp = ModuleBlueprint(
                name=data.get("name", module_name),
                language=data.get("language", language),
                target_dir=data.get("target_dir", target_dir or f"src/{module_name}"),
                types=[TypeBlueprint.from_dict(t) for t in data.get("types", [])],
                constraints=data.get("constraints", []),
                references=ref_paths,
                description=data.get("description", ""),
            )
        except Exception as e:
            self._log(f"  blueprint parse failed: {e}, creating minimal")
            bp = ModuleBlueprint(
                name=module_name,
                language=language,
                target_dir=target_dir or f"src/{module_name}",
                references=ref_paths,
            )

        self._log(f"  generated blueprint: {len(bp.types)} types, "
                  f"{sum(len(t.methods) for t in bp.types)} methods")
        return (bp, tokens)

    # ── Helpers ──────────────────────────────────────────────

    def _strip_fences(self, text: str) -> str:
        """Remove markdown code fences from LLM output."""
        text = text.strip()
        # Remove opening fence: ```typescript or ```yaml etc
        text = re.sub(r'^```\w*\s*\n?', '', text)
        # Remove closing fence
        text = re.sub(r'\n?```\s*$', '', text)
        return text.strip()
