#!/usr/bin/env python3
"""
synth.py — Cross-project synthesis engine for Roska descriptors.

Reads YAML descriptors from multiple projects, extracts metrics,
and generates comparison reports with architectural insights.

Usage:
    python synth.py <out_dir> <project1> <project2> ...
    python synth.py <out_dir> --all
    python synth.py <out_dir> --all --format md
    python synth.py <out_dir> --all --llm          # requires GROQ_API_KEY
"""

import sys
import os
import json
import time
import argparse
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional


# ── Data model ────────────────────────────────────────────────────

@dataclass
class TypeInfo:
    name: str
    kind: str  # class, interface, enum, struct, etc.
    methods: int = 0
    fields: int = 0
    bases: list = field(default_factory=list)
    file: str = ""


@dataclass
class FuncInfo:
    name: str
    is_async: bool = False
    visibility: str = "public"
    calls: list = field(default_factory=list)
    file: str = ""


@dataclass
class ModuleProfile:
    name: str
    files: int = 0
    lines: int = 0
    types: int = 0
    functions: int = 0
    imports: int = 0
    exports: int = 0


@dataclass
class ProjectProfile:
    name: str
    lang: str = "unknown"
    total_files: int = 0
    total_lines: int = 0
    modules: list = field(default_factory=list)  # list[ModuleProfile]
    top_types: list = field(default_factory=list)  # list[TypeInfo]
    top_functions: list = field(default_factory=list)  # list[FuncInfo]
    patterns: list = field(default_factory=list)
    yaml_count: int = 0
    descriptor_size_kb: int = 0


# ── YAML parsing (lightweight, no pyyaml needed) ─────────────────

def parse_yaml_value(line: str) -> str:
    """Extract value from a YAML line like 'key: value'."""
    if ":" not in line:
        return line.strip()
    return line.split(":", 1)[1].strip()


def parse_workspace(ws_path: Path) -> dict:
    """Parse workspace.yaml into a dict."""
    result = {"name": "", "total_files": 0, "total_lines": 0, "modules": []}
    if not ws_path.exists():
        return result

    text = ws_path.read_text()
    current_module = None

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped.startswith("name:") and current_module is None:
            result["name"] = parse_yaml_value(stripped)
        elif stripped.startswith("total_files:"):
            result["total_files"] = int(parse_yaml_value(stripped))
        elif stripped.startswith("total_lines:"):
            if current_module is None:
                result["total_lines"] = int(parse_yaml_value(stripped))
            else:
                current_module["lines"] = int(parse_yaml_value(stripped))
        elif stripped.startswith("- name:"):
            current_module = {
                "name": parse_yaml_value(stripped.replace("- ", "", 1)),
                "files": 0, "lines": 0, "types": 0, "functions": 0,
            }
            result["modules"].append(current_module)
        elif current_module:
            if stripped.startswith("files:"):
                current_module["files"] = int(parse_yaml_value(stripped))
            elif stripped.startswith("lines:"):
                current_module["lines"] = int(parse_yaml_value(stripped))
            elif stripped.startswith("types:"):
                current_module["types"] = int(parse_yaml_value(stripped))
            elif stripped.startswith("functions:"):
                current_module["functions"] = int(parse_yaml_value(stripped))

    return result


def parse_file_descriptor(path: Path) -> dict:
    """Parse a file descriptor YAML for types, functions, imports."""
    result = {"types": [], "functions": [], "imports": [], "file": "", "lines": 0}
    if not path.exists():
        return result

    text = path.read_text()
    current_section = None
    current_item = None

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped.startswith("file:"):
            result["file"] = parse_yaml_value(stripped)
        elif stripped.startswith("lines:") and current_item is None:
            val = parse_yaml_value(stripped)
            try:
                result["lines"] = int(val)
            except (ValueError, TypeError):
                pass

        # Detect type entries
        if stripped.startswith("- name:") and current_section == "types":
            name = parse_yaml_value(stripped.replace("- ", "", 1))
            current_item = {"name": name, "kind": "", "methods": 0, "fields": 0, "bases": []}
            result["types"].append(current_item)
        elif stripped.startswith("- name:") and current_section == "functions":
            name = parse_yaml_value(stripped.replace("- ", "", 1))
            current_item = {"name": name, "is_async": False, "calls": [], "vis": "public"}
            result["functions"].append(current_item)

        # Section detection
        if stripped == "types:" or stripped.startswith("types:"):
            current_section = "types"
            current_item = None
        elif stripped == "functions:" or stripped.startswith("functions:"):
            current_section = "functions"
            current_item = None
        elif stripped == "imports:" or stripped.startswith("imports:"):
            current_section = "imports"
            current_item = None

        # Parse current item fields
        if current_item and current_section == "types":
            if stripped.startswith("kind:"):
                current_item["kind"] = parse_yaml_value(stripped)
            elif stripped.startswith("methods:"):
                try:
                    current_item["methods"] = int(parse_yaml_value(stripped))
                except ValueError:
                    pass
            elif stripped.startswith("fields:"):
                try:
                    current_item["fields"] = int(parse_yaml_value(stripped))
                except ValueError:
                    pass
        elif current_item and current_section == "functions":
            if stripped.startswith("async:"):
                current_item["is_async"] = parse_yaml_value(stripped).lower() == "true"
            elif stripped.startswith("vis:"):
                current_item["vis"] = parse_yaml_value(stripped)

        # Count imports
        if current_section == "imports" and stripped.startswith("- "):
            result["imports"].append(stripped[2:])

    return result


# ── Profile builder ───────────────────────────────────────────────

def build_profile(name: str, out_dir: Path) -> ProjectProfile:
    """Build a complete project profile from its descriptor directory."""
    project_dir = out_dir / name
    if not project_dir.is_dir():
        return ProjectProfile(name=name)

    # Parse workspace
    ws = parse_workspace(project_dir / "workspace.yaml")

    # Detect language
    py_count = len(list(project_dir.rglob("*.yaml")))
    lang = "unknown"
    # Check file extensions in descriptor content
    for fy in project_dir.rglob("*.yaml"):
        content = fy.read_text(errors="replace")[:500]
        if ".py" in content:
            lang = "python"
            break
        elif ".ts" in content or ".tsx" in content:
            lang = "typescript"
            break

    # Build module profiles
    modules = []
    for m in ws.get("modules", []):
        modules.append(ModuleProfile(
            name=m["name"],
            files=m.get("files", 0),
            lines=m.get("lines", 0),
            types=m.get("types", 0),
            functions=m.get("functions", 0),
        ))

    # Scan file descriptors for top types and functions
    all_types = []
    all_functions = []
    total_imports = 0

    # Only scan a subset to keep it fast
    file_yamls = sorted(project_dir.rglob("*.yaml"))
    scanned = 0
    for fy in file_yamls:
        if fy.name in ("workspace.yaml", "module.yaml", "meta.yaml", "deps.yaml"):
            continue
        if "graphs" in str(fy):
            continue
        if scanned > 200:  # cap scanning
            break

        fd = parse_file_descriptor(fy)
        scanned += 1

        for t in fd["types"]:
            all_types.append(TypeInfo(
                name=t["name"], kind=t.get("kind", ""),
                methods=t.get("methods", 0), fields=t.get("fields", 0),
                bases=t.get("bases", []), file=fd.get("file", ""),
            ))
        for f in fd["functions"]:
            all_functions.append(FuncInfo(
                name=f["name"], is_async=f.get("is_async", False),
                visibility=f.get("vis", "public"),
                calls=f.get("calls", []), file=fd.get("file", ""),
            ))
        total_imports += len(fd.get("imports", []))

    # Sort by complexity (methods+fields for types, calls for functions)
    all_types.sort(key=lambda t: -(t.methods + t.fields))
    all_functions.sort(key=lambda f: -len(f.calls))

    # Detect architectural patterns
    patterns = detect_patterns(name, modules, all_types, all_functions)

    # Descriptor stats
    yaml_count = len(file_yamls)
    total_size = sum(f.stat().st_size for f in project_dir.rglob("*") if f.is_file())

    return ProjectProfile(
        name=name,
        lang=lang,
        total_files=ws.get("total_files", 0),
        total_lines=ws.get("total_lines", 0),
        modules=modules,
        top_types=all_types[:20],
        top_functions=all_functions[:20],
        patterns=patterns,
        yaml_count=yaml_count,
        descriptor_size_kb=total_size // 1024,
    )


def detect_patterns(name: str, modules: list, types: list, funcs: list) -> list:
    """Detect architectural patterns from the profile data."""
    patterns = []

    # Module naming patterns
    mod_names = {m.name.lower() for m in modules}

    if "agent" in " ".join(mod_names) or any("agent" in t.name.lower() for t in types):
        patterns.append("agent-based")
    if any(n in mod_names for n in ("tools", "tool")):
        patterns.append("tool-use")
    if any(n in mod_names for n in ("memory", "store", "storage")):
        patterns.append("memory/state")
    if any(n in mod_names for n in ("flow", "workflow", "graph", "pipeline")):
        patterns.append("workflow/graph")
    if any(n in mod_names for n in ("llm", "model", "models")):
        patterns.append("multi-model")
    if any(n in mod_names for n in ("api", "server", "http")):
        patterns.append("api-server")
    if any(n in mod_names for n in ("tests", "test", "e2e-tests")):
        patterns.append("tested")
    if any(n in mod_names for n in ("examples", "example")):
        patterns.append("examples-included")
    if any(n in mod_names for n in ("docs", "doc")):
        patterns.append("documented")

    # Type patterns
    type_names_lower = [t.name.lower() for t in types]
    if any("task" in n for n in type_names_lower):
        patterns.append("task-oriented")
    if any("crew" in n or "team" in n for n in type_names_lower):
        patterns.append("multi-agent")
    if any("plugin" in n or "extension" in n for n in type_names_lower):
        patterns.append("plugin-system")
    if any("event" in n or "listener" in n or "handler" in n for n in type_names_lower):
        patterns.append("event-driven")

    # Async patterns
    async_count = sum(1 for f in funcs if f.is_async)
    if async_count > len(funcs) * 0.3 and len(funcs) > 5:
        patterns.append("async-heavy")

    return list(set(patterns))


# ── Report generation ─────────────────────────────────────────────

def generate_report(profiles: list[ProjectProfile], format: str = "text") -> str:
    """Generate a comparative synthesis report."""
    if format == "md":
        return generate_markdown_report(profiles)
    return generate_text_report(profiles)


def generate_text_report(profiles: list[ProjectProfile]) -> str:
    """Generate a text comparison report."""
    lines = []
    lines.append("=" * 80)
    lines.append("  ROSKA SYNTHESIS REPORT — AI Agent Framework Comparison")
    lines.append("=" * 80)
    lines.append("")

    # ── Overview table
    lines.append("┌─ OVERVIEW ─────────────────────────────────────────────────────────────────┐")
    lines.append(f"│ {'Project':<16} {'Lang':<6} {'Files':>7} {'Lines':>10} {'Modules':>8} {'Types':>7} {'Funcs':>7} │")
    lines.append("│" + "─" * 76 + "│")

    for p in sorted(profiles, key=lambda x: -x.total_lines):
        total_types = sum(m.types for m in p.modules)
        total_funcs = sum(m.functions for m in p.modules)
        lang = p.lang[:5]
        lines.append(
            f"│ {p.name:<16} {lang:<6} {p.total_files:>7,} {p.total_lines:>10,} "
            f"{len(p.modules):>8} {total_types:>7} {total_funcs:>7} │"
        )
    lines.append("└" + "─" * 76 + "┘")
    lines.append("")

    # ── Size comparison
    lines.append("┌─ SCALE RANKING ────────────────────────────────────────────────────────────┐")
    sorted_by_lines = sorted(profiles, key=lambda x: -x.total_lines)
    for i, p in enumerate(sorted_by_lines, 1):
        bar_len = int(50 * p.total_lines / sorted_by_lines[0].total_lines) if sorted_by_lines[0].total_lines else 0
        bar = "█" * bar_len
        lines.append(f"│ {i}. {p.name:<14} {p.total_lines:>10,} LOC  {bar}")
    lines.append("└" + "─" * 76 + "┘")
    lines.append("")

    # ── Patterns detected
    lines.append("┌─ ARCHITECTURAL PATTERNS ──────────────────────────────────────────────────┐")
    for p in profiles:
        pats = ", ".join(p.patterns) if p.patterns else "(none detected)"
        lines.append(f"│ {p.name:<16} {pats}")
    lines.append("└" + "─" * 76 + "┘")
    lines.append("")

    # ── Top types per project
    lines.append("┌─ KEY TYPES (by complexity: methods+fields) ────────────────────────────────┐")
    for p in profiles:
        if not p.top_types:
            continue
        lines.append(f"│")
        lines.append(f"│ {p.name} ({p.lang})")
        lines.append(f"│ {'─' * 70}")
        for t in p.top_types[:5]:
            kind_str = f"[{t.kind}]" if t.kind else ""
            lines.append(
                f"│   {t.name:<35} {kind_str:<15} "
                f"methods={t.methods:<3} fields={t.fields}"
            )
    lines.append("└" + "─" * 76 + "┘")
    lines.append("")

    # ── Module structure comparison
    lines.append("┌─ MODULE STRUCTURE ────────────────────────────────────────────────────────┐")
    for p in profiles:
        active_mods = [m for m in p.modules if m.lines > 0]
        if not active_mods:
            continue
        lines.append(f"│")
        lines.append(f"│ {p.name} — {len(active_mods)} active modules")
        sorted_mods = sorted(active_mods, key=lambda m: -m.lines)
        for m in sorted_mods[:8]:
            pct = m.lines / p.total_lines * 100 if p.total_lines else 0
            bar = "█" * int(pct / 2)
            lines.append(f"│   {m.name:<25} {m.lines:>8,} LOC ({pct:>5.1f}%) {bar}")
    lines.append("└" + "─" * 76 + "┘")
    lines.append("")

    # ── Comparative insights
    lines.append("┌─ COMPARATIVE INSIGHTS ────────────────────────────────────────────────────┐")
    lines.append("│")

    # Complexity ratio
    for p in sorted(profiles, key=lambda x: -x.total_lines):
        total_types = sum(m.types for m in p.modules)
        total_funcs = sum(m.functions for m in p.modules)
        if p.total_lines > 0:
            density = (total_types + total_funcs) / (p.total_lines / 1000)
            lines.append(f"│ {p.name:<16} code density: {density:.1f} symbols/KLOC")

    lines.append("│")

    # Pattern coverage matrix
    all_patterns = set()
    for p in profiles:
        all_patterns.update(p.patterns)
    if all_patterns:
        lines.append(f"│ Pattern coverage:")
        for pat in sorted(all_patterns):
            projects_with = [p.name for p in profiles if pat in p.patterns]
            lines.append(f"│   {pat:<20} → {', '.join(projects_with)}")

    lines.append("│")

    # Smallest vs largest
    smallest = min(profiles, key=lambda p: p.total_lines)
    largest = max(profiles, key=lambda p: p.total_lines)
    if largest.total_lines > 0:
        ratio = largest.total_lines / max(smallest.total_lines, 1)
        lines.append(f"│ Size range: {smallest.name} ({smallest.total_lines:,} LOC) → "
                     f"{largest.name} ({largest.total_lines:,} LOC) [{ratio:.0f}x]")

    lines.append("│")
    lines.append("└" + "─" * 76 + "┘")
    lines.append("")

    # ── Descriptor stats
    lines.append("┌─ ROSKA DESCRIPTOR STATS ──────────────────────────────────────────────────┐")
    lines.append(f"│ {'Project':<16} {'YAML files':>12} {'Size (KB)':>12}")
    lines.append("│" + "─" * 44)
    for p in profiles:
        lines.append(f"│ {p.name:<16} {p.yaml_count:>12,} {p.descriptor_size_kb:>12,}")
    total_yaml = sum(p.yaml_count for p in profiles)
    total_kb = sum(p.descriptor_size_kb for p in profiles)
    lines.append("│" + "─" * 44)
    lines.append(f"│ {'TOTAL':<16} {total_yaml:>12,} {total_kb:>12,}")
    lines.append("└" + "─" * 76 + "┘")

    return "\n".join(lines)


def generate_markdown_report(profiles: list[ProjectProfile]) -> str:
    """Generate a markdown comparison report."""
    lines = []
    lines.append("# Roska Synthesis Report — AI Agent Framework Comparison\n")
    lines.append(f"*Generated: {time.strftime('%Y-%m-%d %H:%M')}*\n")

    # Overview table
    lines.append("## Overview\n")
    lines.append("| Project | Language | Files | Lines | Modules | Types | Functions |")
    lines.append("|---------|----------|------:|------:|--------:|------:|----------:|")
    for p in sorted(profiles, key=lambda x: -x.total_lines):
        total_types = sum(m.types for m in p.modules)
        total_funcs = sum(m.functions for m in p.modules)
        lines.append(
            f"| **{p.name}** | {p.lang} | {p.total_files:,} | {p.total_lines:,} | "
            f"{len(p.modules)} | {total_types} | {total_funcs} |"
        )
    lines.append("")

    # Patterns
    lines.append("## Architectural Patterns\n")
    for p in profiles:
        pats = ", ".join(f"`{pat}`" for pat in p.patterns) if p.patterns else "*(none detected)*"
        lines.append(f"- **{p.name}**: {pats}")
    lines.append("")

    # Key types
    lines.append("## Key Types (by complexity)\n")
    for p in profiles:
        if not p.top_types:
            continue
        lines.append(f"### {p.name}\n")
        lines.append("| Type | Kind | Methods | Fields |")
        lines.append("|------|------|--------:|-------:|")
        for t in p.top_types[:8]:
            lines.append(f"| `{t.name}` | {t.kind} | {t.methods} | {t.fields} |")
        lines.append("")

    # Module structure
    lines.append("## Module Structure\n")
    for p in profiles:
        active_mods = [m for m in p.modules if m.lines > 0]
        if not active_mods:
            continue
        lines.append(f"### {p.name} ({len(active_mods)} modules)\n")
        lines.append("| Module | Lines | % of Total |")
        lines.append("|--------|------:|-----------:|")
        for m in sorted(active_mods, key=lambda m: -m.lines)[:10]:
            pct = m.lines / p.total_lines * 100 if p.total_lines else 0
            lines.append(f"| `{m.name}` | {m.lines:,} | {pct:.1f}% |")
        lines.append("")

    # Insights
    lines.append("## Comparative Insights\n")

    all_patterns = set()
    for p in profiles:
        all_patterns.update(p.patterns)

    if all_patterns:
        lines.append("### Pattern Coverage\n")
        lines.append("| Pattern | Projects |")
        lines.append("|---------|----------|")
        for pat in sorted(all_patterns):
            projects_with = [f"**{p.name}**" for p in profiles if pat in p.patterns]
            lines.append(f"| `{pat}` | {', '.join(projects_with)} |")
        lines.append("")

    # Code density
    lines.append("### Code Density\n")
    lines.append("| Project | Symbols/KLOC |")
    lines.append("|---------|-------------:|")
    for p in sorted(profiles, key=lambda x: -x.total_lines):
        total_types = sum(m.types for m in p.modules)
        total_funcs = sum(m.functions for m in p.modules)
        if p.total_lines > 0:
            density = (total_types + total_funcs) / (p.total_lines / 1000)
            lines.append(f"| **{p.name}** | {density:.1f} |")
    lines.append("")

    return "\n".join(lines)


# ── LLM synthesis (optional) ─────────────────────────────────────

def llm_synthesis(profiles: list[ProjectProfile], question: str = None) -> str:
    """Send profiles to LLM for deep comparative analysis."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        return "Error: GROQ_API_KEY not set. Set it for LLM-powered synthesis."

    try:
        from groq import Groq
    except ImportError:
        return "Error: groq package not installed. Run: pip install groq"

    # Build context from profiles
    context_parts = []
    for p in profiles:
        part = f"## {p.name} ({p.lang})\n"
        part += f"- Files: {p.total_files}, Lines: {p.total_lines:,}\n"
        part += f"- Modules: {len(p.modules)}\n"
        part += f"- Patterns: {', '.join(p.patterns)}\n"
        part += f"- Top types: {', '.join(t.name for t in p.top_types[:10])}\n"
        part += f"- Top functions: {', '.join(f.name for f in p.top_functions[:10])}\n"

        active_mods = sorted([m for m in p.modules if m.lines > 0], key=lambda m: -m.lines)
        part += f"- Module breakdown:\n"
        for m in active_mods[:10]:
            part += f"  - {m.name}: {m.lines:,} LOC, {m.types} types, {m.functions} funcs\n"

        context_parts.append(part)

    context = "\n".join(context_parts)

    if not question:
        question = (
            "Compare these AI agent frameworks based on the Roska descriptor profiles. "
            "Provide:\n"
            "1. Architecture comparison — how each framework structures agents\n"
            "2. Strengths and weaknesses of each\n"
            "3. Which patterns are shared vs unique\n"
            "4. Code complexity and maintainability comparison\n"
            "5. Recommendations — which to use for different scenarios\n"
            "6. What optimizations or features could each learn from the others\n"
            "Be specific and reference actual module/type/function names."
        )

    client = Groq(api_key=api_key)
    model = "moonshotai/kimi-k2-instruct-0905"

    print(f"\n[synth] Sending {len(profiles)} profiles to LLM ({model})...")
    print(f"[synth] Context: {len(context):,} chars (~{len(context)//4:,} tokens)")

    t0 = time.time()
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a senior software architect comparing multiple AI agent "
                    "frameworks. You have Roska descriptor profiles for each project — "
                    "these contain module structure, types, functions, and detected patterns. "
                    "Be concrete, reference actual names, and provide actionable insights."
                ),
            },
            {"role": "user", "content": f"## Project Profiles\n\n{context}\n\n## Task\n\n{question}"},
        ],
        temperature=0.6,
        max_completion_tokens=4096,
        stream=True,
    )

    output = []
    for chunk in completion:
        if chunk.choices and chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            output.append(content)
            print(content, end="", flush=True)

    elapsed = time.time() - t0
    print(f"\n\n[synth] Done in {elapsed:.1f}s")

    return "".join(output)


# ── Main ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Cross-project synthesis for Roska descriptors"
    )
    parser.add_argument("out_dir", help="Base output directory (e.g., ./out)")
    parser.add_argument("projects", nargs="*", help="Project names to compare")
    parser.add_argument("--all", action="store_true", help="Compare all projects in out_dir")
    parser.add_argument("--format", "-f", choices=["text", "md", "json"], default="text")
    parser.add_argument("--llm", action="store_true", help="Use LLM for deep synthesis")
    parser.add_argument("--question", "-q", help="Custom question for LLM synthesis")
    parser.add_argument("--save", "-s", help="Save report to file")

    args = parser.parse_args()
    out_dir = Path(args.out_dir)

    if not out_dir.is_dir():
        print(f"Error: {out_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    # Determine projects
    if args.all:
        project_names = [d.name for d in sorted(out_dir.iterdir()) if d.is_dir()]
    elif args.projects:
        project_names = args.projects
    else:
        print("Error: provide project names or use --all", file=sys.stderr)
        sys.exit(1)

    if len(project_names) < 2:
        print("Error: need at least 2 projects to compare", file=sys.stderr)
        sys.exit(1)

    # Build profiles
    print(f"[synth] Building profiles for {len(project_names)} projects...")
    profiles = []
    for name in project_names:
        print(f"  → {name}...", end=" ", flush=True)
        profile = build_profile(name, out_dir)
        profiles.append(profile)
        print(f"{profile.total_files} files, {profile.total_lines:,} LOC")

    # Generate report
    if args.format == "json":
        report = json.dumps(
            [
                {
                    "name": p.name,
                    "lang": p.lang,
                    "total_files": p.total_files,
                    "total_lines": p.total_lines,
                    "modules": len(p.modules),
                    "patterns": p.patterns,
                    "top_types": [{"name": t.name, "kind": t.kind, "methods": t.methods} for t in p.top_types[:10]],
                    "yaml_count": p.yaml_count,
                    "descriptor_size_kb": p.descriptor_size_kb,
                }
                for p in profiles
            ],
            indent=2,
        )
    else:
        report = generate_report(profiles, format=args.format)

    print()
    print(report)

    # Optional LLM synthesis
    if args.llm:
        print("\n" + "=" * 80)
        print("  LLM DEEP SYNTHESIS")
        print("=" * 80)
        llm_report = llm_synthesis(profiles, args.question)
        report += f"\n\n{'='*80}\nLLM DEEP SYNTHESIS\n{'='*80}\n\n{llm_report}"

    # Save if requested
    if args.save:
        ext = {"text": ".txt", "md": ".md", "json": ".json"}.get(args.format, ".txt")
        save_path = Path(args.save)
        if save_path.suffix == "":
            save_path = save_path.with_suffix(ext)
        save_path.write_text(report)
        print(f"\n[synth] Report saved to {save_path}")


if __name__ == "__main__":
    main()
