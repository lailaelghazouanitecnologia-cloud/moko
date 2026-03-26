"""
ModuleContextMetrics — contextual metrics that require knowledge of the whole module.

Adds 3 key dimensions missing from per-file quality features:
  - module_role: types / service / controller / util / test / barrel
  - consumers_count: how many files import this one
  - dependency_depth: position in the import graph (0 = entry point)

Works with or without LiveIndex (graceful degradation).
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from ..context import ContextEngine


@dataclass
class ModuleContextMetrics:
    """Contextual metrics for a file within its module."""
    module_role: str = "util"
    consumers_count: int = 0
    dependency_depth: int = 0
    is_entry_point: bool = False
    exports_count: int = 0
    imports_count: int = 0
    is_barrel: bool = False


def infer_module_role(filepath: str) -> str:
    """Infer module role from file path. No LiveIndex needed."""
    path = filepath.lower().replace("\\", "/")

    if any(x in path for x in ["/types/", "/interfaces/", "/models/", ".types.ts", ".model.ts"]):
        return "types"
    if any(x in path for x in ["/test", ".test.ts", ".spec.ts"]):
        return "test"
    if any(x in path for x in ["/controller", "/router", "/routes", "/api/"]):
        return "controller"
    if any(x in path for x in ["/service", "/services/", "/manager"]):
        return "service"
    if path.endswith("index.ts"):
        return "barrel"
    return "util"


def extract_context_metrics(
    filepath: str,
    context_engine: Optional["ContextEngine"] = None,
) -> ModuleContextMetrics:
    """Extract context metrics. Uses LiveIndex when available, degrades gracefully."""
    role = infer_module_role(filepath)

    if context_engine is None:
        return ModuleContextMetrics(
            module_role=role,
            is_barrel="index.ts" in filepath,
        )

    index = context_engine.index

    # Count consumers: files that import this one
    consumers = 0
    for other_path, imports_list in getattr(index, "import_map", {}).items():
        if filepath in imports_list:
            consumers += 1

    state = index.files.get(filepath)
    exports_count = len(state.exports) if state and hasattr(state, "exports") else 0
    imports_count = len(state.imports) if state and hasattr(state, "imports") else 0

    depth = _compute_depth(filepath, index)

    return ModuleContextMetrics(
        module_role=role,
        consumers_count=consumers,
        dependency_depth=depth,
        is_entry_point=consumers > 3,
        exports_count=exports_count,
        imports_count=imports_count,
        is_barrel="index.ts" in filepath and consumers > 5,
    )


def _compute_depth(path: str, index) -> int:
    """BFS from entry points to compute depth in import graph."""
    import_map = getattr(index, "import_map", {})
    files = getattr(index, "files", {})
    if not import_map or not files:
        return 0

    # Entry points: files with 0 importers
    all_imported = set()
    for imports_list in import_map.values():
        if isinstance(imports_list, (list, set)):
            all_imported.update(imports_list)

    entry_points = {f for f in files if f not in all_imported}
    if path in entry_points:
        return 0

    visited = set()
    queue = [(ep, 0) for ep in entry_points]
    while queue:
        current, depth = queue.pop(0)
        if current == path:
            return depth
        if current not in visited:
            visited.add(current)
            for imported in import_map.get(current, []):
                queue.append((imported, depth + 1))

    return -1
