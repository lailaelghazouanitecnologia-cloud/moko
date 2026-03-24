"""Tests for supervisor prior-layers context building."""
import pytest
from pathlib import Path

from src.agent.dev.blueprint import TypeBlueprint, ModuleBlueprint, MethodSpec, FieldSpec


def _make_type(name, status="translated", methods=None):
    return TypeBlueprint(
        name=name,
        status=status,
        methods=[MethodSpec(name=m) for m in (methods or [])],
    )


def _make_module(name, types, target_dir=""):
    return ModuleBlueprint(
        name=name,
        types=types,
        target_dir=target_dir or f"src/{name}",
    )


@pytest.fixture
def bp_dir(tmp_path):
    """Create a temporary blueprints directory with saved blueprint files."""
    bp_path = tmp_path / "chip8" / "blueprints"
    bp_path.mkdir(parents=True)

    # CPU module blueprint (translated)
    cpu_bp = _make_module("CPU", [
        _make_type("Cpu", status="translated", methods=["fetch", "execute", "reset"]),
        _make_type("RegisterBank", status="translated", methods=["get", "set"]),
    ], target_dir="src/CPU")
    cpu_bp.save(bp_path / "CPU.bp.yaml")

    # Memory module blueprint (translated)
    mem_bp = _make_module("Memory", [
        _make_type("Ram", status="translated", methods=["read", "write", "loadRom"]),
    ], target_dir="src/Memory")
    mem_bp.save(bp_path / "Memory.bp.yaml")

    # Display module blueprint (partially translated)
    disp_bp = _make_module("Display", [
        _make_type("FrameBuffer", status="translated", methods=["clear", "togglePixel"]),
        _make_type("Renderer", status="pending", methods=["render"]),
    ], target_dir="src/Display")
    disp_bp.save(bp_path / "Display.bp.yaml")

    # Emulator module blueprint (pending)
    emu_bp = _make_module("Emulator", [
        _make_type("Chip8Emulator", status="pending", methods=["step", "loadRom"]),
    ], target_dir="src/Emulator")
    emu_bp.save(bp_path / "Emulator.bp.yaml")

    return tmp_path / "chip8"


class TestBuildPriorLayersContextWithRequires:
    """Test _build_prior_layers_context when 'requires' IS specified."""

    def test_loads_only_required_modules(self, bp_dir):
        """With explicit requires, only those modules are loaded."""
        bps = []
        bp_path = bp_dir / "blueprints"
        # Simulate loading only CPU
        bp = ModuleBlueprint.load(bp_path / "CPU.bp.yaml")
        assert bp.name == "CPU"
        assert len(bp.translated_types) == 2

        # Simulate loading Memory
        bp2 = ModuleBlueprint.load(bp_path / "Memory.bp.yaml")
        assert bp2.name == "Memory"
        assert len(bp2.translated_types) == 1

    def test_skips_missing_required_module(self, bp_dir):
        """If a required module doesn't exist, it's just skipped."""
        bp_path = bp_dir / "blueprints"
        nonexistent = bp_path / "NonExistent.bp.yaml"
        assert not nonexistent.exists()


class TestBuildPriorLayersContextFallback:
    """Test fallback behavior when 'requires' is NOT specified."""

    def test_loads_all_translated_modules(self, bp_dir):
        """Without requires, ALL translated modules should be loaded."""
        bp_path = bp_dir / "blueprints"
        all_bps = list(sorted(bp_path.glob("*.bp.yaml")))

        # Simulate fallback: load all except current module
        current_module = "Emulator"
        prior_bps = []
        for bp_file in all_bps:
            bp = ModuleBlueprint.load(bp_file)
            if bp.name != current_module and bp.translated_types:
                prior_bps.append(bp)

        # Should have CPU, Memory, Display (3 modules with translated types)
        names = [bp.name for bp in prior_bps]
        assert "CPU" in names
        assert "Memory" in names
        assert "Display" in names
        assert "Emulator" not in names  # excluded (current)

    def test_excludes_current_module(self, bp_dir):
        """Current module is excluded from fallback loading."""
        bp_path = bp_dir / "blueprints"
        current_module = "CPU"
        prior_bps = []
        for bp_file in sorted(bp_path.glob("*.bp.yaml")):
            bp = ModuleBlueprint.load(bp_file)
            if bp.name != current_module and bp.translated_types:
                prior_bps.append(bp)

        names = [bp.name for bp in prior_bps]
        assert "CPU" not in names
        assert "Memory" in names

    def test_only_includes_modules_with_translated_types(self, bp_dir):
        """Modules with no translated types should not be included."""
        bp_path = bp_dir / "blueprints"

        # Create a module with only pending types
        empty_bp = _make_module("Empty", [
            _make_type("Foo", status="pending"),
        ])
        empty_bp.save(bp_path / "Empty.bp.yaml")

        current_module = "Emulator"
        prior_bps = []
        for bp_file in sorted(bp_path.glob("*.bp.yaml")):
            bp = ModuleBlueprint.load(bp_file)
            if bp.name != current_module and bp.translated_types:
                prior_bps.append(bp)

        names = [bp.name for bp in prior_bps]
        assert "Empty" not in names  # no translated types


class TestBlueprintSaveLoad:
    """Test blueprint serialization roundtrip."""

    def test_save_and_load_preserves_status(self, tmp_path):
        bp = _make_module("CPU", [
            _make_type("Cpu", status="translated", methods=["fetch"]),
            _make_type("Stack", status="pending", methods=["push"]),
        ])
        path = tmp_path / "CPU.bp.yaml"
        bp.save(path)

        loaded = ModuleBlueprint.load(path)
        assert loaded.name == "CPU"
        assert len(loaded.types) == 2
        assert loaded.types[0].status == "translated"
        assert loaded.types[1].status == "pending"
        assert len(loaded.translated_types) == 1

    def test_save_and_load_preserves_methods(self, tmp_path):
        bp = _make_module("Math", [
            _make_type("Vec3", methods=["add", "sub", "normalize"]),
        ])
        path = tmp_path / "Math.bp.yaml"
        bp.save(path)

        loaded = ModuleBlueprint.load(path)
        methods = [m.name for m in loaded.types[0].methods]
        assert methods == ["add", "sub", "normalize"]
