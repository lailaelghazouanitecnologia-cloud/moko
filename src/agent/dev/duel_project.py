"""
ProjectDuel — fair head-to-head: Ava full pipeline vs Claude iterative.

ava duel --project -t chip8 -g "Chip-8 emulator in TypeScript"

NO references. Both agents get the same spec. Both work iteratively.

Agent AVA:
  1. LLM generates ProjectBlueprint from spec
  2. DevSupervisor executes layered plan (ANALYZE → IMPLEMENT per layer)
  3. Full pipeline: blueprints, discussions, plan blockchain, density

Agent CLAUDE (iterative):
  1. LLM designs architecture (modules + types)
  2. For each module (in dependency order):
     - Generate code with context of previously generated modules
  3. Generate integration main.ts

Benchmark:
  - Total LOC, methods, TSC errors
  - Opcode/feature coverage (spec-specific)
  - Tokens consumed, time elapsed
"""
from __future__ import annotations

import hashlib
import time
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from ..llm.providers import LLMProvider, LLMMessage
from .. import OUT_DIR


# ── Chip-8 Spec (shared by both agents) ─────────────────────

CHIP8_SPEC = """\
Build a complete Chip-8 emulator/interpreter in TypeScript.

## Chip-8 Architecture
- 4KB RAM (0x000-0xFFF), programs start at 0x200
- 16 general-purpose 8-bit registers: V0-VF
- 16-bit index register (I), 16-bit program counter (PC)
- Stack: 16 levels for subroutine calls
- Delay timer & sound timer (both count down at 60Hz)
- Display: 64x32 monochrome pixels, drawn via XOR sprites
- Input: 16-key hex keypad (0x0-0xF)
- Font: built-in 4x5 pixel font for hex digits 0-F at 0x000-0x04F

## Opcodes (35 total)
00E0 - Clear screen
00EE - Return from subroutine
1NNN - Jump to NNN
2NNN - Call subroutine at NNN
3XNN - Skip next if VX == NN
4XNN - Skip next if VX != NN
5XY0 - Skip next if VX == VY
6XNN - Set VX = NN
7XNN - Add NN to VX (no carry flag)
8XY0 - Set VX = VY
8XY1 - Set VX = VX | VY
8XY2 - Set VX = VX & VY
8XY3 - Set VX = VX ^ VY
8XY4 - Add VY to VX (VF = carry)
8XY5 - Sub VY from VX (VF = not borrow)
8XY6 - Shift VX right (VF = LSB before shift)
8XY7 - Set VX = VY - VX (VF = not borrow)
8XYE - Shift VX left (VF = MSB before shift)
9XY0 - Skip next if VX != VY
ANNN - Set I = NNN
BNNN - Jump to NNN + V0
CXNN - Set VX = random & NN
DXYN - Draw N-height sprite at (VX,VY) from I (VF = collision)
EX9E - Skip next if key VX is pressed
EXA1 - Skip next if key VX is NOT pressed
FX07 - Set VX = delay timer
FX0A - Wait for key press, store in VX
FX15 - Set delay timer = VX
FX18 - Set sound timer = VX
FX1E - Add VX to I
FX29 - Set I = font address for digit VX
FX33 - Store BCD of VX at I, I+1, I+2
FX55 - Store V0-VX in memory starting at I
FX65 - Load V0-VX from memory starting at I

## Modules (recommended structure)
1. memory.ts — RAM, load ROM, font data
2. cpu.ts — registers, PC, stack, fetch/decode/execute cycle
3. display.ts — 64x32 framebuffer, draw sprite with XOR, clear
4. input.ts — 16-key state, key press/release, wait-for-key
5. opcodes.ts — all 35 opcode handlers
6. emulator.ts — main loop tying CPU + display + input + timers
"""

CHIP8_OPCODES = [
    "00E0", "00EE", "1NNN", "2NNN", "3XNN", "4XNN", "5XY0",
    "6XNN", "7XNN", "8XY0", "8XY1", "8XY2", "8XY3", "8XY4",
    "8XY5", "8XY6", "8XY7", "8XYE", "9XY0", "ANNN", "BNNN",
    "CXNN", "DXYN", "EX9E", "EXA1", "FX07", "FX0A", "FX15",
    "FX18", "FX1E", "FX29", "FX33", "FX55", "FX65",
]


@dataclass
class AgentResult:
    """Aggregate result of one agent generating the full project."""
    agent: str              # "ava" or "claude"
    files: dict = field(default_factory=dict)  # path → code
    total_loc: int = 0
    total_methods: int = 0
    total_tsc_errors: int = 0
    total_tokens: int = 0
    elapsed_s: float = 0.0
    opcodes_found: list = field(default_factory=list)
    opcode_coverage: float = 0.0
    file_count: int = 0


@dataclass
class ProjectDuelReport:
    """Full project-level duel report."""
    target: str
    spec: str
    ava: Optional[AgentResult] = None
    claude: Optional[AgentResult] = None
    elapsed_s: float = 0.0


class ProjectDuel:
    """Fair project-level duel: Ava full pipeline vs Claude iterative."""

    def __init__(self, config: dict = None):
        config = config or {}
        self.llm = LLMProvider(
            provider=config.get("provider", "groq"),
            model=config.get("model"),
        )
        self.verbose = config.get("verbose", False)
        self.config = config
        self.projects_dir = Path("projects")

        from .guardrails import RunGuard, RunLimits
        self.guard = config.get("_guard") or RunGuard(RunLimits.from_config(config))

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [duel] {msg}")

    def run(self, target: str, goal: str = "") -> ProjectDuelReport:
        """Run both agents on the same project spec."""
        t0 = time.time()
        spec = goal or CHIP8_SPEC
        report = ProjectDuelReport(target=target, spec=spec)

        project_dir = self.projects_dir / target
        project_dir.mkdir(parents=True, exist_ok=True)

        # ── Agent A: Ava full pipeline ──────────────────────
        print(f"\n{'━' * 70}")
        print(f"  AGENT AVA — Full Pipeline (blueprint → plan → supervisor)")
        print(f"{'━' * 70}")

        report.ava = self._run_ava(target, spec, project_dir)

        # ── Agent B: Claude iterative ───────────────────────
        print(f"\n{'━' * 70}")
        print(f"  AGENT CLAUDE — Iterative (architecture → module-by-module)")
        print(f"{'━' * 70}")

        report.claude = self._run_claude(target, spec, project_dir)

        # ── Compare ─────────────────────────────────────────
        report.elapsed_s = time.time() - t0
        self._print_comparison(report)
        self._save_results(target, report)

        return report

    # ── Agent A: Ava Pipeline ───────────────────────────────

    def _run_ava(self, target: str, spec: str,
                 project_dir: Path) -> AgentResult:
        """Run through full Ava pipeline: blueprint → supervisor → manager."""
        t0 = time.time()
        result = AgentResult(agent="ava")

        ava_dir = project_dir / "duel" / "ava"
        ava_dir.mkdir(parents=True, exist_ok=True)
        (ava_dir / "blueprints").mkdir(exist_ok=True)

        try:
            # 1. Generate ProjectBlueprint from spec
            self._log("generating project blueprint...")
            from ..engines.blueprint.project import generate_project_blueprint
            project_bp = generate_project_blueprint(spec, target, self.llm)

            if not project_bp:
                print("  Blueprint generation failed, falling back to LLM plan")

            if project_bp:
                print(f"  Blueprint: {project_bp.total_types} types, "
                      f"{len(project_bp.layers)} layers")
                bp_path = ava_dir / "project.bp.yaml"
                project_bp.save(bp_path)

            # 2. Run DevSupervisor (NO references — fair test)
            self._log("running supervisor...")
            from .supervisor import DevSupervisor

            config = dict(self.config)
            config["_guard"] = self.guard
            supervisor = DevSupervisor(config)

            plan = supervisor.run(
                goal=spec,
                target=target,
                references=[],  # NO REFS — fair test
                max_iterations=50,
                project_bp=project_bp,
            )

            result.total_tokens = plan.total_tokens

            # 3. Collect generated files
            src_dir = self.projects_dir / target / "src"
            if src_dir.exists():
                for ts_file in src_dir.rglob("*.ts"):
                    rel = str(ts_file.relative_to(self.projects_dir / target))
                    code = ts_file.read_text()
                    result.files[rel] = code

                    # Copy to duel workspace
                    dst = ava_dir / rel
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    dst.write_text(code)

        except Exception as e:
            from .guardrails import GuardrailTripped
            if isinstance(e, GuardrailTripped):
                print(f"  ⛔ {e}")
            else:
                print(f"  ⚠ ERROR: {e}")

        # 4. Compute metrics
        result = self._compute_metrics(result, ava_dir)
        result.elapsed_s = time.time() - t0

        print(f"\n  AVA: {result.file_count} files, {result.total_loc} LOC, "
              f"{result.total_methods} methods, "
              f"opcodes={result.opcode_coverage:.0%}, "
              f"{result.total_tokens:,} tokens, {result.elapsed_s:.1f}s")

        return result

    # ── Agent B: Claude Iterative ───────────────────────────

    def _run_claude(self, target: str, spec: str,
                    project_dir: Path) -> AgentResult:
        """Run Claude with iterative multi-step generation."""
        t0 = time.time()
        result = AgentResult(agent="claude")
        total_tokens = 0

        claude_dir = project_dir / "duel" / "claude"
        claude_dir.mkdir(parents=True, exist_ok=True)
        (claude_dir / "src").mkdir(exist_ok=True)

        # Step 1: Design architecture
        print("\n  Step 1: Designing architecture...")
        self.guard.throttle()
        arch_resp = self.llm.complete_with_usage(
            [
                LLMMessage("system",
                    "You are an expert TypeScript architect. Design a module "
                    "structure for the given project. Output JSON:\n"
                    "{\"modules\": [{\"name\": \"memory\", \"file\": \"src/memory.ts\", "
                    "\"depends_on\": [], \"description\": \"...\", "
                    "\"exports\": [\"Memory\"]}]}\n"
                    "Order modules by dependency (foundations first)."
                ),
                LLMMessage("user", f"Design the architecture for:\n\n{spec}")
            ],
            temperature=0.3,
            max_tokens=2048,
        )
        arch_tokens = arch_resp.usage.total_tokens if arch_resp.usage else 0
        total_tokens += arch_tokens
        self.guard.record_tokens(arch_tokens)

        # Parse architecture
        modules = self._parse_architecture(arch_resp.content)
        if not modules:
            print("  Architecture parsing failed!")
            result.elapsed_s = time.time() - t0
            result.total_tokens = total_tokens
            return result

        print(f"  Architecture: {len(modules)} modules")
        for m in modules:
            print(f"    - {m['file']}: {m.get('description', '')[:50]}")

        # Step 2: Generate each module iteratively
        generated_context = {}  # file → code (accumulated context)

        for i, mod in enumerate(modules):
            self.guard.check_time()
            self.guard.throttle()

            mod_name = mod.get("name", f"module_{i}")
            mod_file = mod.get("file", f"src/{mod_name}.ts")
            mod_desc = mod.get("description", "")
            mod_deps = mod.get("depends_on", [])
            mod_exports = mod.get("exports", [])

            print(f"\n  Step {i+2}: Generating {mod_file}...")

            # Build context from previously generated modules
            prev_context = ""
            for dep_name in mod_deps:
                for prev_file, prev_code in generated_context.items():
                    if dep_name.lower() in prev_file.lower():
                        # Include interface only (first 60 lines or exported types)
                        lines = prev_code.split("\n")
                        # Extract exports and class/interface signatures
                        sig_lines = []
                        for line in lines:
                            stripped = line.strip()
                            if (stripped.startswith("export ") or
                                stripped.startswith("class ") or
                                stripped.startswith("interface ") or
                                stripped.startswith("public ") or
                                stripped.startswith("constructor") or
                                stripped.startswith("get ") or
                                stripped.startswith("set ")):
                                sig_lines.append(line)
                        if sig_lines:
                            prev_context += f"\n// {prev_file} (signatures)\n"
                            prev_context += "\n".join(sig_lines[:40]) + "\n"

            system = (
                "You are an expert TypeScript developer building a Chip-8 emulator. "
                "Write complete, production-quality TypeScript code.\n"
                "Output ONLY the TypeScript code, no markdown fences, no explanations.\n"
                "Use strict types, no `any`. Export all public classes/functions."
            )

            user = f"## Project Spec\n{spec}\n\n"
            user += f"## Current Module\n"
            user += f"File: {mod_file}\n"
            user += f"Description: {mod_desc}\n"
            if mod_exports:
                user += f"Must export: {', '.join(mod_exports)}\n"

            if prev_context:
                user += f"\n## Already Generated (use these imports)\n{prev_context}\n"

            user += (
                f"\n## Instructions\n"
                f"Implement {mod_file} completely. "
                f"This is module {i+1}/{len(modules)} of the project.\n"
                f"Import from previously generated modules as needed."
            )

            resp = self.llm.complete_with_usage(
                [LLMMessage("system", system), LLMMessage("user", user)],
                temperature=0.3,
                max_tokens=6000,
            )

            mod_tokens = resp.usage.total_tokens if resp.usage else 0
            total_tokens += mod_tokens
            self.guard.record_tokens(mod_tokens)

            # Clean code
            code = resp.content.strip()
            if code.startswith("```"):
                lines = code.split("\n")
                code = "\n".join(l for l in lines if not l.startswith("```"))

            # Write to duel workspace
            full_path = claude_dir / mod_file
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(code + "\n")

            result.files[mod_file] = code
            generated_context[mod_file] = code

            loc = len(code.splitlines())
            methods = _count_methods(code)
            print(f"    → {loc} LOC, {methods} methods, {mod_tokens} tokens")

        result.total_tokens = total_tokens

        # 3. Compute metrics
        result = self._compute_metrics(result, claude_dir)
        result.elapsed_s = time.time() - t0

        print(f"\n  CLAUDE: {result.file_count} files, {result.total_loc} LOC, "
              f"{result.total_methods} methods, "
              f"opcodes={result.opcode_coverage:.0%}, "
              f"{result.total_tokens:,} tokens, {result.elapsed_s:.1f}s")

        return result

    def _parse_architecture(self, content: str) -> list[dict]:
        """Parse LLM architecture JSON."""
        try:
            text = content.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(l for l in lines if not l.startswith("```"))

            data = json.loads(text)
            modules = data if isinstance(data, list) else data.get("modules", [])
            return modules
        except Exception:
            return []

    # ── Metrics ─────────────────────────────────────────────

    def _compute_metrics(self, result: AgentResult,
                         work_dir: Path) -> AgentResult:
        """Compute aggregate metrics for all generated files."""
        total_loc = 0
        total_methods = 0
        total_tsc = 0
        all_code = ""

        for rel_path, code in result.files.items():
            total_loc += len(code.splitlines())
            total_methods += _count_methods(code)
            all_code += code + "\n"

        # TSC check on each file
        from .evaluation import _check_tsc
        for rel_path in result.files:
            full = work_dir / rel_path
            if full.exists():
                errs = _check_tsc(full)
                if errs >= 0:
                    total_tsc += errs

        # Opcode coverage: scan all code for opcode patterns
        opcodes_found = self._detect_opcodes(all_code)

        result.total_loc = total_loc
        result.total_methods = total_methods
        result.total_tsc_errors = total_tsc
        result.file_count = len(result.files)
        result.opcodes_found = opcodes_found
        result.opcode_coverage = len(opcodes_found) / len(CHIP8_OPCODES)

        return result

    def _detect_opcodes(self, code: str) -> list[str]:
        """Detect which Chip-8 opcodes are implemented in the code."""
        found = []
        code_lower = code.lower()

        # Map opcode patterns to detection heuristics
        checks = {
            "00E0": ["clear", "cls", "0x00e0", "00e0"],
            "00EE": ["return", "ret", "0x00ee", "00ee", "stack.pop", "stackpointer"],
            "1NNN": ["jump", "0x1", "pc = nnn", "pc=nnn", "case 0x1"],
            "2NNN": ["call", "0x2", "stack.push", "case 0x2"],
            "3XNN": ["skip.*==", "3x", "case 0x3"],
            "4XNN": ["skip.*!=", "4x", "case 0x4"],
            "5XY0": ["skip.*vx.*vy", "5xy", "case 0x5"],
            "6XNN": ["set.*vx.*nn", "6x", "case 0x6", "v[x] = nn", "v[x]=nn"],
            "7XNN": ["add.*nn", "7x", "case 0x7", "v[x] += nn", "v[x]+=nn"],
            "8XY0": ["set.*vx.*vy", "8xy0", "case 0x0"],
            "8XY1": ["or", "8xy1", "|="],
            "8XY2": ["and", "8xy2", "&="],
            "8XY3": ["xor", "8xy3", "^="],
            "8XY4": ["add.*carry", "8xy4", "0xff"],
            "8XY5": ["sub.*borrow", "8xy5"],
            "8XY6": ["shift.*right", "shr", "8xy6", ">> 1", ">>1"],
            "8XY7": ["subn", "8xy7", "vy - vx", "vy-vx"],
            "8XYE": ["shift.*left", "shl", "8xye", "<< 1", "<<1"],
            "9XY0": ["skip.*!=.*vy", "9xy", "case 0x9"],
            "ANNN": ["set.*i.*nnn", "annn", "index", "case 0xa"],
            "BNNN": ["jump.*v0", "bnnn", "case 0xb"],
            "CXNN": ["random", "rand", "cxnn", "case 0xc", "math.random"],
            "DXYN": ["draw", "sprite", "dxyn", "case 0xd", "collision"],
            "EX9E": ["key.*press", "skp", "ex9e", "0x9e"],
            "EXA1": ["key.*not.*press", "sknp", "exa1", "0xa1"],
            "FX07": ["delay.*timer", "fx07", "0x07"],
            "FX0A": ["wait.*key", "fx0a", "0x0a"],
            "FX15": ["delay.*=.*vx", "fx15", "0x15"],
            "FX18": ["sound.*=.*vx", "fx18", "0x18"],
            "FX1E": ["i.*+=.*vx", "fx1e", "0x1e", "add.*i"],
            "FX29": ["font", "fx29", "0x29", "sprite.*address"],
            "FX33": ["bcd", "fx33", "0x33", "decimal", "hundreds"],
            "FX55": ["store.*reg", "fx55", "0x55", "memory.*v0"],
            "FX65": ["load.*reg", "fx65", "0x65", "v0.*memory"],
        }

        for opcode, patterns in checks.items():
            for pat in patterns:
                if pat in code_lower:
                    found.append(opcode)
                    break

        return found

    # ── Output ──────────────────────────────────────────────

    def _print_comparison(self, report: ProjectDuelReport):
        """Print final comparison table."""
        W = 70
        a = report.ava
        c = report.claude

        if not a or not c:
            print("  One agent failed — no comparison possible.")
            return

        print(f"\n{'━' * W}")
        print(f"  PROJECT DUEL: {report.target}")
        print(f"{'━' * W}")
        print(f"\n  {'Metric':<25} {'AVA':>15} {'CLAUDE':>15} {'Winner':>10}")
        print(f"  {'─' * (W - 4)}")

        rows = [
            ("Files", a.file_count, c.file_count, "more"),
            ("Total LOC", a.total_loc, c.total_loc, "less"),
            ("Total Methods", a.total_methods, c.total_methods, "more"),
            ("TSC Errors", a.total_tsc_errors, c.total_tsc_errors, "less"),
            ("Opcode Coverage", f"{a.opcode_coverage:.0%}", f"{c.opcode_coverage:.0%}", None),
            ("Opcodes Found", f"{len(a.opcodes_found)}/35", f"{len(c.opcodes_found)}/35", "more_raw"),
            ("Tokens Used", f"{a.total_tokens:,}", f"{c.total_tokens:,}", None),
            ("Time", f"{a.elapsed_s:.1f}s", f"{c.elapsed_s:.1f}s", None),
        ]

        ava_score = 0
        claude_score = 0

        for label, av, cv, direction in rows:
            if direction == "more":
                w = "AVA" if av > cv else ("CLAUDE" if cv > av else "TIE")
            elif direction == "less":
                w = "AVA" if av < cv else ("CLAUDE" if cv < av else "TIE")
            elif direction == "more_raw":
                a_num = len(a.opcodes_found)
                c_num = len(c.opcodes_found)
                w = "AVA" if a_num > c_num else ("CLAUDE" if c_num > a_num else "TIE")
            else:
                w = "—"

            if w == "AVA":
                ava_score += 1
            elif w == "CLAUDE":
                claude_score += 1

            print(f"  {label:<25} {str(av):>15} {str(cv):>15} {w:>10}")

        print(f"  {'─' * (W - 4)}")

        # Opcode diff
        ava_set = set(a.opcodes_found)
        claude_set = set(c.opcodes_found)
        only_ava = ava_set - claude_set
        only_claude = claude_set - ava_set
        if only_ava:
            print(f"\n  Opcodes ONLY in AVA:    {', '.join(sorted(only_ava))}")
        if only_claude:
            print(f"  Opcodes ONLY in CLAUDE: {', '.join(sorted(only_claude))}")

        missing_both = set(CHIP8_OPCODES) - ava_set - claude_set
        if missing_both:
            print(f"  Missing from BOTH:      {', '.join(sorted(missing_both))}")

        # Final verdict
        print(f"\n  {'─' * (W - 4)}")
        # Weight: opcode coverage (40%), methods (20%), TSC (20%), LOC (10%), files (10%)
        ava_pts = 0.0
        claude_pts = 0.0

        # Opcode coverage (40 pts)
        if a.opcode_coverage > c.opcode_coverage:
            ava_pts += 40
        elif c.opcode_coverage > a.opcode_coverage:
            claude_pts += 40
        else:
            ava_pts += 20
            claude_pts += 20

        # Methods (20 pts)
        if a.total_methods > c.total_methods:
            ava_pts += 20
        elif c.total_methods > a.total_methods:
            claude_pts += 20
        else:
            ava_pts += 10
            claude_pts += 10

        # TSC errors (20 pts) — fewer is better
        if a.total_tsc_errors < c.total_tsc_errors:
            ava_pts += 20
        elif c.total_tsc_errors < a.total_tsc_errors:
            claude_pts += 20
        else:
            ava_pts += 10
            claude_pts += 10

        # LOC (10 pts) — more is better for a complete project
        if a.total_loc > c.total_loc:
            ava_pts += 10
        elif c.total_loc > a.total_loc:
            claude_pts += 10
        else:
            ava_pts += 5
            claude_pts += 5

        # Files (10 pts) — more = better structure
        if a.file_count > c.file_count:
            ava_pts += 10
        elif c.file_count > a.file_count:
            claude_pts += 10
        else:
            ava_pts += 5
            claude_pts += 5

        winner = "AVA" if ava_pts > claude_pts else (
            "CLAUDE" if claude_pts > ava_pts else "TIE")

        print(f"  FINAL SCORE: AVA {ava_pts:.0f} vs CLAUDE {claude_pts:.0f}")
        print(f"  WINNER: {winner}")
        print(f"  Total tokens: {(a.total_tokens + c.total_tokens):,}")
        print(f"  Total time: {report.elapsed_s:.1f}s")
        print(f"{'━' * W}")

    def _save_results(self, target: str, report: ProjectDuelReport):
        """Save duel results to JSON."""
        project_dir = self.projects_dir / target

        def agent_dict(r: AgentResult) -> dict:
            if not r:
                return {}
            return {
                "agent": r.agent,
                "file_count": r.file_count,
                "total_loc": r.total_loc,
                "total_methods": r.total_methods,
                "total_tsc_errors": r.total_tsc_errors,
                "total_tokens": r.total_tokens,
                "elapsed_s": round(r.elapsed_s, 2),
                "opcode_coverage": round(r.opcode_coverage, 3),
                "opcodes_found": r.opcodes_found,
                "files": list(r.files.keys()),
            }

        results = {
            "target": report.target,
            "type": "project_duel",
            "spec": "chip8",
            "ava": agent_dict(report.ava),
            "claude": agent_dict(report.claude),
            "elapsed_s": round(report.elapsed_s, 2),
        }

        out_path = project_dir / "project-duel-results.json"
        out_path.write_text(json.dumps(results, indent=2) + "\n")
        self._log(f"saved → {out_path}")


def _count_methods(code: str) -> int:
    """Count methods/functions in TypeScript code."""
    pattern = re.compile(
        r'(?:public|private|protected|static|async|get|set)\s+(\w+)\s*\('
        r'|(\w+)\s*\([^)]*\)\s*[:{]'
    )
    keywords = {"if", "for", "while", "switch", "catch", "return", "new",
                "throw", "console", "super", "import", "from", "require"}
    count = 0
    for match in pattern.finditer(code):
        name = match.group(1) or match.group(2)
        if name and name not in keywords:
            count += 1
    return count
