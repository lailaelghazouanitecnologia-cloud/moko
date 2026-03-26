"""
Features — analyze references, discover features, discuss & propose evaluations.

ava features -t nova -r playcanvas
  1. Scans reference descriptors → extracts all types/methods/patterns
  2. Groups into "features" (logical capabilities: math, rendering, ECS, etc.)
  3. Runs discussions per feature (advocate vs critic vs pragmatist)
  4. Auto-generates eval.yaml with proposals from disagreements
  5. Optionally runs evaluations (--run)

This is the "deep analysis" command: understand what a reference offers,
debate what's worth adopting, and create testable experiments.
"""
from __future__ import annotations

import time
import yaml
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from ..core.llm.providers import LLMProvider, LLMMessage
from .. import OUT_DIR


@dataclass
class Feature:
    """A logical capability discovered in reference projects."""
    name: str                      # "3D Math Library"
    category: str                  # "math", "rendering", "ecs", "input", etc.
    types: list[str]               # ["Vec3", "Mat4", "Quat"]
    methods: list[str]             # key methods across types
    source_project: str            # "playcanvas"
    source_descriptors: list[str]  # paths to descriptors
    description: str = ""          # LLM-generated summary
    complexity: str = "medium"     # "low", "medium", "high"
    relevance: float = 0.0        # 0-1 how relevant to target goal


@dataclass
class FeatureDiscussion:
    """Result of discussing one feature."""
    feature: Feature
    advocate_argument: str = ""
    critic_argument: str = ""
    pragmatist_argument: str = ""
    consensus: str = ""             # "adopt", "reject", "adapt"
    confidence: float = 0.0
    eval_proposals: list[dict] = field(default_factory=list)
    tokens_used: int = 0


@dataclass
class FeaturesReport:
    """Complete analysis of features across references."""
    target: str
    references: list[str]
    features: list[Feature] = field(default_factory=list)
    discussions: list[FeatureDiscussion] = field(default_factory=list)
    total_tokens: int = 0
    elapsed_s: float = 0.0


class FeatureAnalyzer:
    """Analyze references, discover features, discuss & propose evaluations."""

    def __init__(self, config: dict = None):
        config = config or {}
        self.llm = LLMProvider(
            provider=config.get("provider", "groq"),
            model=config.get("model"),
        )
        self.verbose = config.get("verbose", False)
        self.out_dir = OUT_DIR
        self.projects_dir = Path("projects")

        # Guardrails
        from ..core.guardrails import RunGuard, RunLimits
        self.guard = config.get("_guard") or RunGuard(RunLimits.from_config(config))

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [features] {msg}")

    def run(self, target: str, references: list[str],
            goal: str = "", discuss: bool = True,
            max_features: int = 15) -> FeaturesReport:
        """Full feature analysis pipeline.

        1. Scan references → extract raw types/methods
        2. LLM groups into features
        3. Discuss each feature (advocate/critic/pragmatist)
        4. Generate eval proposals from disagreements
        """
        t0 = time.time()
        report = FeaturesReport(target=target, references=references)

        try:
            return self._run_inner(report, references, goal, discuss,
                                   max_features, t0)
        except Exception as e:
            from ..core.guardrails import GuardrailTripped
            if isinstance(e, GuardrailTripped):
                print(f"\n  ⛔ {e}")
                self.guard.print_status()
            else:
                print(f"\n  ⚠ INTERRUPTED: {e}")
            report.elapsed_s = time.time() - t0
            self._print_summary(report)
            return report

    def _run_inner(self, report: FeaturesReport, references: list[str],
                   goal: str, discuss: bool, max_features: int,
                   t0: float) -> FeaturesReport:
        """Inner run logic, wrapped by guardrail exception handler."""
        target = report.target

        # 1. Scan references
        self._log("scanning references...")
        raw_types = self._scan_references(references)
        self._log(f"found {len(raw_types)} types across {len(references)} references")

        if not raw_types:
            print("No types found in references.")
            return report

        # 2. Group into features via LLM
        self._log("grouping into features...")
        features, tokens = self._discover_features(raw_types, goal, max_features)
        report.features = features
        report.total_tokens += tokens
        self._log(f"discovered {len(features)} features ({tokens} tokens)")

        # 3. Print features
        self._print_features(features)

        # 4. Discuss each feature
        if discuss and features:
            self._log("running discussions...")
            for feat in features:
                if not self.guard.check_discussion_limit():
                    self._log(f"discussion limit reached ({self.guard.limits.max_discussions_total}), skipping remaining")
                    break
                self.guard.check_time()

                disc = self._discuss_feature(feat, goal)
                report.discussions.append(disc)
                report.total_tokens += disc.tokens_used

            self._print_discussions(report.discussions)

            # 5. Generate eval.yaml from proposals
            all_proposals = []
            for disc in report.discussions:
                all_proposals.extend(disc.eval_proposals)

            # Guardrail: cap proposals
            max_proposals = self.guard.limits.max_eval_proposals
            if len(all_proposals) > max_proposals:
                self._log(f"capping proposals: {len(all_proposals)} → {max_proposals}")
                all_proposals = all_proposals[:max_proposals]

            if all_proposals:
                self._save_eval_yaml(target, all_proposals)

        report.elapsed_s = time.time() - t0
        self._print_summary(report)
        return report

    # ── Phase 1: Scan references ────────────────────────────

    def _scan_references(self, references: list[str]) -> list[dict]:
        """Scan all descriptors and extract type definitions."""
        all_types = []

        for project in references:
            project_dir = self.out_dir / project
            if not project_dir.is_dir():
                self._log(f"  skipping {project}: not found in {self.out_dir}")
                continue

            for yaml_path in project_dir.rglob("*.yaml"):
                if yaml_path.name in ("workspace.yaml", "deps.yaml", "meta.yaml"):
                    continue

                try:
                    text = yaml_path.read_text()
                    lines = [l for l in text.split("\n") if not l.startswith("##")]
                    data = yaml.safe_load("\n".join(lines))
                    if not data or not isinstance(data, dict):
                        continue

                    rel_path = str(yaml_path.relative_to(self.out_dir))
                    module = data.get("module", "")
                    description = data.get("description", "")

                    for type_def in data.get("types", []):
                        if not isinstance(type_def, dict):
                            continue
                        name = type_def.get("name", "")
                        if not name:
                            continue

                        methods = []
                        for key in ("methods", "static_methods"):
                            for m in type_def.get(key, []):
                                mname = m if isinstance(m, str) else m.get("name", "")
                                if mname:
                                    methods.append(mname)

                        fields = []
                        for f in type_def.get("fields", []):
                            fname = f if isinstance(f, str) else f.get("name", "")
                            if fname:
                                fields.append(fname)

                        all_types.append({
                            "name": name,
                            "kind": type_def.get("kind", "class"),
                            "methods": methods,
                            "fields": fields,
                            "module": module,
                            "source": project,
                            "descriptor": rel_path,
                            "description": description,
                        })

                except Exception:
                    continue

        return all_types

    # ── Phase 2: Discover features ──────────────────────────

    def _discover_features(self, raw_types: list[dict], goal: str,
                           max_features: int) -> tuple[list[Feature], int]:
        """Use LLM to group raw types into logical features."""

        # Build compact summary of all types
        type_lines = []
        for t in raw_types:
            methods_str = ", ".join(t["methods"][:10])
            if len(t["methods"]) > 10:
                methods_str += f"... (+{len(t['methods']) - 10})"
            type_lines.append(
                f"- {t['source']}/{t['module']}: {t['name']} [{t['kind']}] "
                f"— methods: {methods_str}"
            )

        types_text = "\n".join(type_lines)

        system = (
            "You analyze codebases and group types into logical features.\n"
            "A 'feature' is a coherent capability (e.g., '3D Math', 'Scene Graph', "
            "'Input System', 'Audio Engine').\n\n"
            "Output JSON array of features:\n"
            "[{\"name\": \"3D Math Library\", \"category\": \"math\",\n"
            "  \"types\": [\"Vec3\", \"Mat4\", \"Quat\"],\n"
            "  \"key_methods\": [\"multiply\", \"normalize\", \"slerp\"],\n"
            "  \"description\": \"Complete 3D math with Float32Array storage\",\n"
            "  \"complexity\": \"medium\",\n"
            "  \"relevance\": 0.9}]\n\n"
            "Rules:\n"
            "- Group related types together (not 1 feature per type)\n"
            "- relevance: how useful is this feature for the target goal\n"
            "- complexity: low (1-3 types), medium (4-8), high (9+)\n"
            f"- Maximum {max_features} features\n"
            "- Sort by relevance (highest first)"
        )

        user = f"Target goal: {goal or 'general purpose project'}\n\n"
        user += f"Types found in references:\n{types_text}\n"

        self.guard.throttle()
        resp = self.llm.complete_with_usage(
            [LLMMessage("system", system), LLMMessage("user", user)],
            temperature=0.3,
            max_tokens=2048,
        )
        tokens = getattr(resp, 'total_tokens', 0) or (
            resp.usage.total_tokens if hasattr(resp, 'usage') and resp.usage else 0
        )
        if tokens:
            self.guard.record_tokens(tokens)

        features = []
        try:
            import json
            content = resp.content.strip()
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(l for l in lines if not l.startswith("```"))

            data = json.loads(content)
            if not isinstance(data, list):
                data = data.get("features", [])

            # Map type names to source info
            type_map = {}
            for t in raw_types:
                type_map.setdefault(t["name"], []).append(t)

            for fd in data[:max_features]:
                type_names = fd.get("types", [])
                source_descs = []
                source_proj = ""
                for tn in type_names:
                    for t in type_map.get(tn, []):
                        source_descs.append(t["descriptor"])
                        source_proj = source_proj or t["source"]

                features.append(Feature(
                    name=fd.get("name", ""),
                    category=fd.get("category", ""),
                    types=type_names,
                    methods=fd.get("key_methods", []),
                    source_project=source_proj,
                    source_descriptors=source_descs,
                    description=fd.get("description", ""),
                    complexity=fd.get("complexity", "medium"),
                    relevance=fd.get("relevance", 0.5),
                ))

        except Exception:
            pass

        tokens = getattr(resp, 'total_tokens', 0) or 0
        return features, tokens

    # ── Phase 3: Discuss features ───────────────────────────

    def _discuss_feature(self, feature: Feature,
                         goal: str) -> FeatureDiscussion:
        """Run a 3-stance discussion about whether to adopt a feature."""

        disc = FeatureDiscussion(feature=feature)
        total_tokens = 0

        # Load descriptor content for context
        ref_context = self._load_feature_context(feature)

        # Run 3 stances
        stances = [
            ("advocate", self._advocate_prompt()),
            ("critic", self._critic_prompt()),
            ("pragmatist", self._pragmatist_prompt()),
        ]

        prev_args = []
        for stance_name, stance_system in stances:
            user = (
                f"Feature: {feature.name} ({feature.category})\n"
                f"Types: {', '.join(feature.types)}\n"
                f"Methods: {', '.join(feature.methods[:15])}\n"
                f"Description: {feature.description}\n"
                f"Complexity: {feature.complexity}\n"
                f"Target goal: {goal}\n"
            )
            if ref_context:
                user += f"\nReference code:\n{ref_context[:3000]}\n"
            if prev_args:
                user += "\nPrevious arguments:\n"
                for name, arg in prev_args:
                    user += f"  [{name}]: {arg[:200]}\n"

            user += (
                "\nRespond JSON: {\"argument\": \"...\", "
                "\"conclusion\": \"adopt|reject|adapt\", "
                "\"confidence\": 0.0-1.0, "
                "\"eval_proposal\": {\"variation\": \"...\", \"constraints\": [...]} "
                "or null}"
            )

            self.guard.throttle()
            resp = self.llm.complete_with_usage(
                [LLMMessage("system", stance_system), LLMMessage("user", user)],
                temperature=0.4,
                max_tokens=1024,
            )

            try:
                import json
                content = resp.content.strip()
                if content.startswith("```"):
                    lines = content.split("\n")
                    content = "\n".join(l for l in lines if not l.startswith("```"))
                data = json.loads(content)
            except Exception:
                data = {"argument": resp.content[:300], "conclusion": "adapt",
                        "confidence": 0.5}

            arg_text = data.get("argument", "")
            conclusion = data.get("conclusion", "adapt")
            confidence = data.get("confidence", 0.5)

            if stance_name == "advocate":
                disc.advocate_argument = arg_text
            elif stance_name == "critic":
                disc.critic_argument = arg_text
            elif stance_name == "pragmatist":
                disc.pragmatist_argument = arg_text

            prev_args.append((stance_name, arg_text))

            # Collect eval proposal if the stance suggested one
            proposal = data.get("eval_proposal")
            if proposal and isinstance(proposal, dict) and proposal.get("variation"):
                # Pick the most relevant type for this proposal
                target_type = feature.types[0] if feature.types else feature.name
                disc.eval_proposals.append({
                    "target_type": target_type,
                    "target_module": feature.category,
                    "variation": proposal["variation"],
                    "constraints": proposal.get("constraints", []),
                    "benchmark_metrics": ["loc", "density", "method_count", "tsc_errors"],
                    "_source": f"features/{stance_name}",
                    "_feature": feature.name,
                    "_confidence": confidence,
                })

            tokens = getattr(resp, 'total_tokens', 0) or 0
            total_tokens += tokens

        # Determine consensus
        conclusions = []
        for name, arg in prev_args:
            # Re-parse conclusion from stored args
            pass
        # Simple: use pragmatist's conclusion as final (they see both sides)
        disc.consensus = data.get("conclusion", "adapt")
        disc.confidence = data.get("confidence", 0.5)
        disc.tokens_used = total_tokens

        return disc

    def _load_feature_context(self, feature: Feature) -> str:
        """Load descriptor content for a feature's source files."""
        parts = []
        chars = 0
        max_chars = 4000

        for desc_path in feature.source_descriptors[:3]:
            full_path = self.out_dir / desc_path
            if not full_path.exists():
                continue
            content = full_path.read_text()
            if chars + len(content) > max_chars:
                break
            parts.append(f"# {desc_path}\n{content}")
            chars += len(content)

        return "\n\n".join(parts)

    # ── Stance prompts ──────────────────────────────────────

    def _advocate_prompt(self) -> str:
        return (
            "You are the ADVOCATE analyzing a software feature from a reference project.\n"
            "Argue FOR adopting this feature. Highlight:\n"
            "- What specific value it adds\n"
            "- Quality of the implementation patterns\n"
            "- How it fits the target project's goal\n"
            "If you see a specific implementation approach worth testing, "
            "propose it in eval_proposal."
        )

    def _critic_prompt(self) -> str:
        return (
            "You are the CRITIC analyzing a software feature.\n"
            "Argue AGAINST adopting or find weaknesses:\n"
            "- Is it over-engineered for the goal?\n"
            "- Are there simpler alternatives?\n"
            "- What's the maintenance cost?\n"
            "If you think a simpler alternative is worth testing, "
            "propose it in eval_proposal."
        )

    def _pragmatist_prompt(self) -> str:
        return (
            "You are the PRAGMATIST. You've seen the advocate and critic arguments.\n"
            "Give a balanced verdict:\n"
            "- Is the feature worth adopting, adapting, or skipping?\n"
            "- If adapting: what specific changes would you make?\n"
            "- What's the minimum viable version?\n"
            "If there are two viable approaches, propose the alternative in eval_proposal."
        )

    # ── Output ──────────────────────────────────────────────

    def _print_features(self, features: list[Feature]):
        W = 70
        print(f"\n{'━' * W}")
        print(f"  FEATURES DISCOVERED: {len(features)}")
        print(f"{'━' * W}")

        for i, f in enumerate(features):
            rel_bar = "█" * int(f.relevance * 10) + "░" * (10 - int(f.relevance * 10))
            print(f"\n  [{i+1}] {f.name} [{f.category}]")
            print(f"      Types: {', '.join(f.types[:8])}")
            print(f"      Methods: {', '.join(f.methods[:8])}")
            print(f"      Complexity: {f.complexity}  "
                  f"Relevance: [{rel_bar}] {f.relevance:.0%}")
            if f.description:
                print(f"      {f.description[:70]}")

        print(f"\n{'━' * W}")

    def _print_discussions(self, discussions: list[FeatureDiscussion]):
        W = 70
        print(f"\n{'━' * W}")
        print(f"  DISCUSSIONS: {len(discussions)}")
        print(f"{'━' * W}")

        for disc in discussions:
            icon = {"adopt": "✓", "reject": "✗", "adapt": "◐"}.get(
                disc.consensus, "?")
            print(f"\n  {icon} {disc.feature.name} → {disc.consensus} "
                  f"({disc.confidence:.0%})")
            print(f"    ADVOCATE: {disc.advocate_argument[:80]}")
            print(f"    CRITIC:   {disc.critic_argument[:80]}")
            print(f"    PRAGMATIST: {disc.pragmatist_argument[:80]}")

            if disc.eval_proposals:
                print(f"    PROPOSALS: {len(disc.eval_proposals)}")
                for p in disc.eval_proposals:
                    print(f"      → {p['target_type']}: {p['variation'][:50]}")

        print(f"\n{'━' * W}")

    def _print_summary(self, report: FeaturesReport):
        W = 70
        adopt = sum(1 for d in report.discussions if d.consensus == "adopt")
        reject = sum(1 for d in report.discussions if d.consensus == "reject")
        adapt = sum(1 for d in report.discussions if d.consensus == "adapt")
        proposals = sum(len(d.eval_proposals) for d in report.discussions)

        print(f"\n{'━' * W}")
        print(f"  SUMMARY")
        print(f"{'━' * W}")
        print(f"  Features:    {len(report.features)}")
        print(f"  Discussions: {len(report.discussions)}")
        print(f"  Verdicts:    {adopt} adopt, {adapt} adapt, {reject} reject")
        print(f"  Proposals:   {proposals} eval branches generated")
        print(f"  Tokens:      {report.total_tokens:,}")
        print(f"  Time:        {report.elapsed_s:.1f}s")
        print(f"{'━' * W}")

    def _save_eval_yaml(self, target: str, proposals: list[dict]):
        """Save eval proposals to projects/<target>/eval.yaml."""
        project_dir = self.projects_dir / target
        eval_path = project_dir / "eval.yaml"

        existing = []
        if eval_path.exists():
            try:
                data = yaml.safe_load(eval_path.read_text())
                existing = data.get("evaluations", []) if data else []
            except Exception:
                pass

        # Dedup
        existing_keys = {
            (e.get("target_type", ""), e.get("variation", ""))
            for e in existing
        }

        added = 0
        for p in proposals:
            key = (p.get("target_type", ""), p.get("variation", ""))
            if key not in existing_keys:
                existing.append(p)
                existing_keys.add(key)
                added += 1

        if added > 0:
            project_dir.mkdir(parents=True, exist_ok=True)
            eval_path.write_text(yaml.dump(
                {"evaluations": existing},
                default_flow_style=False, sort_keys=False, allow_unicode=True,
            ))
            self._log(f"saved {added} new proposals → {eval_path}")
