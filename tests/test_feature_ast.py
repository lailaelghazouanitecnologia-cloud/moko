"""Unit tests for Feature AST — FeatureNode, goal analysis, auto-select."""
import sys
from pathlib import Path

# Allow running from repo root
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.agent.engines.reference.feature_ast import (
    FeatureNode, GoalAnalysis, build_feature_ast,
    analyze_goal, auto_select, _score_relevance,
    _TYPES_3D_ONLY, _TYPES_2D_FRIENDLY,
)


# ── Helpers ──────────────────────────────────────────────

def _make_tree():
    """Build a minimal PlayCanvas-like tree for testing."""
    math = FeatureNode(name="math", path="math", kind="subsystem",
                       ref_loc=4500, ref_types=["Vec2", "Vec3", "Mat4", "Color"],
                       layer="core")
    events = FeatureNode(name="events", path="events", kind="subsystem",
                         ref_loc=800, ref_types=["EventHandler"],
                         layer="core")
    webgl = FeatureNode(name="webgl", path="rendering/webgl", kind="component",
                        ref_loc=15000,
                        ref_types=["WebglGraphicsDevice", "WebglTexture"],
                        layer="graphics")
    renderer = FeatureNode(name="renderer", path="rendering/renderer", kind="subsystem",
                           ref_loc=12000,
                           ref_types=["ForwardRenderer", "RenderPassShadow"],
                           layer="scene", requires=["math", "events"])
    rendering = FeatureNode(name="rendering", path="rendering", kind="domain",
                            ref_loc=27000, children=[webgl, renderer],
                            layer="graphics")
    input_kb = FeatureNode(name="keyboard", path="input/keyboard", kind="component",
                           ref_loc=350, ref_types=["Keyboard"], layer="input")
    input_mouse = FeatureNode(name="mouse", path="input/mouse", kind="component",
                              ref_loc=350, ref_types=["Mouse"], layer="input")
    input_dom = FeatureNode(name="input", path="input", kind="domain",
                            ref_loc=700, children=[input_kb, input_mouse],
                            layer="input")
    ecs = FeatureNode(name="ecs", path="ecs", kind="domain",
                      ref_loc=34000, ref_types=["Entity", "Component"],
                      layer="framework")

    root = FeatureNode(name="test-project", path="test-project", kind="root",
                       ref_loc=67000,
                       children=[math, events, rendering, input_dom, ecs])
    return root


# ── Tests ────────────────────────────────────────────────

def test_find():
    root = _make_tree()
    assert root.find("math") is not None
    assert root.find("rendering/webgl") is not None
    assert root.find("nonexistent") is None
    assert root.find("renderer").name == "renderer"
    print("  PASS  test_find")


def test_walk():
    root = _make_tree()
    names = [n.name for n in root.walk()]
    assert "test-project" in names
    assert "math" in names
    assert "webgl" in names
    assert "keyboard" in names
    assert len(names) == 10  # root + 9 nodes
    print("  PASS  test_walk")


def test_select_basic():
    root = _make_tree()
    root.select("math")
    assert root.find("math").selected
    print("  PASS  test_select_basic")


def test_select_with_children():
    root = _make_tree()
    root.select("rendering")
    assert root.find("rendering").selected
    assert root.find("rendering/webgl").selected
    assert root.find("rendering/renderer").selected
    print("  PASS  test_select_with_children")


def test_select_resolves_deps():
    root = _make_tree()
    root.select("rendering/renderer")
    # renderer requires math and events
    assert root.find("rendering/renderer").selected
    assert root.find("math").selected, "math should be auto-selected as dependency"
    assert root.find("events").selected, "events should be auto-selected as dependency"
    print("  PASS  test_select_resolves_deps")


def test_select_no_args():
    """Test that node.select() with no args works (Bug 1 fix)."""
    node = FeatureNode(name="test", path="test", kind="subsystem", ref_loc=100)
    node.select()
    assert node.selected
    print("  PASS  test_select_no_args")


def test_select_circular_requires():
    """Test that circular requires don't cause infinite recursion (Bug 2 fix)."""
    a = FeatureNode(name="a", path="a", kind="subsystem", requires=["b"])
    b = FeatureNode(name="b", path="b", kind="subsystem", requires=["a"])
    root = FeatureNode(name="root", path="root", kind="root", children=[a, b])
    root.select("a")  # should not hang
    assert a.selected and b.selected
    print("  PASS  test_select_circular_requires")


def test_deselect():
    root = _make_tree()
    root.select("rendering")
    root.deselect("rendering")
    assert not root.find("rendering").selected
    assert not root.find("rendering/webgl").selected
    print("  PASS  test_deselect")


def test_toggle():
    root = _make_tree()
    root.toggle("math")
    assert root.find("math").selected
    root.toggle("math")
    assert not root.find("math").selected
    print("  PASS  test_toggle")


def test_serialization():
    root = _make_tree()
    root.select("math")
    d = root.to_dict()
    restored = FeatureNode.from_dict(d)
    assert restored.name == "test-project"
    assert len(restored.children) == 5
    assert restored.find("math").ref_loc == 4500
    print("  PASS  test_serialization")


def test_selected_nodes():
    root = _make_tree()
    root.select("math")
    root.select("events")
    selected = root.selected_nodes()
    names = [n.name for n in selected]
    assert "math" in names
    assert "events" in names
    assert "webgl" not in names
    print("  PASS  test_selected_nodes")


# ── Goal Analysis Tests ──────────────────────────────────

def test_goal_2d_excludes_3d():
    """2D goal should exclude purely 3D modules."""
    root = _make_tree()
    analysis = analyze_goal("2D sprite game engine", root)
    assert analysis.is_2d
    assert not analysis.is_3d
    # renderer has ONLY 3D types (ForwardRenderer, RenderPassShadow)
    assert analysis.relevance.get("rendering/renderer") == "no"
    # math has mixed types (Vec2 is 2D, Vec3 is 3D) — should NOT be excluded
    assert analysis.relevance.get("math") == "yes"
    print("  PASS  test_goal_2d_excludes_3d")


def test_goal_3d_keeps_all():
    """3D goal should keep everything."""
    root = _make_tree()
    analysis = analyze_goal("3D game engine with WebGL", root)
    assert analysis.is_3d
    assert analysis.relevance.get("rendering/renderer") == "yes"
    assert analysis.relevance.get("math") == "yes"
    print("  PASS  test_goal_3d_keeps_all")


def test_goal_engine_selects_core():
    """Game engine goal should auto-select math + events."""
    root = _make_tree()
    analysis = analyze_goal("game engine", root)
    assert analysis.relevance.get("math") == "yes"
    assert analysis.relevance.get("events") == "yes"
    print("  PASS  test_goal_engine_selects_core")


def test_goal_engine_input_is_maybe():
    """Input should be 'maybe' for engine goals."""
    root = _make_tree()
    analysis = analyze_goal("game engine", root)
    assert analysis.relevance.get("input/keyboard") == "maybe"
    assert analysis.relevance.get("input/mouse") == "maybe"
    print("  PASS  test_goal_engine_input_is_maybe")


def test_auto_select():
    root = _make_tree()
    analysis = analyze_goal("game engine", root)
    maybes = auto_select(root, analysis)
    # math and events should be selected
    assert root.find("math").selected
    assert root.find("events").selected
    # input should be in maybes
    assert any("input" in m for m in maybes)
    print("  PASS  test_auto_select")


def test_auto_select_domain_propagation():
    """Domains should be selected if all children are selected (Bug 5 fix)."""
    root = _make_tree()
    # Select all children of input manually
    root.select("input/keyboard")
    root.select("input/mouse")
    # Now run auto_select which propagates to domains
    analysis = GoalAnalysis()
    auto_select(root, analysis)
    # domain should now be selected since all children are
    assert root.find("input").selected, "domain should propagate from children"
    print("  PASS  test_auto_select_domain_propagation")


def test_explicit_feature_in_goal():
    """If user mentions a feature by name, it's always 'yes'."""
    root = _make_tree()
    analysis = analyze_goal("game with keyboard input", root)
    # keyboard is mentioned by name in the goal
    assert analysis.relevance.get("input/keyboard") == "yes"
    print("  PASS  test_explicit_feature_in_goal")


# ── Build from real workspace (if available) ─────────────

def test_build_playcanvas():
    """Test building AST from real playcanvas workspace."""
    out_dir = Path("out")
    if not (out_dir / "playcanvas" / "workspace.yaml").exists():
        print("  SKIP  test_build_playcanvas (no workspace.yaml)")
        return
    ast = build_feature_ast("playcanvas", out_dir)
    assert ast.name == "playcanvas"
    assert ast.ref_loc > 100000
    assert len(ast.children) > 3
    # Should have rendering-related nodes
    nodes = {n.name for n in ast.walk()}
    assert "math" in nodes or "core" in nodes
    print(f"  PASS  test_build_playcanvas ({len(list(ast.walk()))} nodes, {ast.ref_loc:,} LOC)")


def test_build_thief_engine():
    """Test building AST from real thief-engine workspace."""
    out_dir = Path("out")
    if not (out_dir / "thief-engine" / "workspace.yaml").exists():
        print("  SKIP  test_build_thief_engine (no workspace.yaml)")
        return
    ast = build_feature_ast("thief-engine", out_dir)
    assert ast.name == "thief-engine"
    assert ast.ref_loc > 5000
    print(f"  PASS  test_build_thief_engine ({len(list(ast.walk()))} nodes, {ast.ref_loc:,} LOC)")


def test_build_openspace():
    """Test building AST from openspace workspace (types as int counts)."""
    out_dir = Path("out")
    if not (out_dir / "openspace" / "workspace.yaml").exists():
        print("  SKIP  test_build_openspace (no workspace.yaml)")
        return
    ast = build_feature_ast("openspace", out_dir)
    assert ast.name == "openspace"
    assert ast.ref_loc > 30000
    # Should extract actual type names from descriptors (not just counts)
    nodes = {n.name: n for n in ast.walk()}
    assert "skill_engine" in nodes
    assert len(nodes["skill_engine"].ref_types) > 0, "should extract type names from descriptors"
    print(f"  PASS  test_build_openspace ({len(list(ast.walk()))} nodes, {ast.ref_loc:,} LOC, "
          f"skill_engine has {len(nodes['skill_engine'].ref_types)} types)")


def test_goal_ai_agent():
    """AI agent goal should select AI-relevant modules."""
    out_dir = Path("out")
    if not (out_dir / "openspace" / "workspace.yaml").exists():
        print("  SKIP  test_goal_ai_agent (no workspace.yaml)")
        return
    ast = build_feature_ast("openspace", out_dir)
    analysis = analyze_goal("AI agent framework with self-evolving skills", ast)
    auto_select(ast, analysis)
    selected = {n.name for n in ast.selected_nodes()}
    assert "skill_engine" in selected, "skill_engine should be selected for AI goal"
    assert "agents" in selected, "agents should be selected for AI goal"
    assert "llm" in selected, "llm should be selected for AI goal"
    assert "config" in selected, "config (foundational) should be selected"
    print(f"  PASS  test_goal_ai_agent ({len(selected)} nodes selected)")


# ── Run all ──────────────────────────────────────────────

if __name__ == "__main__":
    print("\n  Feature AST — Unit Tests")
    print("  " + "─" * 50)

    test_find()
    test_walk()
    test_select_basic()
    test_select_with_children()
    test_select_resolves_deps()
    test_select_no_args()
    test_select_circular_requires()
    test_deselect()
    test_toggle()
    test_serialization()
    test_selected_nodes()

    print()
    print("  Goal Analysis")
    print("  " + "─" * 50)

    test_goal_2d_excludes_3d()
    test_goal_3d_keeps_all()
    test_goal_engine_selects_core()
    test_goal_engine_input_is_maybe()
    test_auto_select()
    test_auto_select_domain_propagation()
    test_explicit_feature_in_goal()

    print()
    print("  Real Workspace")
    print("  " + "─" * 50)

    test_build_playcanvas()
    test_build_thief_engine()
    test_build_openspace()
    test_goal_ai_agent()

    print()
    print("  ALL TESTS PASSED")
    print()
