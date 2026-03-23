"""
Compaction — context-aware blueprint compression for large modules.

When a ModuleBlueprint has many types, the full YAML exceeds token limits.
Compaction provides each implement block with:
  - FULL detail for the target type (all methods, hints, constraints)
  - COMPACT summaries of sibling types (name + method signatures only)
  - PRIORITIZED ordering: siblings referenced in the target's signatures first

This enables blueprints with 50+ types without context overflow.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from .blueprint import TypeBlueprint, ModuleBlueprint, MethodSpec


@dataclass
class CompactedContext:
    """Result of compacting a module blueprint for one target type."""
    full_type_yaml: str          # complete YAML for target type
    sibling_summary: str         # compact summaries of other types
    prioritized_types: list[str] # names in priority order
    estimated_tokens: int        # rough token estimate (chars / 4)


def needs_compaction(module_bp: ModuleBlueprint, token_limit: int = 4000) -> bool:
    """Does this module blueprint need compaction?

    Estimates tokens from total method+field count across all types.
    """
    total_items = sum(
        len(t.methods) + len(t.static_members) + len(t.fields)
        for t in module_bp.types
    )
    # ~15 tokens per method (name + sig + hint), ~8 per field
    estimated = total_items * 12
    return estimated > token_limit


def compact_type_summary(type_bp: TypeBlueprint) -> str:
    """Compact a type to a single-line summary for sibling awareness.

    Format: "Vec3 [class]: add(Vec3):Vec3, sub(Vec3):Vec3, dot(Vec3):number, ..."
    """
    parts = []
    for m in type_bp.methods:
        if m.sig:
            parts.append(f"{m.name}{m.sig}")
        else:
            parts.append(m.name)

    for m in type_bp.static_members:
        prefix = "static "
        if m.sig:
            parts.append(f"{prefix}{m.name}{m.sig}")
        else:
            parts.append(f"{prefix}{m.name}")

    fields_str = ""
    if type_bp.fields:
        field_parts = []
        for f in type_bp.fields:
            if f.type:
                field_parts.append(f"{f.name}: {f.type}")
            else:
                field_parts.append(f.name)
        fields_str = f" fields=[{', '.join(field_parts)}]"

    extends_str = f" extends {type_bp.extends}" if type_bp.extends else ""
    methods_str = ", ".join(parts) if parts else "none"

    return f"{type_bp.name} [{type_bp.kind}]{extends_str}{fields_str}: {methods_str}"


def _extract_type_references(type_bp: TypeBlueprint) -> set[str]:
    """Find type names referenced in a type's method signatures and fields.

    Scans signatures like "(r: Quat, t: Vec3): Mat4" for type names.
    """
    refs = set()
    # Scan method signatures
    for m in type_bp.methods + type_bp.static_members:
        if m.sig:
            # Extract words that look like type names (capitalized)
            for word in m.sig.replace("(", " ").replace(")", " ").replace(
                    ",", " ").replace(":", " ").replace("[]", "").split():
                if word and word[0].isupper() and word.isalnum():
                    refs.add(word)
    # Scan field types
    for f in type_bp.fields:
        if f.type:
            for word in f.type.replace("[]", "").replace("<", " ").replace(
                    ">", " ").split():
                if word and word[0].isupper() and word.isalnum():
                    refs.add(word)
    # Remove self-reference
    refs.discard(type_bp.name)
    return refs


def prepare_translation_context(
    target: TypeBlueprint,
    module: ModuleBlueprint,
    token_budget: int = 2000,
) -> CompactedContext:
    """Prepare compacted context for translating one type from a large module.

    Returns full YAML for the target type plus compact summaries of siblings,
    prioritized by whether the target references them.
    """
    import yaml

    # 1. Full YAML for target type
    full_yaml = yaml.dump(target.to_dict(), default_flow_style=False,
                          allow_unicode=True, sort_keys=False, width=120)
    full_tokens = len(full_yaml) // 4

    # 2. Find which siblings the target references
    referenced_types = _extract_type_references(target)

    # 3. Split siblings into prioritized (referenced) and rest
    siblings = [t for t in module.types if t.name != target.name]
    prioritized = []
    rest = []
    for s in siblings:
        if s.name in referenced_types:
            prioritized.append(s)
        else:
            rest.append(s)

    # 4. Compact summaries within budget
    remaining_budget = (token_budget - full_tokens) * 4  # back to chars
    if remaining_budget < 100:
        remaining_budget = 400  # minimum for at least a few summaries

    summary_lines = []
    priority_names = []

    # Prioritized siblings first
    for s in prioritized + rest:
        line = compact_type_summary(s)
        if len(line) > remaining_budget:
            # Truncate method list
            line = line[:remaining_budget - 3] + "..."
        summary_lines.append(line)
        if s in prioritized:
            priority_names.append(s.name)
        remaining_budget -= len(line) + 1  # +1 for newline
        if remaining_budget <= 0:
            break

    sibling_summary = "\n".join(summary_lines)
    total_chars = len(full_yaml) + len(sibling_summary)

    return CompactedContext(
        full_type_yaml=full_yaml,
        sibling_summary=sibling_summary,
        prioritized_types=priority_names,
        estimated_tokens=total_chars // 4,
    )


# ── Layer-level compaction ──────────────────────────────────

def compact_type_oneliner(type_bp: TypeBlueprint) -> str:
    """Ultra-compact type summary: Name(fields, methods). ~30-50 chars.

    Example: "Mat4(data:Float32Array,mul,setTRS,perspective,lookAt,invert)"
    """
    parts = []
    # Key fields (max 3)
    for f in type_bp.fields[:3]:
        if f.type:
            parts.append(f"{f.name}:{f.type}")
        else:
            parts.append(f.name)
    # Method names only (no sigs, no hints)
    for m in type_bp.methods:
        parts.append(m.name)
    for m in type_bp.static_members[:5]:
        parts.append(m.name)
    # Truncate to keep it short
    inner = ",".join(parts)
    if len(inner) > 120:
        inner = inner[:117] + "..."
    extends = f" extends {type_bp.extends}" if type_bp.extends else ""
    return f"{type_bp.name}({inner}){extends}"


def compact_layer_summary(module_bp: ModuleBlueprint, max_chars: int = 500) -> str:
    """Compact an entire translated module to a one-line-per-type summary.

    Used when injecting prior layer context. Minimal footprint.
    Example output:
      math: Vec3(x,y,z,add,sub,cross,normalize,length,lerp),
            Mat4(data:Float32Array,mul,setTRS,perspective,lookAt,invert),
            Quat(x,y,z,w,slerp,setFromEulerAngles,transformVector)
    """
    type_summaries = []
    used = 0
    for t in module_bp.types:
        if t.status != "translated":
            continue
        line = compact_type_oneliner(t)
        if used + len(line) + 2 > max_chars:
            break
        type_summaries.append(line)
        used += len(line) + 2  # +2 for ", "
    return f"{module_bp.name}: {', '.join(type_summaries)}"


def build_prior_layers_context(
    translated_blueprints: list[ModuleBlueprint],
    max_chars: int = 3000,
) -> str:
    """Build AVAILABLE FROM PRIOR LAYERS context from already-translated blueprints.

    Returns compact multi-line string, one line per module.
    Budget: ~300-500 chars per module, total max_chars.
    """
    if not translated_blueprints:
        return ""

    lines = []
    budget_per = max_chars // max(len(translated_blueprints), 1)
    used = 0

    for bp in translated_blueprints:
        remaining = max_chars - used
        per_module = min(budget_per, remaining)
        if per_module < 50:
            break
        line = compact_layer_summary(bp, max_chars=per_module)
        lines.append(f"  {line}")
        used += len(line) + 3

    if not lines:
        return ""
    return "AVAILABLE FROM PRIOR LAYERS:\n" + "\n".join(lines)
