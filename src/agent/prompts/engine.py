"""
PromptEngine — assembles modular components into system prompts.

Like Cline's TemplateEngine but simpler: components are functions,
variants define which components to include and in what order,
and a budget system ensures prompts fit within token limits.

Usage:
    engine = PromptEngine()
    ctx = PromptContext(task="translate", model="kimi-k2", ...)
    system_prompt = engine.build(ctx)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, List, Optional

from .components.role import get_role
from .components.rules import get_rules
from .components.style import get_style
from .components.spec import get_spec
from .components.context import get_context
from .components.output import get_output
from .components.anti import get_anti_patterns


@dataclass
class PromptContext:
    """Everything a prompt component needs to know."""
    task: str = "translate"              # translate | blueprint | fix | expand
    model: str = ""                      # model name for variant selection
    tier: str = "standard"               # minimal | standard | verbose
    language: str = "typescript"

    # Budget
    max_system_tokens: int = 3000        # budget for system prompt
    budget_remaining: int = 3000         # decreases as components are added

    # Style
    style_hints: List[str] = field(default_factory=list)
    project_rules: str = ""              # from .ava/rules.md
    invariants: List[str] = field(default_factory=list)

    # Domain spec
    functional_spec: str = ""            # from GoalReasoner

    # Code context
    import_map: str = ""
    sibling_context: str = ""
    cross_module_context: str = ""
    reference_context: str = ""
    prior_layers: str = ""

    # File-specific
    target_file: str = ""
    module_name: str = ""
    type_name: str = ""


# Component = function(PromptContext) → str
Component = Callable[["PromptContext"], str]


@dataclass
class PromptVariant:
    """Defines which components to include and in what order."""
    name: str
    components: List[Component]
    max_system_tokens: int = 3000


# ── Variants ──────────────────────────────────────────────

VARIANT_DEFAULT = PromptVariant(
    name="default",
    components=[get_role, get_rules, get_style, get_spec, get_output, get_anti_patterns],
    max_system_tokens=3000,
)

VARIANT_LARGE = PromptVariant(
    name="large",
    components=[get_role, get_rules, get_style, get_spec, get_output, get_anti_patterns],
    max_system_tokens=4000,
)

VARIANT_MINIMAL = PromptVariant(
    name="minimal",
    components=[get_role, get_rules, get_output],
    max_system_tokens=1500,
)

# Model → variant mapping
VARIANT_MAP: Dict[str, PromptVariant] = {
    # Large context models
    "claude": VARIANT_LARGE,
    "gpt-4": VARIANT_LARGE,
    "gpt-5": VARIANT_LARGE,
    # Small/local models
    "llama-3-8b": VARIANT_MINIMAL,
    "phi-3": VARIANT_MINIMAL,
    "gemma": VARIANT_MINIMAL,
}


class PromptEngine:
    """Assembles modular prompts within budget constraints.

    Like Cline's TemplateEngine but for code generation:
    - Components are functions, not templates
    - Budget management prioritizes critical rules
    - Variants adapt to model capabilities
    """

    def __init__(self, project_dir: Optional[Path] = None):
        self.project_dir = project_dir
        self._project_rules_cache: Optional[str] = None

    def build(self, ctx: PromptContext) -> str:
        """Assemble system prompt from components within budget."""
        variant = self._select_variant(ctx)
        ctx.max_system_tokens = variant.max_system_tokens
        ctx.budget_remaining = variant.max_system_tokens

        # Set tier based on variant
        if variant.name == "minimal":
            ctx.tier = "minimal"
        elif variant.name == "large":
            ctx.tier = "verbose"

        # Load project rules if available
        if not ctx.project_rules and self.project_dir:
            ctx.project_rules = self._load_project_rules()

        # Assemble components
        sections = []
        for component in variant.components:
            section = component(ctx)
            if not section:
                continue

            # Estimate tokens (~4 chars per token)
            estimated_tokens = len(section) // 4
            if estimated_tokens > ctx.budget_remaining:
                # Truncate to fit
                max_chars = ctx.budget_remaining * 4
                section = section[:max_chars] + "\n..."
                estimated_tokens = ctx.budget_remaining

            sections.append(section)
            ctx.budget_remaining -= estimated_tokens

            if ctx.budget_remaining <= 0:
                break

        return "\n\n".join(sections)

    def build_user(self, ctx: PromptContext, blueprint_yaml: str = "",
                   code: str = "", extra: str = "") -> str:
        """Assemble user prompt with code context within budget."""
        parts = []

        if blueprint_yaml:
            parts.append(f"## Blueprint to translate\n```yaml\n{blueprint_yaml}\n```")

        if code:
            parts.append(f"## Current code\n```typescript\n{code}\n```")

        # Context component (imports, siblings, cross-module)
        context_section = get_context(ctx)
        if context_section:
            parts.append(context_section)

        if extra:
            parts.append(extra)

        return "\n\n".join(parts)

    def _select_variant(self, ctx: PromptContext) -> PromptVariant:
        """Select variant based on model name."""
        model_lower = ctx.model.lower()
        for key, variant in VARIANT_MAP.items():
            if key in model_lower:
                return variant
        return VARIANT_DEFAULT

    def _load_project_rules(self) -> str:
        """Load .ava/rules.md from project directory."""
        if self._project_rules_cache is not None:
            return self._project_rules_cache

        self._project_rules_cache = ""
        if not self.project_dir:
            return ""

        # Check for .ava/rules.md (like Codex's AGENTS.md)
        rules_path = self.project_dir / ".ava" / "rules.md"
        if rules_path.exists():
            try:
                self._project_rules_cache = rules_path.read_text()[:2000]
            except Exception:
                pass

        # Also check ava.md in project root
        ava_md = self.project_dir / "ava.md"
        if ava_md.exists():
            try:
                content = ava_md.read_text()[:2000]
                if self._project_rules_cache:
                    self._project_rules_cache += "\n\n" + content
                else:
                    self._project_rules_cache = content
            except Exception:
                pass

        return self._project_rules_cache

    @staticmethod
    def for_task(task: str, **kwargs) -> PromptContext:
        """Convenience factory for common task contexts."""
        return PromptContext(task=task, **kwargs)
