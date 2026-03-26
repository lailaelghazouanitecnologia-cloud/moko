"""
DiscussantActor — extracted from DevSupervisor.run_discussion.

Runs structured debates about topics within blocks, cycling through
stances (advocate, critic, pragmatist, architect).
"""
from __future__ import annotations

import json
from typing import Optional

from ..core.models import (
    Block, Discussion, DiscussionPoint, Stance,
)
from ..core.llm import LLMCaller
from ..xvm.vm import BlockVM


STANCE_PROMPTS = {
    Stance.ADVOCATE: (
        "You are the ADVOCATE. Argue FOR adopting this pattern/feature.\n"
        "Find strengths, benefits, real-world advantages.\n"
        "Reference specific code patterns from the reference project.\n"
        "Be specific about what makes this valuable."
    ),
    Stance.CRITIC: (
        "You are the CRITIC. Argue AGAINST adopting this pattern/feature.\n"
        "Find weaknesses, over-engineering, unnecessary complexity.\n"
        "Question whether the value justifies the effort.\n"
        "Is there a simpler alternative?"
    ),
    Stance.PRAGMATIST: (
        "You are the PRAGMATIST. Evaluate effort vs value realistically.\n"
        "Consider: implementation time, maintenance burden, learning curve.\n"
        "If something is useful but heavy, suggest a lighter adaptation.\n"
        "Focus on what's practical for the current goal."
    ),
    Stance.ARCHITECT: (
        "You are the ARCHITECT. Consider long-term design implications.\n"
        "Will this pattern scale? Does it create coupling?\n"
        "How does it fit with existing abstractions?\n"
        "Consider the system as a whole, not just this feature."
    ),
}


class DiscussantActor:
    """Runs structured debates within blocks."""

    def __init__(self, caller: LLMCaller, vm: BlockVM = None,
                 verbose: bool = False):
        self.caller = caller
        self.vm = vm
        self.verbose = verbose

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [discussant] {msg}")

    def run_discussion(self, block: Block, topic: str,
                       reference_project: str,
                       stances: list[Stance] = None) -> Discussion:
        """Run a structured debate about a topic within a block."""
        stances = stances or [Stance.ADVOCATE, Stance.CRITIC, Stance.PRAGMATIST]
        discussion = Discussion(topic=topic)

        self._log(f"discussion: '{topic}' ({len(stances)} stances)")

        # Extract keywords from topic for on-demand loading
        keywords = [w for w in topic.lower().split() if len(w) > 3]

        # Load relevant context on-demand via VM
        loaded_context = ""
        loaded = []
        if self.vm:
            loaded = self.vm.load_by_relevance(reference_project, keywords, max_files=5)
            if loaded:
                loaded_context = "\n\n".join(
                    f"# {path}\n{content}" for path, content in loaded
                )
                self._log(f"  loaded {len(loaded)} descriptors on-demand "
                          f"({self.vm.budget.utilization:.0%} budget)")

        # Accumulate arguments across stances
        prev_arguments = []

        for stance in stances:
            system = STANCE_PROMPTS.get(stance, STANCE_PROMPTS[Stance.PRAGMATIST])
            user = (
                f"Topic: {topic}\n"
                f"Reference project: {reference_project}\n"
                f"Block objective: {block.objective}\n"
            )
            if loaded_context:
                user += f"\nReference code (loaded on-demand):\n{loaded_context[:4000]}\n"
            if prev_arguments:
                user += f"\nPrevious arguments in this discussion:\n"
                for prev in prev_arguments:
                    user += f"  [{prev.stance.value}]: {prev.argument[:200]}\n"

            user += (
                "\nRespond with JSON: {\"argument\": \"...\", \"conclusion\": "
                "\"adopt|reject|adapt|needs_more_info\", \"confidence\": 0.0-1.0, "
                "\"key_insight\": \"...\"}"
            )

            content, tokens = self.caller.call(system, user, max_tokens=1024)

            try:
                data = LLMCaller.parse_json_response(content)
            except (json.JSONDecodeError, IndexError):
                data = {
                    "argument": content[:500],
                    "conclusion": "needs_more_info",
                    "confidence": 0.3,
                    "key_insight": "",
                }

            point = DiscussionPoint(
                stance=stance,
                topic=topic,
                reference=reference_project,
                argument=data.get("argument", ""),
                conclusion=data.get("conclusion", "needs_more_info"),
                confidence=data.get("confidence", 0.5),
                tokens_used=tokens,
                context_loaded=[p for p, _ in loaded],
            )
            discussion.points.append(point)
            prev_arguments.append(point)

            # If key insight found, register it
            insight = data.get("key_insight", "")
            if insight and self.vm:
                self.vm.register(insight, reference_project, "pattern",
                                 relevance=point.confidence)

        # Derive consensus from points
        conclusions = [p.conclusion for p in discussion.points]
        if conclusions.count("adopt") > len(conclusions) / 2:
            discussion.consensus = "adopt"
        elif conclusions.count("reject") > len(conclusions) / 2:
            discussion.consensus = "reject"
        else:
            discussion.consensus = "adapt"

        # Extract value generated
        discussion.value_generated = [
            p.argument[:100] for p in discussion.points
            if p.confidence >= 0.6
        ]

        block.discussions.append(discussion)
        return discussion
