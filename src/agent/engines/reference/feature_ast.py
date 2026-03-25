"""
Feature AST — Hierarchical tree of capabilities from reference projects.

Built from Roska workspace.yaml + descriptors. Each node represents a
capability the user can select, with automatic dependency resolution
and goal-based filtering.

Entry points:
  - build_feature_ast(project_name, out_dir) → FeatureNode (root)
  - GoalAnalyzer.analyze(goal, ast) → selected nodes
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Dict

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore


# ── Data Model ──────────────────────────────────────────────────────

@dataclass
class FeatureNode:
    """A node in the feature capability tree."""
    name: str = ""
    path: str = ""              # tree path: "rendering/forward-renderer"
    kind: str = ""              # domain | subsystem | component

    # Reference data (from workspace.yaml + descriptors)
    ref_loc: int = 0
    ref_types: List[str] = field(default_factory=list)
    ref_functions: List[str] = field(default_factory=list)
    ref_module: str = ""        # Roska module name (e.g., "scene/renderer")
    layer: str = ""

    # Tree structure
    children: List[FeatureNode] = field(default_factory=list)
    requires: List[str] = field(default_factory=list)  # paths of auto-deps

    # Selection state (filled during interactive selection)
    selected: bool = False
    adapt: str = ""             # "" or "webgl→webgpu" etc.

    # Description (from LLM enrichment or heuristic)
    description: str = ""

    # ── Tree Operations ─────────────────────────────────────

    def find(self, path: str) -> Optional[FeatureNode]:
        """Find node by path. Supports partial match."""
        if self.path == path or self.name == path:
            return self
        for child in self.children:
            found = child.find(path)
            if found:
                return found
        return None

    def walk(self):
        """Yield all nodes depth-first."""
        yield self
        for child in self.children:
            yield from child.walk()

    def selected_nodes(self) -> List[FeatureNode]:
        """Get all selected nodes."""
        return [n for n in self.walk() if n.selected]

    def total_loc(self) -> int:
        """Sum ref_loc of all selected nodes (leaf only)."""
        if self.children:
            return sum(c.total_loc() for c in self.children if c.selected)
        return self.ref_loc if self.selected else 0

    def select(self, path: str):
        """Select a node and auto-resolve its dependencies."""
        node = self.find(path)
        if not node:
            return
        node.selected = True
        # Select all children if selecting a domain/subsystem
        if node.children:
            for child in node.children:
                child.selected = True
        # Resolve dependencies
        for req in node.requires:
            self.select(req)

    def deselect(self, path: str):
        """Deselect a node and its children."""
        node = self.find(path)
        if not node:
            return
        node.selected = False
        for child in node.children:
            child.selected = False

    def toggle(self, path: str):
        """Toggle selection."""
        node = self.find(path)
        if not node:
            return
        if node.selected:
            self.deselect(path)
        else:
            self.select(path)

    # ── Serialization ───────────────────────────────────────

    def to_dict(self) -> dict:
        d = {
            "name": self.name,
            "path": self.path,
            "kind": self.kind,
            "ref_loc": self.ref_loc,
            "ref_types": self.ref_types,
            "ref_functions": self.ref_functions,
            "ref_module": self.ref_module,
            "layer": self.layer,
            "requires": self.requires,
            "description": self.description,
        }
        if self.children:
            d["children"] = [c.to_dict() for c in self.children]
        return d

    @classmethod
    def from_dict(cls, data: dict) -> FeatureNode:
        children = [cls.from_dict(c) for c in data.get("children", [])]
        return cls(
            name=data.get("name", ""),
            path=data.get("path", ""),
            kind=data.get("kind", ""),
            ref_loc=data.get("ref_loc", 0),
            ref_types=data.get("ref_types", []),
            ref_functions=data.get("ref_functions", []),
            ref_module=data.get("ref_module", ""),
            layer=data.get("layer", ""),
            children=children,
            requires=data.get("requires", []),
            description=data.get("description", ""),
        )

    def save(self, path: Path):
        if yaml is None:
            raise RuntimeError("pyyaml required")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.dump(self.to_dict(), default_flow_style=False,
                                   allow_unicode=True, sort_keys=False, width=120))

    @classmethod
    def load(cls, path: Path) -> FeatureNode:
        if yaml is None:
            raise RuntimeError("pyyaml required")
        data = yaml.safe_load(path.read_text())
        return cls.from_dict(data)


# ── AST Builder ─────────────────────────────────────────────────────

def build_feature_ast(project_name: str, out_dir: Path) -> FeatureNode:
    """Build a feature AST from Roska workspace.yaml + descriptors.

    Algorithm:
    1. Load workspace.yaml → get modules with LOC, types, functions
    2. Detect hierarchy from module paths (platform/graphics parent of platform/graphics/webgl)
    3. Group orphan modules by layer into domain nodes
    4. Infer dependencies from shared types in imports
    """
    if yaml is None:
        raise RuntimeError("pyyaml required")

    ref_dir = out_dir / project_name
    ws_path = ref_dir / "workspace.yaml"
    if not ws_path.exists():
        raise FileNotFoundError(f"No workspace.yaml for {project_name}")

    workspace = yaml.safe_load(ws_path.read_text())
    modules = workspace.get("modules", [])
    layers = workspace.get("layers", {})

    # Step 1: Create a FeatureNode per module
    mod_nodes: Dict[str, FeatureNode] = {}
    for mod in modules:
        name = mod["name"]
        node = FeatureNode(
            name=name.split("/")[-1],  # short name: "math", "webgl"
            path=name,                  # full path: "core/math"
            kind="subsystem",
            ref_loc=mod.get("lines", 0),
            ref_types=mod.get("types", []),
            ref_functions=mod.get("functions", []),
            ref_module=name,
            layer=mod.get("layer", ""),
        )
        mod_nodes[name] = node

    # Step 2: Detect parent-child from path prefixes
    # platform/graphics is parent of platform/graphics/webgl
    parented = set()
    for name in sorted(mod_nodes.keys()):
        for other_name in sorted(mod_nodes.keys()):
            if other_name != name and other_name.startswith(name + "/"):
                # `name` is parent of `other_name` — but only direct parent
                # Check no intermediate parent exists
                remainder = other_name[len(name) + 1:]
                if "/" not in remainder:
                    mod_nodes[name].children.append(mod_nodes[other_name])
                    mod_nodes[name].kind = "subsystem"
                    parented.add(other_name)

    # Step 3: Group remaining top-level modules by layer into domain nodes
    layer_domains: Dict[str, FeatureNode] = {}
    for name, node in mod_nodes.items():
        if name in parented:
            continue  # already a child of another module
        layer = node.layer or "misc"

        if layer not in layer_domains:
            layer_info = layers.get(layer, {})
            layer_domains[layer] = FeatureNode(
                name=layer,
                path=layer,
                kind="domain",
                ref_loc=layer_info.get("lines", 0) if isinstance(layer_info, dict) else 0,
                layer=layer,
            )

        layer_domains[layer].children.append(node)

    # Step 4: Build root
    root = FeatureNode(
        name=project_name,
        path=project_name,
        kind="root",
        ref_loc=workspace.get("total_lines", 0),
        layer="",
    )
    # Sort domains by dependency order: core first, framework last
    domain_order = {"core": 0, "geom": 1, "graphics": 2, "scene": 3,
                    "input": 4, "framework": 5, "extras": 6, "misc": 99}
    for _, domain in sorted(layer_domains.items(),
                            key=lambda x: domain_order.get(x[0], 50)):
        # Collapse single-child domains
        if len(domain.children) == 1 and not domain.children[0].children:
            child = domain.children[0]
            child.kind = "subsystem"
            root.children.append(child)
        else:
            root.children.append(domain)

    # Step 5: Infer requires from type overlap
    _infer_dependencies(root, mod_nodes)

    # Propagate LOC up for domains
    for node in root.children:
        if node.kind == "domain" and node.children:
            node.ref_loc = sum(c.ref_loc for c in node.children)

    return root


def _infer_dependencies(root: FeatureNode, mod_nodes: Dict[str, FeatureNode]):
    """Infer requires[] from common patterns.

    - Modules importing EventHandler → require core/event
    - Modules using Vec3/Mat4 → require core/math or geom
    - scene/* → require platform/graphics
    - framework/* → require scene
    """
    type_to_module: Dict[str, str] = {}
    for name, node in mod_nodes.items():
        for t in node.ref_types:
            type_to_module[t] = node.path

    # Well-known dependency patterns
    KNOWN_DEPS = {
        "scene": ["core"],
        "scene/renderer": ["scene", "scene/materials", "scene/shader-lib"],
        "scene/materials": ["scene/shader-lib"],
        "framework": ["scene", "core"],
        "framework/components": ["framework", "scene"],
        "framework/asset": ["framework"],
    }

    for node in root.walk():
        if node.kind == "root" or node.kind == "domain":
            continue
        path = node.ref_module or node.path
        if path in KNOWN_DEPS:
            for dep in KNOWN_DEPS[path]:
                dep_node = root.find(dep)
                if dep_node and dep_node.path != node.path:
                    if dep_node.path not in node.requires:
                        node.requires.append(dep_node.path)


# ── Goal Analysis ───────────────────────────────────────────────────

# Keyword → related feature paths (domain knowledge for common sense filtering)
_KEYWORDS_2D = {"2d", "sprite", "tilemap", "pixel", "orthographic", "canvas2d"}
_KEYWORDS_3D = {"3d", "mesh", "pbr", "lighting", "shadow", "perspective",
                "webgl", "webgpu", "forward-render", "deferred"}
_TYPES_3D_ONLY = {"Vec3", "Vec4", "Quat", "Mat4", "Light", "MeshInstance",
                  "Mesh", "ForwardRenderer", "RenderPassShadow",
                  "StandardMaterial", "PerspectiveCamera", "Frustum"}
_TYPES_2D_FRIENDLY = {"Vec2", "Color", "Curve", "CurveSet", "Mat3",
                      "SpriteBatch", "SpriteRenderer", "OrthoCamera",
                      "Texture", "Animation", "AnimationFrame"}


@dataclass
class GoalAnalysis:
    """Result of analyzing a user's goal against a feature AST."""
    goal: str = ""
    is_2d: bool = False
    is_3d: bool = False
    explicit_features: List[str] = field(default_factory=list)  # user named these
    keywords: List[str] = field(default_factory=list)

    # Per-node relevance
    relevance: Dict[str, str] = field(default_factory=dict)  # path → yes|no|maybe


def analyze_goal(goal: str, ast: FeatureNode, llm=None) -> GoalAnalysis:
    """Analyze a goal string to determine which features are relevant.

    Uses common-sense rules + optional LLM for ambiguous cases.
    """
    goal_lower = goal.lower()
    analysis = GoalAnalysis(goal=goal)

    # Detect 2D vs 3D
    analysis.is_2d = any(kw in goal_lower for kw in _KEYWORDS_2D)
    analysis.is_3d = any(kw in goal_lower for kw in _KEYWORDS_3D)

    # If neither explicitly mentioned, check for "engine" (ambiguous) vs specific
    if not analysis.is_2d and not analysis.is_3d:
        if "render" in goal_lower or "graphics" in goal_lower:
            # Rendering mentioned but no dimension → ambiguous, will ask
            pass
        elif "engine" in goal_lower:
            # Generic engine → ambiguous
            pass

    # Extract explicit feature mentions from goal
    for node in ast.walk():
        if node.kind == "root":
            continue
        name_lower = node.name.lower()
        if name_lower in goal_lower or node.path.lower() in goal_lower:
            analysis.explicit_features.append(node.path)

    # Check for adaptation keywords
    keywords = []
    if "webgpu" in goal_lower:
        keywords.append("webgpu")
    if "webgl" in goal_lower:
        keywords.append("webgl")
    if "canvas" in goal_lower:
        keywords.append("canvas")
    analysis.keywords = keywords

    # Score each node
    for node in ast.walk():
        if node.kind in ("root", "domain"):
            continue
        analysis.relevance[node.path] = _score_relevance(node, analysis)

    return analysis


def _score_relevance(node: FeatureNode, analysis: GoalAnalysis) -> str:
    """Score a single node's relevance to the goal."""

    # Explicitly mentioned → always yes
    if node.path in analysis.explicit_features:
        return "yes"

    # Parent explicitly mentioned → yes
    for ef in analysis.explicit_features:
        if node.path.startswith(ef + "/") or ef.startswith(node.path + "/"):
            return "yes"

    goal_lower = analysis.goal.lower()
    goal_wants_render = "render" in goal_lower or "graphics" in goal_lower
    goal_wants_engine = "engine" in goal_lower or "game" in goal_lower

    # Math/events are ALWAYS needed — foundational
    if node.name in ("math", "geom", "event", "events"):
        return "yes"

    # 2D goal → exclude modules that are PURELY 3D
    # A module is purely 3D only if ALL its types are 3D-only
    if analysis.is_2d and not analysis.is_3d:
        if node.ref_types:
            useful_types = [t for t in node.ref_types if t not in _TYPES_3D_ONLY]
            all_3d = len(useful_types) == 0
            if all_3d:
                return "no"
            # Mixed module (has both 2D and 3D types) → yes, will adapt
            # e.g., scene has GraphNode (useful) + Light (3D only)

    # Rendering-related when goal mentions rendering or engine
    if goal_wants_render or goal_wants_engine:
        render_layers = {"graphics", "scene"}
        render_names = {"graphics", "renderer", "materials", "shader-lib",
                        "shader", "render-engine", "forward-renderer",
                        "webgl", "webgpu", "scene"}
        if node.name in render_names or node.layer in render_layers:
            return "yes"

    # Input system when goal says "engine"
    if goal_wants_engine and node.layer == "input":
        return "maybe"

    # ECS/framework when goal says "engine"
    if goal_wants_engine and node.layer == "framework":
        return "maybe"

    # Physics when goal says "engine" or "game"
    if goal_wants_engine and node.layer == "physics":
        return "maybe"

    # Core systems (engine, canvas, time, loader) when building a game
    if goal_wants_engine:
        core_names = {"core", "engine", "canvas", "time", "loader"}
        if node.name in core_names or node.layer == "core":
            return "yes"

    # Game objects / scene when building a game
    if goal_wants_engine:
        go_names = {"gameobject", "scene", "transform", "entity", "component"}
        if node.name in go_names or node.layer == "gameobject":
            return "maybe"

    # Builder/factory patterns when building a game
    if goal_wants_engine and node.layer == "builder":
        return "maybe"

    # Script system when building a game
    if goal_wants_engine and node.layer == "script":
        return "maybe"

    # Not mentioned, not inferred → no
    return "no"


def auto_select(ast: FeatureNode, analysis: GoalAnalysis) -> List[str]:
    """Apply goal analysis to auto-select nodes. Returns list of 'maybe' paths."""
    maybes = []
    for node in ast.walk():
        if node.kind in ("root",):
            continue
        rel = analysis.relevance.get(node.path, "no")
        if rel == "yes":
            ast.select(node.path)
        elif rel == "maybe":
            maybes.append(node.path)
        # "no" → leave unselected

    return maybes


# ── Display ─────────────────────────────────────────────────────────

def print_tree(node: FeatureNode, indent: int = 0, show_selection: bool = False,
               analysis: GoalAnalysis = None, max_depth: int = 3):
    """Print the feature tree to stdout."""
    if node.kind == "root":
        total = node.ref_loc
        print(f"\n  {node.name} ({total:,} LOC)")
        print(f"  {'─' * 60}")
        for child in node.children:
            print_tree(child, indent=2, show_selection=show_selection,
                       analysis=analysis, max_depth=max_depth)
        print()
        return

    prefix = " " * indent
    icon = ""
    if show_selection:
        if node.selected:
            icon = "✓ "
        else:
            icon = "  "

    # Relevance indicator
    rel = ""
    if analysis and node.path in analysis.relevance:
        r = analysis.relevance[node.path]
        if r == "no":
            rel = "  (excluded)"
        elif r == "maybe":
            rel = "  (?)"

    types_str = ""
    if node.ref_types and len(node.ref_types) <= 6:
        types_str = f"  [{', '.join(node.ref_types)}]"
    elif node.ref_types:
        types_str = f"  [{', '.join(node.ref_types[:4])}, +{len(node.ref_types)-4}]"

    has_children = "/ " if node.children else "  "

    loc_str = f"{node.ref_loc:>6,} LOC" if node.ref_loc else ""

    print(f"{prefix}{icon}{has_children}{node.name:<25} {loc_str}{types_str}{rel}")

    if indent < max_depth * 2:
        for child in node.children:
            print_tree(child, indent=indent + 4, show_selection=show_selection,
                       analysis=analysis, max_depth=max_depth)


def print_plan(ast: FeatureNode, analysis: GoalAnalysis):
    """Print the generation plan based on selected nodes."""
    selected = ast.selected_nodes()
    if not selected:
        print("\n  No features selected.\n")
        return

    print(f"\n  {'━' * 60}")
    print(f"    GENERATION PLAN")
    print(f"  {'━' * 60}\n")

    # Group by domain/parent
    total_loc = 0
    total_types = 0

    for node in selected:
        if node.children:
            continue  # only show leaves
        adapt_str = f"  ADAPT ({node.adapt})" if node.adapt else ""
        types_str = f"  [{', '.join(node.ref_types[:5])}]" if node.ref_types else ""
        src = f"from {node.ref_module}" if node.ref_module else ""
        print(f"    {node.name:<22} ~{node.ref_loc:>5,} LOC  {src}{adapt_str}")
        if node.ref_types:
            for t in node.ref_types:
                marker = "  " if t not in _TYPES_3D_ONLY or not analysis.is_2d else "✗ "
                print(f"      {marker}{t}")
        total_loc += node.ref_loc
        total_types += len(node.ref_types)

    # Excluded summary
    excluded = [n for n in ast.walk()
                if not n.selected and n.kind not in ("root", "domain") and n.ref_loc > 0]
    if excluded:
        print(f"\n    EXCLUDED (auto):")
        for node in excluded[:8]:
            reason = analysis.relevance.get(node.path, "not relevant")
            print(f"      ✗ {node.name} ({node.ref_loc:,} LOC) — {reason}")
        if len(excluded) > 8:
            print(f"      ... and {len(excluded) - 8} more")

    print(f"\n    ESTIMATE: ~{total_loc:,} LOC, {total_types} types")
    print(f"  {'━' * 60}\n")


# ── Interactive Selection ───────────────────────────────────────────

def interactive_select(ast: FeatureNode, maybes: List[str],
                       goal: str) -> bool:
    """Ask user about 'maybe' features. Returns True if user confirms.

    Only asks about significant ambiguities, not obvious things.
    """
    # First ask about dimension if ambiguous
    goal_lower = goal.lower()
    has_render = "render" in goal_lower or "graphics" in goal_lower or "engine" in goal_lower
    is_2d = any(kw in goal_lower for kw in _KEYWORDS_2D)
    is_3d = any(kw in goal_lower for kw in _KEYWORDS_3D)

    if has_render and not is_2d and not is_3d:
        print(f"\n  Goal: \"{goal}\"")
        print(f"  2D or 3D?\n")
        print(f"    [1] 2D (sprites, tilemaps, orthographic)")
        print(f"    [2] 3D (meshes, materials, lighting)")
        print(f"    [3] Both")
        try:
            choice = input("\n  > ").strip()
        except (EOFError, KeyboardInterrupt):
            return False
        # Re-analyze with dimension info
        if choice == "1":
            return interactive_select(ast, maybes, goal + " 2D")
        elif choice == "3":
            return interactive_select(ast, maybes, goal + " 2D 3D")
        # Default: 3D

    # Ask about significant 'maybe' features (only those with > 500 LOC)
    significant_maybes = []
    for path in maybes:
        node = ast.find(path)
        if node and node.ref_loc >= 500:
            significant_maybes.append(node)

    if significant_maybes:
        print(f"\n  Optional features (include?):\n")
        for i, node in enumerate(significant_maybes, 1):
            types_preview = ", ".join(node.ref_types[:3])
            if len(node.ref_types) > 3:
                types_preview += "..."
            print(f"    [{i}] {node.name:<20} {node.ref_loc:>5,} LOC  [{types_preview}]")

        print(f"\n    [a] all  [n] none  [1,3] specific  [enter] skip")
        try:
            choice = input("  > ").strip().lower()
        except (EOFError, KeyboardInterrupt):
            return False

        if choice == "a":
            for node in significant_maybes:
                ast.select(node.path)
        elif choice and choice != "n":
            for part in choice.replace(",", " ").split():
                try:
                    idx = int(part) - 1
                    if 0 <= idx < len(significant_maybes):
                        ast.select(significant_maybes[idx].path)
                except ValueError:
                    pass

    # Handle adaptations (e.g., webgl → webgpu)
    if "webgpu" in goal_lower:
        for node in ast.walk():
            if node.selected and "webgl" in node.name.lower():
                node.adapt = "webgl→webgpu"
                node.name = node.name.replace("webgl", "webgpu").replace("Webgl", "Webgpu")

    return True
