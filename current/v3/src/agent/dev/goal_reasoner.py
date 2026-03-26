"""
GoalReasoner — thinks about WHAT a project must do before deciding HOW.

Produces FunctionalSpec: concrete requirements, data structures, acceptance
criteria, and per-component complexity estimates. Costs 1 LLM call (~1500 tokens).

This is the missing step between "Build CHIP-8 emulator" and generating stubs.
Without it, the decomposer creates modules without knowing the domain requirements.
With it, the decomposer knows "CPU needs 35 specific opcodes" not "CPU needs 8 methods".
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from ..core.llm.providers import LLMProvider, LLMMessage


@dataclass
class ComponentSpec:
    """Spec for one component/module."""
    name: str
    complexity: str = "medium"       # "simple" | "medium" | "complex"
    target_loc: int = 150
    requirements: List[str] = field(default_factory=list)
    methods: List[str] = field(default_factory=list)
    data: List[str] = field(default_factory=list)


@dataclass
class FunctionalSpec:
    """Concrete functional specification for a project."""
    goal: str
    domain: str = ""                 # "emulator", "game", "cli", "api", etc.
    summary: str = ""                # 1-2 sentence what this IS

    # Functional requirements — WHAT the system must DO
    requirements: List[str] = field(default_factory=list)

    # Data structures with sizes/constraints
    data_structures: List[str] = field(default_factory=list)

    # How we know it works
    acceptance_criteria: List[str] = field(default_factory=list)

    # Per-component breakdown
    components: List[ComponentSpec] = field(default_factory=list)

    # Total estimated LOC
    estimated_loc: int = 0

    def to_prompt_context(self) -> str:
        """Format spec as context for downstream LLM calls."""
        parts = [f"## Functional Specification\n"]
        parts.append(f"Domain: {self.domain}")
        parts.append(f"Summary: {self.summary}\n")

        if self.requirements:
            parts.append("### Requirements (MUST implement)")
            for r in self.requirements:
                parts.append(f"- {r}")
            parts.append("")

        if self.data_structures:
            parts.append("### Data Structures")
            for d in self.data_structures:
                parts.append(f"- {d}")
            parts.append("")

        if self.components:
            parts.append("### Components")
            for c in self.components:
                parts.append(f"- **{c.name}** ({c.complexity}, ~{c.target_loc} LOC)")
                for m in c.methods[:10]:
                    parts.append(f"  - {m}")
                for r in c.requirements[:5]:
                    parts.append(f"  - REQ: {r}")
            parts.append("")

        if self.acceptance_criteria:
            parts.append("### Acceptance Criteria")
            for a in self.acceptance_criteria:
                parts.append(f"- {a}")

        return "\n".join(parts)


REASON_PROMPT = """You are a domain expert and software architect.

Analyze this project goal and produce a FUNCTIONAL SPECIFICATION.
Think deeply about what this system IS and what it must DO.

DO NOT design modules or code structure yet — only specify REQUIREMENTS.

For each major component, list:
1. EVERY concrete operation it must perform (not vague categories)
2. Data structures with exact sizes and constraints
3. Methods with specific names and what they do

Be EXHAUSTIVE. If something is an emulator, list EVERY instruction/opcode.
If it's a game, list EVERY mechanic. If it's a tool, list EVERY command.

Output ONLY valid JSON:
{
  "domain": "emulator|game|tool|api|framework|...",
  "summary": "1-2 sentence description",
  "requirements": [
    "specific requirement 1",
    "specific requirement 2"
  ],
  "data_structures": [
    "16 8-bit registers V0-VF",
    "4096 bytes RAM"
  ],
  "acceptance_criteria": [
    "can load and execute a ROM file",
    "all 35 opcodes produce correct results"
  ],
  "components": [
    {
      "name": "cpu",
      "complexity": "complex",
      "target_loc": 300,
      "requirements": ["execute 35 specific opcodes with real logic"],
      "methods": ["fetch(): read 2 bytes big-endian from PC", "execute(opcode): switch on all 35 opcodes"],
      "data": ["Uint8Array(16) for V0-VF", "Uint16Array(16) for stack"]
    }
  ],
  "estimated_loc": 800
}"""


class GoalReasoner:
    """Analyze a goal and produce functional specifications.

    One LLM call, ~1500 tokens. The ROI is huge: the difference between
    generating stubs and generating real implementations.
    """

    def __init__(self, llm: LLMProvider, verbose: bool = False):
        self.llm = llm
        self.verbose = verbose
        self.tokens_used = 0

    def reason(self, goal: str) -> FunctionalSpec:
        """Analyze goal and produce FunctionalSpec."""
        if self.verbose:
            print(f"  [reasoner] analyzing: {goal[:80]}...")

        resp = self.llm.complete_with_usage(
            [
                LLMMessage("system", REASON_PROMPT),
                LLMMessage("user", f"Goal: {goal}"),
            ],
            temperature=0.3,
            max_tokens=3000,
        )
        self.tokens_used += resp.usage.total_tokens

        spec = self._parse_spec(resp.content, goal)

        if self.verbose:
            print(f"  [reasoner] domain={spec.domain}, "
                  f"{len(spec.requirements)} requirements, "
                  f"{len(spec.components)} components, "
                  f"~{spec.estimated_loc} LOC")
            for c in spec.components:
                print(f"    {c.name}: {c.complexity} ({c.target_loc} LOC, "
                      f"{len(c.methods)} methods)")

        return spec

    def _parse_spec(self, text: str, goal: str) -> FunctionalSpec:
        """Parse LLM response into FunctionalSpec."""
        data = self._extract_json(text)
        if not data:
            # Fallback: minimal spec
            return FunctionalSpec(
                goal=goal,
                domain="unknown",
                summary=goal,
                requirements=[goal],
            )

        spec = FunctionalSpec(
            goal=goal,
            domain=data.get("domain", "unknown"),
            summary=data.get("summary", goal),
            requirements=data.get("requirements", []),
            data_structures=data.get("data_structures", []),
            acceptance_criteria=data.get("acceptance_criteria", []),
            estimated_loc=data.get("estimated_loc", 500),
        )

        for comp_data in data.get("components", []):
            comp = ComponentSpec(
                name=comp_data.get("name", "core"),
                complexity=comp_data.get("complexity", "medium"),
                target_loc=comp_data.get("target_loc", 150),
                requirements=comp_data.get("requirements", []),
                methods=comp_data.get("methods", []),
                data=comp_data.get("data", []),
            )
            spec.components.append(comp)

        return spec

    @staticmethod
    def _extract_json(text: str) -> Optional[dict]:
        text = text.strip()
        if "```" in text:
            lines = text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass
        return None
