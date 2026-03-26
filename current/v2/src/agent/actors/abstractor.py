"""
AbstractorActor — extracted from DevSupervisor.run_abstraction.

Post-block abstraction: evaluate what was accomplished, decide what's next,
register insights, and propose plan adjustments.
"""
from __future__ import annotations

import json
from typing import Optional

from ..core.models import (
    Block, AbstractionResult, FeatureDecision,
)
from ..core.llm import LLMCaller
from ..xvm.vm import BlockVM


class AbstractorActor:
    """Runs post-block abstraction to evaluate and decide next steps."""

    def __init__(self, caller: LLMCaller, vm: BlockVM = None,
                 verbose: bool = False):
        self.caller = caller
        self.vm = vm
        self.verbose = verbose

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [abstractor] {msg}")

    def abstract(self, block: Block, plan_status: str = "") -> AbstractionResult:
        """Post-block abstraction: evaluate + decide what's next."""
        self._log(f"abstracting block {block.index}...")

        block_output = block.output[:4000]

        # Include discussion summaries
        disc_summary = ""
        if block.discussions:
            disc_parts = []
            for d in block.discussions:
                disc_parts.append(f"Topic: {d.topic} → Consensus: {d.consensus}")
                for p in d.points:
                    disc_parts.append(f"  [{p.stance.value}] {p.conclusion} ({p.confidence:.0%})")
            disc_summary = "\n".join(disc_parts)

        # Include registry for cross-block awareness
        registry_summary = ""
        if self.vm and self.vm.registry:
            registry_summary = "\n".join(
                f"[{r.category}] {r.content[:80]} (relevance={r.relevance:.0%})"
                for r in self.vm.registry[-10:]
            )

        system = (
            "You are the abstraction engine. After each block, you:\n\n"
            "1. ACHIEVEMENTS: What was accomplished? (list)\n"
            "2. IMPROVEMENTS: What could be better? (list)\n"
            "3. FEATURE DECISIONS: For each feature from references:\n"
            "   {feature, source, value_score: 0-1, effort_score: 0-1, "
            "    verdict: adopt|adapt|skip|defer, reasoning}\n"
            "4. REGISTER: Insights worth saving for future blocks (list of strings)\n"
            "5. DISCARD: Things not worth keeping (list of strings)\n"
            "6. NEXT_PRIORITY: What should next block focus on?\n"
            "7. CONFIDENCE: 0-1 overall progress confidence\n\n"
            "Be ruthless: value < 0.5 = skip. value >= 0.7 & effort <= 0.5 = adopt.\n\n"
            "Output JSON with all keys above."
        )

        user = f"Block {block.index} [{block.block_type.value}]: {block.objective}\n\n"
        user += f"Output:\n{block_output}\n\n"
        if disc_summary:
            user += f"Discussions:\n{disc_summary}\n\n"
        if registry_summary:
            user += f"Registry so far:\n{registry_summary}\n\n"
        user += f"Plan:\n{plan_status}\n"

        content, tokens = self.caller.call(system, user, max_tokens=2048)

        try:
            data = LLMCaller.parse_json_response(content)
        except (json.JSONDecodeError, IndexError):
            data = {
                "achievements": ["Block completed"],
                "improvements": [],
                "feature_decisions": [],
                "register": [],
                "discard": [],
                "next_priority": "Continue",
                "confidence": 0.5,
            }

        # Build feature decisions
        feature_decisions = []
        for fd in data.get("feature_decisions", []):
            feature_decisions.append(FeatureDecision(
                feature=fd.get("feature", ""),
                source=fd.get("source", ""),
                value_score=fd.get("value_score", fd.get("value", 0.5)),
                effort_score=fd.get("effort_score", fd.get("effort", 0.5)),
                verdict=fd.get("verdict", "skip"),
                reasoning=fd.get("reasoning", ""),
            ))

        result = AbstractionResult(
            block_hash=block.hash,
            achievements=data.get("achievements", []),
            improvements=data.get("improvements", []),
            feature_decisions=feature_decisions,
            next_priority=data.get("next_priority", ""),
            confidence=data.get("confidence", 0.5),
        )
        block.abstraction = result

        # Process register/discard via VM
        if self.vm:
            for insight in data.get("register", []):
                self.vm.register(insight, f"block_{block.index}", "abstraction")
            for item in data.get("discard", []):
                self.vm.discard(item)

        self._log(f"abstraction: {len(feature_decisions)} features, "
                  f"confidence={result.confidence:.0%}, "
                  f"+{len(data.get('register', []))} registered, "
                  f"-{len(data.get('discard', []))} discarded")
        return result
