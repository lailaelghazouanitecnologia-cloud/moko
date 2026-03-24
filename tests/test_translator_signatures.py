"""Tests for translator signature extraction — sibling and cross-module."""
import os
import pytest
from pathlib import Path
from unittest.mock import MagicMock

from src.agent.dev.blueprint import TypeBlueprint, ModuleBlueprint, MethodSpec, FieldSpec
from src.agent.dev.translator import BlueprintTranslator, to_kebab_case


@pytest.fixture
def tmp_project(tmp_path):
    """Create a temporary project directory with generated .ts files."""
    # CPU module
    cpu_dir = tmp_path / "src" / "CPU"
    cpu_dir.mkdir(parents=True)
    (cpu_dir / "cpu.ts").write_text("""\
export class Cpu {
    private pc: number;
    private v: Uint8Array;
    private stack: number[];

    constructor() {
        this.pc = 0x200;
        this.v = new Uint8Array(16);
        this.stack = [];
    }

    public fetch(): number {
        const high = this.memory[this.pc] << 8;
        const low = this.memory[this.pc + 1];
        this.pc += 2;
        return high | low;
    }

    public execute(opcode: number): void {
        const nibble = (opcode & 0xF000) >> 12;
    }

    public reset(): void {
        this.pc = 0x200;
    }
}
""")
    (cpu_dir / "register-bank.ts").write_text("""\
export class RegisterBank {
    private v: Uint8Array;

    constructor() {
        this.v = new Uint8Array(16);
    }

    public get(index: number): number {
        return this.v[index];
    }

    public set(index: number, value: number): void {
        this.v[index] = value & 0xFF;
    }
}
""")

    # Memory module
    mem_dir = tmp_path / "src" / "Memory"
    mem_dir.mkdir(parents=True)
    (mem_dir / "ram.ts").write_text("""\
export class Ram {
    private data: Uint8Array;

    constructor() {
        this.data = new Uint8Array(4096);
    }

    public read(address: number): number {
        return this.data[address];
    }

    public write(address: number, value: number): void {
        this.data[address] = value & 0xFF;
    }

    public loadRom(rom: Uint8Array): void {
        this.data.set(rom, 0x200);
    }
}
""")

    # Display module
    disp_dir = tmp_path / "src" / "Display"
    disp_dir.mkdir(parents=True)
    (disp_dir / "frame-buffer.ts").write_text("""\
export class FrameBuffer {
    public pixels: Uint8Array;
    private width: number;
    private height: number;

    constructor(width: number = 64, height: number = 32) {
        this.width = width;
        this.height = height;
        this.pixels = new Uint8Array(width * height);
    }

    public clear(): void {
        this.pixels.fill(0);
    }

    public togglePixel(x: number, y: number): boolean {
        const idx = y * this.width + x;
        this.pixels[idx] ^= 1;
        return this.pixels[idx] === 0;
    }

    public getPixel(x: number, y: number): number {
        return this.pixels[y * this.width + x];
    }
}
""")
    return tmp_path


@pytest.fixture
def mock_llm():
    """Create a mock LLM provider."""
    llm = MagicMock()
    llm.complete_with_usage.return_value = ("// generated code", 100)
    return llm


def _make_type(name, target_file="", status="pending", methods=None, fields=None):
    return TypeBlueprint(
        name=name,
        target_file=target_file,
        status=status,
        methods=[MethodSpec(name=m) for m in (methods or [])],
        fields=[FieldSpec(name=f) for f in (fields or [])],
    )


def _make_module(name, types, target_dir=""):
    return ModuleBlueprint(
        name=name,
        types=types,
        target_dir=target_dir or f"src/{name}",
    )


# ── to_kebab_case ──────────────────────────────────────────

class TestToKebabCase:
    def test_pascal_case(self):
        assert to_kebab_case("EventEmitter") == "event-emitter"

    def test_simple(self):
        assert to_kebab_case("Mat4") == "mat4"

    def test_acronym(self):
        assert to_kebab_case("GraphicsDevice") == "graphics-device"

    def test_single_word(self):
        assert to_kebab_case("Vec3") == "vec3"


# ── _build_sibling_signatures ──────────────────────────────

class TestBuildSiblingSignatures:
    def test_extracts_sibling_signatures(self, tmp_project, mock_llm):
        translator = BlueprintTranslator(llm=mock_llm)

        target = _make_type("RegisterBank", target_file="src/CPU/register-bank.ts",
                            status="pending")
        sibling = _make_type("Cpu", target_file="src/CPU/cpu.ts", status="translated")
        module = _make_module("CPU", [target, sibling], target_dir="src/CPU")

        result = translator._build_sibling_signatures(target, module, tmp_project)
        assert "Cpu" in result
        assert "fetch" in result
        assert "execute" in result

    def test_skips_pending_types(self, tmp_project, mock_llm):
        translator = BlueprintTranslator(llm=mock_llm)

        target = _make_type("Cpu", target_file="src/CPU/cpu.ts", status="pending")
        pending = _make_type("RegisterBank", target_file="src/CPU/register-bank.ts",
                             status="pending")
        module = _make_module("CPU", [target, pending], target_dir="src/CPU")

        result = translator._build_sibling_signatures(target, module, tmp_project)
        assert result == ""  # nothing translated yet

    def test_respects_max_chars(self, tmp_project, mock_llm):
        translator = BlueprintTranslator(llm=mock_llm)

        target = _make_type("Cpu", target_file="src/CPU/cpu.ts", status="pending")
        sibling = _make_type("RegisterBank", target_file="src/CPU/register-bank.ts",
                             status="translated")
        module = _make_module("CPU", [target, sibling], target_dir="src/CPU")

        result = translator._build_sibling_signatures(target, module, tmp_project)
        assert len(result) <= 2000


# ── _build_cross_module_signatures ─────────────────────────

class TestBuildCrossModuleSignatures:
    def test_extracts_from_other_modules(self, tmp_project, mock_llm):
        translator = BlueprintTranslator(llm=mock_llm)

        # Prior modules (already translated)
        cpu_bp = _make_module("CPU", [
            _make_type("Cpu", target_file="src/CPU/cpu.ts", status="translated"),
            _make_type("RegisterBank", target_file="src/CPU/register-bank.ts",
                       status="translated"),
        ], target_dir="src/CPU")

        mem_bp = _make_module("Memory", [
            _make_type("Ram", target_file="src/Memory/ram.ts", status="translated"),
        ], target_dir="src/Memory")

        translator.prior_modules = [cpu_bp, mem_bp]

        # Current type being translated (in Emulator module)
        target = _make_type("Emulator", target_file="src/Emulator/emulator.ts")
        module = _make_module("Emulator", [target], target_dir="src/Emulator")

        result = translator._build_cross_module_signatures(target, module, tmp_project)

        # Should include CPU signatures
        assert "fetch(): number" in result
        assert "execute(opcode: number): void" in result
        # Should include Memory signatures
        assert "read(address: number): number" in result
        assert "write(address: number, value: number): void" in result
        assert "loadRom(rom: Uint8Array): void" in result

    def test_empty_when_no_prior_modules(self, tmp_project, mock_llm):
        translator = BlueprintTranslator(llm=mock_llm)
        translator.prior_modules = []

        target = _make_type("Emulator")
        module = _make_module("Emulator", [target])

        result = translator._build_cross_module_signatures(target, module, tmp_project)
        assert result == ""

    def test_skips_untranslated_types(self, tmp_project, mock_llm):
        translator = BlueprintTranslator(llm=mock_llm)

        cpu_bp = _make_module("CPU", [
            _make_type("Cpu", target_file="src/CPU/cpu.ts", status="translated"),
            _make_type("Stack", target_file="src/CPU/stack.ts", status="pending"),
        ], target_dir="src/CPU")
        translator.prior_modules = [cpu_bp]

        target = _make_type("Emulator")
        module = _make_module("Emulator", [target])

        result = translator._build_cross_module_signatures(target, module, tmp_project)
        assert "Cpu" in result
        # Stack is pending so its file isn't read (even if it exists on disk)

    def test_includes_display_signatures(self, tmp_project, mock_llm):
        translator = BlueprintTranslator(llm=mock_llm)

        disp_bp = _make_module("Display", [
            _make_type("FrameBuffer", target_file="src/Display/frame-buffer.ts",
                       status="translated"),
        ], target_dir="src/Display")
        translator.prior_modules = [disp_bp]

        target = _make_type("Emulator")
        module = _make_module("Emulator", [target])

        result = translator._build_cross_module_signatures(target, module, tmp_project)
        assert "togglePixel(x: number, y: number): boolean" in result
        assert "getPixel(x: number, y: number): number" in result
        assert "clear(): void" in result

    def test_respects_max_chars(self, tmp_project, mock_llm):
        translator = BlueprintTranslator(llm=mock_llm)

        # Load all modules
        cpu_bp = _make_module("CPU", [
            _make_type("Cpu", target_file="src/CPU/cpu.ts", status="translated"),
            _make_type("RegisterBank", target_file="src/CPU/register-bank.ts",
                       status="translated"),
        ])
        mem_bp = _make_module("Memory", [
            _make_type("Ram", target_file="src/Memory/ram.ts", status="translated"),
        ])
        disp_bp = _make_module("Display", [
            _make_type("FrameBuffer", target_file="src/Display/frame-buffer.ts",
                       status="translated"),
        ])
        translator.prior_modules = [cpu_bp, mem_bp, disp_bp]

        target = _make_type("Emulator")
        module = _make_module("Emulator", [target])

        result = translator._build_cross_module_signatures(target, module, tmp_project)
        assert len(result) <= 4000
