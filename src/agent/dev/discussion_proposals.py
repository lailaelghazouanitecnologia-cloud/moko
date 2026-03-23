"""
DiscussionProposals — extract Branch/Eval proposals from discussions.

When a discussion has disagreement or multiple viable alternatives,
instead of forcing one choice, propose evaluation branches to A/B test
each approach. The Manager then runs them in parallel.

Flow:
  Discussion (ADVOCATE vs CRITIC disagree on Vec3 storage)
    → ProposalExtractor analyzes the discussion
    → Proposes: eval/vec3-float32 vs eval/vec3-typed-array
    → Manager runs both, benchmarks, picks winner

This turns debates into data: instead of guessing, we measure.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional

from .plan import Discussion, DiscussionPoint, Stance
from .branch import EvalConfig


@dataclass
class BranchProposal:
    """A proposed evaluation branch derived from a discussion."""
    eval_config: EvalConfig
    reason: str                    # why this variation is worth testing
    source_discussion: str         # topic of the discussion that spawned this
    confidence: float = 0.0        # how confident we are this is worth testing
    priority: int = 0              # 0=high, 1=medium, 2=low


def extract_proposals_from_discussion(
    discussion: Discussion,
    module_name: str,
    type_name: str = "",
) -> list[BranchProposal]:
    """Analyze a discussion and propose eval branches for disagreements.

    Rules:
    1. If consensus == "adapt" and 2+ stances suggest different approaches
       → propose one eval branch per approach
    2. If confidence spread is wide (max - min > 0.3)
       → the low-confidence approach becomes an eval branch
    3. If ADVOCATE and CRITIC both have confidence > 0.6 but disagree
       → propose both approaches as eval branches
    """
    proposals = []

    if not discussion.points or len(discussion.points) < 2:
        return proposals

    # Detect disagreement patterns
    adopt_points = [p for p in discussion.points if p.conclusion == "adopt"]
    reject_points = [p for p in discussion.points if p.conclusion == "reject"]
    adapt_points = [p for p in discussion.points if p.conclusion == "adapt"]

    # Pattern 1: Direct disagreement (adopt vs reject, both confident)
    if adopt_points and reject_points:
        best_adopt = max(adopt_points, key=lambda p: p.confidence)
        best_reject = max(reject_points, key=lambda p: p.confidence)

        if best_adopt.confidence >= 0.5 and best_reject.confidence >= 0.5:
            # Both sides have a case — propose the "adopt" approach as eval
            variation = _extract_variation(best_adopt)
            if variation and type_name:
                proposals.append(BranchProposal(
                    eval_config=EvalConfig(
                        target_type=type_name,
                        target_module=module_name,
                        variation=variation,
                        constraints=_extract_constraints(best_adopt),
                    ),
                    reason=f"Advocate ({best_adopt.confidence:.0%}) vs "
                           f"Critic ({best_reject.confidence:.0%}): "
                           f"{best_adopt.argument[:80]}",
                    source_discussion=discussion.topic,
                    confidence=best_adopt.confidence,
                    priority=0,
                ))

    # Pattern 2: "Adapt" with specific alternative
    for point in adapt_points:
        if point.confidence >= 0.6:
            variation = _extract_variation(point)
            if variation and type_name:
                proposals.append(BranchProposal(
                    eval_config=EvalConfig(
                        target_type=type_name,
                        target_module=module_name,
                        variation=variation,
                        constraints=_extract_constraints(point),
                    ),
                    reason=f"Adaptation proposed by {point.stance.value} "
                           f"({point.confidence:.0%}): {point.argument[:80]}",
                    source_discussion=discussion.topic,
                    confidence=point.confidence,
                    priority=1,
                ))

    # Pattern 3: Wide confidence spread — low-confidence approach is uncertain
    if len(discussion.points) >= 2:
        confidences = [p.confidence for p in discussion.points]
        spread = max(confidences) - min(confidences)
        if spread > 0.3:
            uncertain = min(discussion.points, key=lambda p: p.confidence)
            if uncertain.confidence >= 0.3:  # still plausible
                variation = _extract_variation(uncertain)
                if variation and type_name:
                    proposals.append(BranchProposal(
                        eval_config=EvalConfig(
                            target_type=type_name,
                            target_module=module_name,
                            variation=variation,
                            constraints=_extract_constraints(uncertain),
                        ),
                        reason=f"Uncertain approach worth testing "
                               f"(confidence gap: {spread:.0%}): "
                               f"{uncertain.argument[:80]}",
                        source_discussion=discussion.topic,
                        confidence=uncertain.confidence,
                        priority=2,
                    ))

    return proposals


def extract_proposals_from_abstraction(
    feature_decisions: list,
    module_name: str,
) -> list[BranchProposal]:
    """Extract eval proposals from abstraction feature decisions.

    "defer" decisions with value >= 0.5 become eval branches:
    worth exploring but not worth committing to main yet.
    """
    proposals = []

    for fd in feature_decisions:
        # Deferred features with decent value → eval branch
        if fd.verdict == "defer" and fd.value_score >= 0.5:
            proposals.append(BranchProposal(
                eval_config=EvalConfig(
                    target_type=fd.feature,
                    target_module=module_name,
                    variation=fd.reasoning[:100],
                    constraints=[],
                ),
                reason=f"Deferred feature (value={fd.value_score:.0%}, "
                       f"effort={fd.effort_score:.0%}): {fd.reasoning[:80]}",
                source_discussion="abstraction",
                confidence=fd.value_score,
                priority=1,
            ))

        # "adapt" features → eval the adaptation
        if fd.verdict == "adapt" and fd.value_score >= 0.6:
            proposals.append(BranchProposal(
                eval_config=EvalConfig(
                    target_type=fd.feature,
                    target_module=module_name,
                    variation=f"Adapted: {fd.reasoning[:80]}",
                    constraints=[],
                ),
                reason=f"Adaptation proposed: {fd.reasoning[:80]}",
                source_discussion="abstraction",
                confidence=fd.value_score,
                priority=1,
            ))

    return proposals


def proposals_to_eval_yaml(proposals: list[BranchProposal]) -> str:
    """Convert proposals to eval.yaml format for persistence."""
    import yaml

    evals = []
    for p in sorted(proposals, key=lambda x: x.priority):
        evals.append({
            "target_type": p.eval_config.target_type,
            "target_module": p.eval_config.target_module,
            "variation": p.eval_config.variation,
            "constraints": p.eval_config.constraints,
            "benchmark_metrics": p.eval_config.benchmark_metrics,
            "_reason": p.reason,
            "_confidence": p.confidence,
            "_source": p.source_discussion,
        })

    data = {"evaluations": evals}
    return yaml.dump(data, default_flow_style=False, sort_keys=False,
                     allow_unicode=True)


def extract_proposals_with_llm(
    discussion: Discussion,
    module_name: str,
    llm,
    max_proposals: int = 3,
) -> list[BranchProposal]:
    """Use LLM to extract eval proposals from a discussion.

    More intelligent than rule-based extraction: understands nuance,
    can propose creative alternatives, and generates proper constraints.
    """
    disc_text = _format_discussion_for_llm(discussion)

    system = (
        "You analyze software design discussions and propose A/B test variations.\n"
        "When a discussion has disagreement or multiple viable approaches, propose\n"
        "evaluation branches: each re-implements ONE type with a specific variation.\n\n"
        "Output JSON array of proposals:\n"
        "[{\"target_type\": \"Vec3\", \"variation\": \"SIMD Float32Array layout\",\n"
        "  \"constraints\": [\"use Float32Array\", \"inline operations\"],\n"
        "  \"reason\": \"why this variation is worth testing\",\n"
        "  \"confidence\": 0.8}]\n\n"
        "Rules:\n"
        "- Only propose when there's genuine disagreement or a viable alternative\n"
        "- Each proposal must change ONE specific thing (algorithm, data structure, API)\n"
        "- Constraints must be concrete and testable\n"
        "- Max proposals: " + str(max_proposals)
    )

    user = (
        f"Module: {module_name}\n"
        f"Discussion:\n{disc_text}\n\n"
        f"Propose evaluation branches (or empty array if no disagreement)."
    )

    from ..llm.providers import LLMMessage
    resp = llm.complete_with_usage(
        [LLMMessage("user", user)],
        system=system,
        temperature=0.3,
        max_tokens=1024,
    )

    try:
        content = resp.content.strip()
        # Strip markdown fences
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(l for l in lines if not l.startswith("```"))

        data = json.loads(content)
        if not isinstance(data, list):
            data = data.get("proposals", [])

        proposals = []
        for d in data[:max_proposals]:
            proposals.append(BranchProposal(
                eval_config=EvalConfig(
                    target_type=d.get("target_type", ""),
                    target_module=module_name,
                    variation=d.get("variation", ""),
                    constraints=d.get("constraints", []),
                ),
                reason=d.get("reason", ""),
                source_discussion=discussion.topic,
                confidence=d.get("confidence", 0.5),
            ))
        return proposals

    except (json.JSONDecodeError, KeyError):
        # Fallback to rule-based
        return []


# ── Private helpers ─────────────────────────────────────────

def _extract_variation(point: DiscussionPoint) -> str:
    """Extract a variation description from a discussion point's argument."""
    arg = point.argument
    # Look for key phrases that describe an approach
    for marker in ("should use", "could use", "suggest", "propose",
                   "alternative:", "instead", "approach:"):
        idx = arg.lower().find(marker)
        if idx >= 0:
            # Take the sentence containing the marker
            start = max(0, arg.rfind(".", 0, idx) + 1)
            end = arg.find(".", idx + len(marker))
            if end < 0:
                end = min(len(arg), idx + 150)
            return arg[start:end].strip()

    # Fallback: first 100 chars of argument
    return arg[:100].strip() if arg else ""


def _extract_constraints(point: DiscussionPoint) -> list[str]:
    """Extract constraints from a discussion point's argument."""
    constraints = []
    arg = point.argument

    # Look for bullet-point-like patterns
    for line in arg.split("\n"):
        line = line.strip()
        if line.startswith(("- ", "* ", "• ")):
            constraints.append(line[2:].strip())
        elif line.startswith(("1.", "2.", "3.")):
            constraints.append(line[2:].strip())

    # If no bullets found, try to extract "must" / "should" clauses
    if not constraints:
        import re
        must_clauses = re.findall(
            r'(?:must|should|need to|requires?)\s+(.{10,80}?)(?:\.|,|$)',
            arg, re.IGNORECASE
        )
        constraints = [c.strip() for c in must_clauses[:3]]

    return constraints[:5]


def _format_discussion_for_llm(discussion: Discussion) -> str:
    """Format a discussion for LLM analysis."""
    lines = [f"Topic: {discussion.topic}"]
    for p in discussion.points:
        lines.append(
            f"[{p.stance.value}] (confidence={p.confidence:.0%}) "
            f"conclusion={p.conclusion}"
        )
        lines.append(f"  {p.argument[:300]}")
    if discussion.consensus:
        lines.append(f"Consensus: {discussion.consensus}")
    return "\n".join(lines)
