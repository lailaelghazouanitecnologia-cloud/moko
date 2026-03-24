"""Tests for compaction module — context compression for large blueprints."""
import pytest

from src.agent.dev.blueprint import TypeBlueprint, ModuleBlueprint, MethodSpec, FieldSpec
from src.agent.dev.compaction import (
    needs_compaction,
    compact_type_summary,
    compact_type_oneliner,
    compact_layer_summary,
    build_prior_layers_context,
    prepare_translation_context,
    _extract_type_references,
)


def _make_type(name, methods=None, fields=None, static=None,
               kind="class", extends="", status="pending"):
    return TypeBlueprint(
        name=name,
        kind=kind,
        extends=extends,
        methods=[MethodSpec.from_dict(m) if isinstance(m, (str, dict)) else m
                 for m in (methods or [])],
        fields=[FieldSpec.from_dict(f) if isinstance(f, (str, dict)) else f
                for f in (fields or [])],
        static_members=[MethodSpec.from_dict(m) if isinstance(m, (str, dict)) else m
                        for m in (static or [])],
        status=status,
    )


def _make_module(name, types):
    return ModuleBlueprint(name=name, types=types, target_dir=f"src/{name}")


# ── needs_compaction ───────────────────────────────────────

class TestNeedsCompaction:
    def test_small_module_no_compaction(self):
        mod = _make_module("math", [
            _make_type("Vec3", methods=["add", "sub"], fields=["x: number"]),
        ])
        assert not needs_compaction(mod)

    def test_large_module_needs_compaction(self):
        # 50 types * 10 methods each = 500 items * 12 = 6000 > 4000
        types = []
        for i in range(50):
            types.append(_make_type(f"Type{i}", methods=[f"m{j}" for j in range(10)]))
        mod = _make_module("big", types)
        assert needs_compaction(mod)


# ── compact_type_summary ──────────────────────────────────

class TestCompactTypeSummary:
    def test_basic_class(self):
        t = _make_type("Vec3", methods=[
            {"name": "add", "sig": "(v: Vec3): Vec3"},
            {"name": "sub", "sig": "(v: Vec3): Vec3"},
        ], fields=["x: number", "y: number", "z: number"])
        result = compact_type_summary(t)
        assert "Vec3" in result
        assert "add(v: Vec3): Vec3" in result
        assert "x: number" in result

    def test_static_members(self):
        t = _make_type("Mat4", static=[
            {"name": "identity", "sig": "(): Mat4"},
        ])
        result = compact_type_summary(t)
        assert "static identity" in result

    def test_extends(self):
        t = _make_type("PointLight", extends="Light")
        result = compact_type_summary(t)
        assert "extends Light" in result


# ── compact_type_oneliner ──────────────────────────────────

class TestCompactTypeOneliner:
    def test_basic(self):
        t = _make_type("Vec3",
                        methods=["add", "sub", "cross"],
                        fields=["x: number", "y: number"])
        result = compact_type_oneliner(t)
        assert result.startswith("Vec3(")
        assert "x:number" in result
        assert "add" in result

    def test_truncation_at_120(self):
        t = _make_type("BigType",
                        methods=[f"method_{i}" for i in range(30)])
        result = compact_type_oneliner(t)
        assert len(result) <= 130  # name + parens + inner

    def test_extends_suffix(self):
        t = _make_type("Sub", extends="Base")
        result = compact_type_oneliner(t)
        assert "extends Base" in result


# ── compact_layer_summary ──────────────────────────────────

class TestCompactLayerSummary:
    def test_translated_only(self):
        mod = _make_module("math", [
            _make_type("Vec3", methods=["add"], status="translated"),
            _make_type("Mat4", methods=["mul"], status="pending"),
        ])
        result = compact_layer_summary(mod)
        assert "Vec3" in result
        assert "Mat4" not in result  # pending, not included

    def test_respects_max_chars(self):
        mod = _make_module("big", [
            _make_type(f"Type{i}", methods=[f"m{j}" for j in range(10)],
                       status="translated")
            for i in range(20)
        ])
        result = compact_layer_summary(mod, max_chars=100)
        assert len(result) <= 120  # some overhead for "big: "


# ── build_prior_layers_context ─────────────────────────────

class TestBuildPriorLayersContext:
    def test_empty_list(self):
        assert build_prior_layers_context([]) == ""

    def test_builds_context(self):
        bps = [
            _make_module("math", [
                _make_type("Vec3", methods=["add"], status="translated"),
            ]),
            _make_module("core", [
                _make_type("Entity", methods=["update"], status="translated"),
            ]),
        ]
        result = build_prior_layers_context(bps)
        assert "AVAILABLE FROM PRIOR LAYERS" in result
        assert "math:" in result
        assert "Vec3" in result
        assert "core:" in result

    def test_respects_max_chars(self):
        bps = [
            _make_module(f"mod{i}", [
                _make_type(f"T{j}", methods=[f"m{k}" for k in range(15)],
                           status="translated")
                for j in range(10)
            ])
            for i in range(10)
        ]
        result = build_prior_layers_context(bps, max_chars=500)
        assert len(result) <= 600


# ── _extract_type_references ───────────────────────────────

class TestExtractTypeReferences:
    def test_from_method_sigs(self):
        t = _make_type("Entity", methods=[
            {"name": "setTransform", "sig": "(pos: Vec3, rot: Quat): void"},
        ])
        refs = _extract_type_references(t)
        assert "Vec3" in refs
        assert "Quat" in refs
        assert "Entity" not in refs  # self excluded

    def test_from_fields(self):
        t = _make_type("Camera", fields=[
            {"name": "projection", "type": "Mat4"},
            {"name": "fov", "type": "number"},
        ])
        refs = _extract_type_references(t)
        assert "Mat4" in refs
        assert "number" not in refs  # lowercase, not a type name


# ── prepare_translation_context ────────────────────────────

class TestPrepareTranslationContext:
    def test_full_yaml_for_target(self):
        target = _make_type("Vec3", methods=["add", "sub"],
                            fields=["x: number"])
        mod = _make_module("math", [
            target,
            _make_type("Mat4", methods=["mul"]),
        ])
        ctx = prepare_translation_context(target, mod)
        assert "Vec3" in ctx.full_type_yaml
        assert "add" in ctx.full_type_yaml

    def test_sibling_summary_includes_others(self):
        target = _make_type("Vec3", methods=["add"])
        sibling = _make_type("Mat4", methods=[
            {"name": "mul", "sig": "(m: Mat4): Mat4"}
        ])
        mod = _make_module("math", [target, sibling])
        ctx = prepare_translation_context(target, mod)
        assert "Mat4" in ctx.sibling_summary

    def test_prioritized_types(self):
        target = _make_type("Camera", methods=[
            {"name": "getView", "sig": "(): Mat4"},
        ])
        referenced = _make_type("Mat4", methods=["mul"])
        other = _make_type("Utils", methods=["clamp"])
        mod = _make_module("gfx", [target, referenced, other])
        ctx = prepare_translation_context(target, mod)
        assert "Mat4" in ctx.prioritized_types
        assert "Utils" not in ctx.prioritized_types
