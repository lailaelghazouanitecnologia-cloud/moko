#!/usr/bin/env python3
"""
features.py — Feature extraction engine for Roska descriptors.

Reads YAML descriptors from a project and extracts a structured feature map:
  - Modules → top-level features
  - Types/functions within modules → sub-features
  - File breakdown per module
  - Cross-module dependency edges

Usage:
    python features.py <descriptor_dir>                     # full feature map
    python features.py <descriptor_dir> --module agent      # single module detail
    python features.py <descriptor_dir> --format json       # JSON output
    python features.py <descriptor_dir> --format md         # Markdown output

VS mode (compare two projects):
    python features.py <dir_a> --vs <dir_b>                 # side-by-side
    python features.py <dir_a> --vs <dir_b> --format md     # markdown diff
"""

import sys
import os
import json
import argparse
from pathlib import Path
from dataclasses import dataclass, field


# ── Data model ────────────────────────────────────────────────────

@dataclass
class SubFeature:
    name: str
    kind: str  # "type" or "function"
    detail: str = ""  # e.g. "class, 12 methods, 5 fields" or "async, 8 calls"
    file: str = ""


@dataclass
class FileEntry:
    path: str
    lines: int = 0
    types: int = 0
    functions: int = 0
    imports: int = 0


@dataclass
class DepEdge:
    source: str  # module name
    target: str  # module name or external
    kind: str = "imports"  # imports, calls, inherits


@dataclass
class Feature:
    """A top-level feature = one module."""
    name: str
    files: int = 0
    lines: int = 0
    types: int = 0
    functions: int = 0
    sub_features: list = field(default_factory=list)  # list[SubFeature]
    file_entries: list = field(default_factory=list)   # list[FileEntry]
    deps_out: list = field(default_factory=list)       # list[DepEdge]
    deps_in: list = field(default_factory=list)        # list[DepEdge]


@dataclass
class FeatureMap:
    project: str = ""
    total_files: int = 0
    total_lines: int = 0
    features: list = field(default_factory=list)  # list[Feature]
    cross_edges: list = field(default_factory=list)  # list[DepEdge]


# ── YAML parsing (lightweight, no pyyaml) ─────────────────────────

def parse_yaml_value(line: str) -> str:
    if ":" not in line:
        return line.strip()
    return line.split(":", 1)[1].strip()


def parse_workspace(ws_path: Path) -> dict:
    result = {"name": "", "total_files": 0, "total_lines": 0, "modules": []}
    if not ws_path.exists():
        return result

    text = ws_path.read_text()
    current_module = None
    in_modules = False

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped.startswith("name:") and not in_modules:
            result["name"] = parse_yaml_value(stripped)
        elif stripped.startswith("total_files:") and not in_modules:
            try:
                result["total_files"] = int(parse_yaml_value(stripped))
            except (ValueError, TypeError):
                pass
        elif stripped.startswith("total_lines:") and not in_modules:
            try:
                result["total_lines"] = int(parse_yaml_value(stripped))
            except (ValueError, TypeError):
                pass
        elif stripped == "modules:":
            in_modules = True
        elif in_modules:
            if stripped.startswith("- name:"):
                current_module = {
                    "name": parse_yaml_value(stripped.replace("- ", "", 1)),
                    "files": 0, "lines": 0, "types": 0, "functions": 0,
                }
                result["modules"].append(current_module)
            elif current_module:
                for key in ("files", "lines", "types", "functions"):
                    if stripped.startswith(f"{key}:"):
                        try:
                            current_module[key] = int(parse_yaml_value(stripped))
                        except (ValueError, TypeError):
                            pass
    return result


def parse_module_yaml(mod_path: Path) -> list:
    """Parse module.yaml to get file entries."""
    entries = []
    if not mod_path.exists():
        return entries

    text = mod_path.read_text()
    current = None
    in_files = False

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped == "files:" or stripped.startswith("files:"):
            in_files = True
            continue

        if in_files:
            if stripped.startswith("- file:"):
                current = {"path": parse_yaml_value(stripped.replace("- ", "", 1)),
                           "lines": 0, "types": 0, "functions": 0, "imports": 0}
                entries.append(current)
            elif current:
                for key in ("lines", "types", "functions", "imports", "exports"):
                    if stripped.startswith(f"{key}:"):
                        try:
                            current[key] = int(parse_yaml_value(stripped))
                        except (ValueError, TypeError):
                            pass

    return entries


def parse_file_descriptor(path: Path) -> dict:
    """Parse a file descriptor YAML for types, functions, imports."""
    result = {"types": [], "functions": [], "imports": [], "file": ""}
    if not path.exists():
        return result

    text = path.read_text()
    current_section = None
    current_item = None

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped.startswith("file:") and current_section is None:
            result["file"] = parse_yaml_value(stripped)

        if stripped.startswith("- name:") and current_section == "types":
            name = parse_yaml_value(stripped.replace("- ", "", 1))
            current_item = {"name": name, "kind": "", "methods": 0, "fields": 0}
            result["types"].append(current_item)
        elif stripped.startswith("- name:") and current_section == "functions":
            name = parse_yaml_value(stripped.replace("- ", "", 1))
            current_item = {"name": name, "is_async": False, "calls": 0, "vis": "public"}
            result["functions"].append(current_item)

        if stripped == "types:" or stripped.startswith("types:"):
            current_section = "types"
            current_item = None
        elif stripped == "functions:" or stripped.startswith("functions:"):
            current_section = "functions"
            current_item = None
        elif stripped == "imports:" or stripped.startswith("imports:"):
            current_section = "imports"
            current_item = None

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

        if current_section == "imports" and stripped.startswith("- sym:"):
            result["imports"].append(parse_yaml_value(stripped.replace("- ", "", 1)))
        elif current_section == "imports" and stripped.startswith("- "):
            result["imports"].append(stripped[2:])

    return result


def parse_deps(deps_path: Path) -> list:
    """Parse deps.yaml to extract cross-module edges."""
    edges = []
    if not deps_path.exists():
        return edges

    text = deps_path.read_text()
    in_edges = False
    current_edge = None

    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped == "edges:":
            in_edges = True
            continue

        if in_edges:
            if stripped.startswith("- from:"):
                current_edge = {"from": parse_yaml_value(stripped.replace("- ", "", 1)),
                                "to": "", "kind": "imports"}
                edges.append(current_edge)
            elif current_edge:
                if stripped.startswith("to:"):
                    current_edge["to"] = parse_yaml_value(stripped)
                elif stripped.startswith("kind:"):
                    current_edge["kind"] = parse_yaml_value(stripped)

    return edges


# ── Feature map builder ───────────────────────────────────────────

def build_feature_map(descriptor_dir: Path) -> FeatureMap:
    """Build a complete feature map from a descriptor directory."""
    ws = parse_workspace(descriptor_dir / "workspace.yaml")

    fm = FeatureMap(
        project=ws["name"],
        total_files=ws["total_files"],
        total_lines=ws["total_lines"],
    )

    module_names = set()

    for mod_info in ws["modules"]:
        mod_name = mod_info["name"]
        module_names.add(mod_name)

        feature = Feature(
            name=mod_name,
            files=mod_info.get("files", 0),
            lines=mod_info.get("lines", 0),
            types=mod_info.get("types", 0),
            functions=mod_info.get("functions", 0),
        )

        # Parse module.yaml for file entries
        mod_dir = descriptor_dir / mod_name
        mod_yaml = mod_dir / "module.yaml"
        if mod_yaml.exists():
            for entry in parse_module_yaml(mod_yaml):
                feature.file_entries.append(FileEntry(
                    path=entry["path"],
                    lines=entry.get("lines", 0),
                    types=entry.get("types", 0),
                    functions=entry.get("functions", 0),
                    imports=entry.get("imports", 0),
                ))

        # Parse file descriptors for sub-features (types + functions)
        if mod_dir.is_dir():
            for fy in sorted(mod_dir.glob("*.yaml")):
                if fy.name == "module.yaml":
                    continue
                fd = parse_file_descriptor(fy)
                src_file = fd.get("file", fy.stem)

                for t in fd["types"]:
                    detail_parts = []
                    if t["kind"]:
                        detail_parts.append(t["kind"])
                    if t["methods"]:
                        detail_parts.append(f"{t['methods']} methods")
                    if t["fields"]:
                        detail_parts.append(f"{t['fields']} fields")
                    feature.sub_features.append(SubFeature(
                        name=t["name"],
                        kind="type",
                        detail=", ".join(detail_parts),
                        file=src_file,
                    ))

                for f in fd["functions"]:
                    detail_parts = []
                    if f.get("is_async"):
                        detail_parts.append("async")
                    if f.get("vis") and f["vis"] != "public":
                        detail_parts.append(f["vis"])
                    if f.get("calls"):
                        detail_parts.append(f"{f['calls']} calls")
                    feature.sub_features.append(SubFeature(
                        name=f["name"],
                        kind="function",
                        detail=", ".join(detail_parts),
                        file=src_file,
                    ))

        fm.features.append(feature)

    # Parse dependency edges (only between known modules)
    deps = parse_deps(descriptor_dir / "deps.yaml")
    for edge in deps:
        src_mod = edge["from"].split(".")[0]
        tgt_mod = edge["to"].split(".")[0]
        if src_mod == tgt_mod:
            continue  # skip intra-module
        if src_mod not in module_names or tgt_mod not in module_names:
            continue  # skip edges to/from unknown modules

        dep = DepEdge(source=src_mod, target=tgt_mod, kind=edge.get("kind", "imports"))
        fm.cross_edges.append(dep)

        # Assign to features
        for f in fm.features:
            if f.name == src_mod:
                f.deps_out.append(dep)
            if f.name == tgt_mod:
                f.deps_in.append(dep)

    # Also infer edges from imports in file descriptors
    for feature in fm.features:
        seen_targets = {(e.source, e.target) for e in feature.deps_out}
        if not feature.file_entries:
            continue
        # Scan file descriptors for cross-module imports
        mod_dir = descriptor_dir / feature.name
        if not mod_dir.is_dir():
            continue
        for fy in sorted(mod_dir.glob("*.yaml")):
            if fy.name == "module.yaml":
                continue
            fd = parse_file_descriptor(fy)
            for imp in fd.get("imports", []):
                # Try to extract target module from import path
                # e.g. "agno.memory.MemoryManager" -> "memory"
                parts = imp.replace("sym: ", "").split(".")
                if len(parts) >= 2:
                    # Look for a module name in the import path
                    for part in parts:
                        if part in module_names and part != feature.name:
                            if (feature.name, part) not in seen_targets:
                                dep = DepEdge(source=feature.name, target=part, kind="imports")
                                feature.deps_out.append(dep)
                                fm.cross_edges.append(dep)
                                seen_targets.add((feature.name, part))
                            break

    return fm


# ── Output formatters ─────────────────────────────────────────────

def format_text(fm: FeatureMap, module_filter: str = None) -> str:
    lines = []
    lines.append("=" * 78)
    lines.append(f"  FEATURE MAP — {fm.project}")
    lines.append(f"  {fm.total_files} files, {fm.total_lines:,} lines")
    lines.append("=" * 78)
    lines.append("")

    features = fm.features
    if module_filter:
        features = [f for f in features if f.name == module_filter]
        if not features:
            return f"Module '{module_filter}' not found."

    for feat in sorted(features, key=lambda f: -f.lines):
        pct = feat.lines / fm.total_lines * 100 if fm.total_lines else 0
        lines.append(f"┌─ {feat.name} {'─' * (72 - len(feat.name))}┐")
        lines.append(f"│  {feat.files} files, {feat.lines:,} lines ({pct:.1f}%), "
                     f"{feat.types} types, {feat.functions} functions")

        # Dependencies
        if feat.deps_out:
            targets = sorted(set(e.target for e in feat.deps_out))
            lines.append(f"│  depends on: {', '.join(targets)}")
        if feat.deps_in:
            sources = sorted(set(e.source for e in feat.deps_in))
            lines.append(f"│  used by:    {', '.join(sources)}")

        # Sub-features (types)
        types = [sf for sf in feat.sub_features if sf.kind == "type"]
        if types:
            lines.append(f"│")
            lines.append(f"│  Types ({len(types)}):")
            for sf in types[:15]:
                detail = f" — {sf.detail}" if sf.detail else ""
                lines.append(f"│    {sf.name}{detail}")
            if len(types) > 15:
                lines.append(f"│    ... +{len(types) - 15} more")

        # Sub-features (functions)
        funcs = [sf for sf in feat.sub_features if sf.kind == "function"]
        if funcs:
            lines.append(f"│")
            lines.append(f"│  Functions ({len(funcs)}):")
            shown = 10 if not module_filter else 30
            for sf in funcs[:shown]:
                detail = f" — {sf.detail}" if sf.detail else ""
                lines.append(f"│    {sf.name}{detail}")
            if len(funcs) > shown:
                lines.append(f"│    ... +{len(funcs) - shown} more")

        # Files
        if feat.file_entries and module_filter:
            lines.append(f"│")
            lines.append(f"│  Files ({len(feat.file_entries)}):")
            for fe in sorted(feat.file_entries, key=lambda f: -f.lines)[:20]:
                lines.append(f"│    {fe.path:<45} {fe.lines:>6} lines")
            if len(feat.file_entries) > 20:
                lines.append(f"│    ... +{len(feat.file_entries) - 20} more")

        lines.append(f"└{'─' * 77}┘")
        lines.append("")

    # Cross-module dependency summary
    if not module_filter and fm.cross_edges:
        lines.append("┌─ CROSS-MODULE DEPENDENCIES ─────────────────────────────────────────────────┐")
        edge_counts = {}
        for e in fm.cross_edges:
            key = (e.source, e.target)
            edge_counts[key] = edge_counts.get(key, 0) + 1
        for (src, tgt), count in sorted(edge_counts.items(), key=lambda x: -x[1])[:30]:
            lines.append(f"│  {src:<20} → {tgt:<20} ({count} refs)")
        if len(edge_counts) > 30:
            lines.append(f"│  ... +{len(edge_counts) - 30} more edges")
        lines.append(f"└{'─' * 77}┘")
        lines.append("")

    # Summary
    if not module_filter:
        lines.append(f"Total: {len(fm.features)} features, "
                     f"{sum(len(f.sub_features) for f in fm.features)} sub-features, "
                     f"{len(set((e.source, e.target) for e in fm.cross_edges))} dependency edges")

    return "\n".join(lines)


def format_md(fm: FeatureMap, module_filter: str = None) -> str:
    lines = []
    lines.append(f"# Feature Map — {fm.project}\n")
    lines.append(f"**{fm.total_files} files, {fm.total_lines:,} lines**\n")

    features = fm.features
    if module_filter:
        features = [f for f in features if f.name == module_filter]

    # Overview table
    if not module_filter:
        lines.append("## Overview\n")
        lines.append("| Module | Files | Lines | % | Types | Functions | Depends On |")
        lines.append("|--------|------:|------:|--:|------:|----------:|------------|")
        for feat in sorted(features, key=lambda f: -f.lines):
            pct = feat.lines / fm.total_lines * 100 if fm.total_lines else 0
            deps = ", ".join(sorted(set(e.target for e in feat.deps_out)))[:40]
            lines.append(
                f"| **{feat.name}** | {feat.files} | {feat.lines:,} | {pct:.1f}% | "
                f"{feat.types} | {feat.functions} | {deps} |"
            )
        lines.append("")

    # Per-feature detail
    for feat in sorted(features, key=lambda f: -f.lines):
        lines.append(f"## {feat.name}\n")
        pct = feat.lines / fm.total_lines * 100 if fm.total_lines else 0
        lines.append(f"- **{feat.files}** files, **{feat.lines:,}** lines ({pct:.1f}%)")
        lines.append(f"- **{feat.types}** types, **{feat.functions}** functions")

        if feat.deps_out:
            targets = sorted(set(e.target for e in feat.deps_out))
            lines.append(f"- Depends on: {', '.join(f'`{t}`' for t in targets)}")
        if feat.deps_in:
            sources = sorted(set(e.source for e in feat.deps_in))
            lines.append(f"- Used by: {', '.join(f'`{s}`' for s in sources)}")
        lines.append("")

        types = [sf for sf in feat.sub_features if sf.kind == "type"]
        if types:
            lines.append("### Types\n")
            lines.append("| Name | Detail |")
            lines.append("|------|--------|")
            for sf in types[:20]:
                lines.append(f"| `{sf.name}` | {sf.detail} |")
            if len(types) > 20:
                lines.append(f"\n*+{len(types) - 20} more types*\n")
            lines.append("")

        funcs = [sf for sf in feat.sub_features if sf.kind == "function"]
        if funcs:
            lines.append("### Functions\n")
            limit = 15 if not module_filter else 30
            lines.append("| Name | Detail |")
            lines.append("|------|--------|")
            for sf in funcs[:limit]:
                lines.append(f"| `{sf.name}` | {sf.detail} |")
            if len(funcs) > limit:
                lines.append(f"\n*+{len(funcs) - limit} more functions*\n")
            lines.append("")

    return "\n".join(lines)


def format_json(fm: FeatureMap) -> str:
    data = {
        "project": fm.project,
        "total_files": fm.total_files,
        "total_lines": fm.total_lines,
        "features": [
            {
                "name": f.name,
                "files": f.files,
                "lines": f.lines,
                "types": f.types,
                "functions": f.functions,
                "sub_features": [
                    {"name": sf.name, "kind": sf.kind, "detail": sf.detail, "file": sf.file}
                    for sf in f.sub_features
                ],
                "file_entries": [
                    {"path": fe.path, "lines": fe.lines, "types": fe.types, "functions": fe.functions}
                    for fe in f.file_entries
                ],
                "deps_out": sorted(set(e.target for e in f.deps_out)),
                "deps_in": sorted(set(e.source for e in f.deps_in)),
            }
            for f in sorted(fm.features, key=lambda f: -f.lines)
        ],
        "cross_edges": len(set((e.source, e.target) for e in fm.cross_edges)),
    }
    return json.dumps(data, indent=2)


# ── VS mode (compare two projects) ───────────────────────────────

def compare_features(fm_a: FeatureMap, fm_b: FeatureMap, fmt: str = "text") -> str:
    if fmt == "md":
        return compare_md(fm_a, fm_b)
    return compare_text(fm_a, fm_b)


def compare_text(fm_a: FeatureMap, fm_b: FeatureMap) -> str:
    lines = []
    lines.append("=" * 78)
    lines.append(f"  FEATURE COMPARISON — {fm_a.project} vs {fm_b.project}")
    lines.append("=" * 78)
    lines.append("")

    # Overview
    lines.append(f"  {'Metric':<25} {fm_a.project:>20} {fm_b.project:>20}")
    lines.append(f"  {'─' * 65}")
    lines.append(f"  {'Files':<25} {fm_a.total_files:>20,} {fm_b.total_files:>20,}")
    lines.append(f"  {'Lines':<25} {fm_a.total_lines:>20,} {fm_b.total_lines:>20,}")
    lines.append(f"  {'Features (modules)':<25} {len(fm_a.features):>20} {len(fm_b.features):>20}")

    total_sf_a = sum(len(f.sub_features) for f in fm_a.features)
    total_sf_b = sum(len(f.sub_features) for f in fm_b.features)
    lines.append(f"  {'Sub-features':<25} {total_sf_a:>20,} {total_sf_b:>20,}")

    edges_a = len(set((e.source, e.target) for e in fm_a.cross_edges))
    edges_b = len(set((e.source, e.target) for e in fm_b.cross_edges))
    lines.append(f"  {'Dependency edges':<25} {edges_a:>20} {edges_b:>20}")
    lines.append("")

    # Feature name comparison
    names_a = {f.name for f in fm_a.features}
    names_b = {f.name for f in fm_b.features}
    shared = names_a & names_b
    only_a = names_a - names_b
    only_b = names_b - names_a

    if shared:
        lines.append(f"  Shared features ({len(shared)}): {', '.join(sorted(shared))}")
    if only_a:
        lines.append(f"  Only in {fm_a.project} ({len(only_a)}): {', '.join(sorted(only_a))}")
    if only_b:
        lines.append(f"  Only in {fm_b.project} ({len(only_b)}): {', '.join(sorted(only_b))}")
    lines.append("")

    # Side-by-side for shared features
    if shared:
        lines.append("┌─ SHARED FEATURE COMPARISON ─────────────────────────────────────────────────┐")
        lines.append(f"│  {'Feature':<18} {'Lines A':>10} {'Lines B':>10} {'Ratio':>8} {'Types A':>8} {'Types B':>8} │")
        lines.append(f"│  {'─' * 72} │")
        for name in sorted(shared):
            fa = next(f for f in fm_a.features if f.name == name)
            fb = next(f for f in fm_b.features if f.name == name)
            ratio = fa.lines / fb.lines if fb.lines else 0
            ratio_str = f"{ratio:.1f}x" if ratio >= 1 else f"1/{1/ratio:.1f}x" if ratio > 0 else "—"
            lines.append(
                f"│  {name:<18} {fa.lines:>10,} {fb.lines:>10,} {ratio_str:>8} "
                f"{fa.types:>8} {fb.types:>8} │"
            )
        lines.append(f"└{'─' * 77}┘")
        lines.append("")

    # Unique features detail
    for label, only, fm in [(f"ONLY IN {fm_a.project.upper()}", only_a, fm_a),
                            (f"ONLY IN {fm_b.project.upper()}", only_b, fm_b)]:
        if only:
            lines.append(f"┌─ {label} {'─' * (75 - len(label))}┐")
            for name in sorted(only):
                feat = next(f for f in fm.features if f.name == name)
                lines.append(f"│  {name:<20} {feat.lines:>8,} lines, "
                             f"{feat.types} types, {feat.functions} funcs")
            lines.append(f"└{'─' * 77}┘")
            lines.append("")

    return "\n".join(lines)


def compare_md(fm_a: FeatureMap, fm_b: FeatureMap) -> str:
    lines = []
    lines.append(f"# Feature Comparison — {fm_a.project} vs {fm_b.project}\n")

    # Overview
    lines.append("## Overview\n")
    lines.append(f"| Metric | {fm_a.project} | {fm_b.project} |")
    lines.append("|--------|---:|---:|")
    lines.append(f"| Files | {fm_a.total_files:,} | {fm_b.total_files:,} |")
    lines.append(f"| Lines | {fm_a.total_lines:,} | {fm_b.total_lines:,} |")
    lines.append(f"| Features | {len(fm_a.features)} | {len(fm_b.features)} |")

    total_sf_a = sum(len(f.sub_features) for f in fm_a.features)
    total_sf_b = sum(len(f.sub_features) for f in fm_b.features)
    lines.append(f"| Sub-features | {total_sf_a:,} | {total_sf_b:,} |")
    lines.append("")

    # Feature names
    names_a = {f.name for f in fm_a.features}
    names_b = {f.name for f in fm_b.features}
    shared = names_a & names_b
    only_a = names_a - names_b
    only_b = names_b - names_a

    if shared:
        lines.append("## Shared Features\n")
        lines.append(f"| Feature | {fm_a.project} Lines | {fm_b.project} Lines | Ratio | "
                     f"{fm_a.project} Types | {fm_b.project} Types |")
        lines.append("|---------|---:|---:|---:|---:|---:|")
        for name in sorted(shared):
            fa = next(f for f in fm_a.features if f.name == name)
            fb = next(f for f in fm_b.features if f.name == name)
            ratio = fa.lines / fb.lines if fb.lines else 0
            ratio_str = f"{ratio:.1f}x"
            lines.append(f"| **{name}** | {fa.lines:,} | {fb.lines:,} | {ratio_str} | "
                         f"{fa.types} | {fb.types} |")
        lines.append("")

    if only_a:
        lines.append(f"## Only in {fm_a.project}\n")
        for name in sorted(only_a):
            feat = next(f for f in fm_a.features if f.name == name)
            lines.append(f"- **{name}**: {feat.lines:,} lines, {feat.types} types, {feat.functions} functions")
        lines.append("")

    if only_b:
        lines.append(f"## Only in {fm_b.project}\n")
        for name in sorted(only_b):
            feat = next(f for f in fm_b.features if f.name == name)
            lines.append(f"- **{name}**: {feat.lines:,} lines, {feat.types} types, {feat.functions} functions")
        lines.append("")

    return "\n".join(lines)


# ── Main ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Feature extraction engine for Roska descriptors"
    )
    parser.add_argument("descriptor_dir", help="Directory with Roska YAML descriptors")
    parser.add_argument("--module", "-m", help="Show details for a specific module/feature")
    parser.add_argument("--format", "-f", choices=["text", "md", "json"], default="text")
    parser.add_argument("--vs", help="Compare with another descriptor directory")
    parser.add_argument("--save", "-s", help="Save output to file")

    args = parser.parse_args()
    descriptor_dir = Path(args.descriptor_dir)

    if not descriptor_dir.is_dir():
        print(f"Error: {descriptor_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    fm = build_feature_map(descriptor_dir)

    if args.vs:
        vs_dir = Path(args.vs)
        if not vs_dir.is_dir():
            print(f"Error: {vs_dir} is not a directory", file=sys.stderr)
            sys.exit(1)
        fm_b = build_feature_map(vs_dir)
        output = compare_features(fm, fm_b, fmt=args.format)
    elif args.format == "json":
        output = format_json(fm)
    elif args.format == "md":
        output = format_md(fm, module_filter=args.module)
    else:
        output = format_text(fm, module_filter=args.module)

    print(output)

    if args.save:
        Path(args.save).write_text(output)
        print(f"\nSaved to {args.save}")


if __name__ == "__main__":
    main()
