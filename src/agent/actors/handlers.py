"""
Block handlers — map BlockType to engine execution.

Each handler wraps an existing engine and adapts it to the Block interface.
The ActorRegistry dispatches blocks to the right handler.

Handler = 1 BlockType = 1 atomic task:
  BlueprintHandler  → ANALYZE  → generates blueprint from spec
  TranslateHandler  → IMPLEMENT → translates 1 type to code
  ReviewHandler     → REVIEW   → ModuleReviewer finds issues
  QualityHandler    → REFACTOR → QualityEngine fixes issues
  TestHandler       → TEST     → tsc check + ProjectAnalyzer
  AbstractHandler   → ABSTRACT → extract learnings for knowledge store
"""
from __future__ import annotations

from pathlib import Path
from typing import Dict, Optional

from ..core.models import Block, BlockType


class BlockHandler:
    """Base handler for block execution."""

    block_type: BlockType

    def execute(self, block: Block, context: dict) -> str:
        """Execute the block. Returns output string."""
        raise NotImplementedError


class BlueprintHandler(BlockHandler):
    """ANALYZE → generate module blueprint from spec."""

    block_type = BlockType.ANALYZE

    def execute(self, block: Block, context: dict) -> str:
        translator = context.get("translator")
        if not translator:
            return "No translator available"

        module_name = block.meta.get("module", "")
        goal = block.meta.get("goal", "")
        ref_paths = context.get("ref_paths", [])

        bp, tokens = translator.generate_blueprint(
            module_name=module_name,
            goal=goal,
            ref_paths=ref_paths,
            language="typescript",
            target_dir=f"src/{module_name}",
        )

        block.tokens_used = tokens
        if bp:
            block.files_changed = [f"blueprints/{module_name}.bp.yaml"]
            return f"Blueprint: {len(bp.types)} types, {sum(len(t.methods or []) for t in bp.types)} methods"
        return "Blueprint generation failed"


class TranslateHandler(BlockHandler):
    """IMPLEMENT → translate 1 type from blueprint to code."""

    block_type = BlockType.IMPLEMENT

    def execute(self, block: Block, context: dict) -> str:
        translator = context.get("translator")
        type_bp = context.get("type_bp")
        module_bp = context.get("module_bp")
        project_dir = context.get("project_dir")

        if not all([translator, type_bp, module_bp, project_dir]):
            return "Missing context for translation"

        file_path, tokens, refs = translator.translate_type(
            type_bp, module_bp, Path(project_dir),
        )

        block.tokens_used = tokens
        block.files_changed = [file_path] if file_path else []
        block.references_used = refs
        return f"Translated {type_bp.name} → {file_path} ({tokens} tokens)"


class ReviewHandler(BlockHandler):
    """REVIEW → run ModuleReviewer on generated code."""

    block_type = BlockType.REVIEW

    def execute(self, block: Block, context: dict) -> str:
        llm = context.get("llm")
        module_files = context.get("module_files", {})
        dep_interfaces = context.get("dep_interfaces", {})
        spec_text = context.get("spec_context", "")

        if not llm or not module_files:
            return "No files to review"

        from .module_reviewer import ModuleReviewer
        reviewer = ModuleReviewer(llm, verbose=True)
        module_name = block.meta.get("module", "")
        review = reviewer.review(module_name, module_files, dep_interfaces, spec_text)

        block.tokens_used = review.tokens_used
        issues = review.issues + review.integration_issues
        return f"Review: {len(issues)} issues found" + (
            "\n" + "\n".join(f"  - {i}" for i in issues[:5]) if issues else ""
        )


class QualityHandler(BlockHandler):
    """REFACTOR → QualityEngine improves code based on review findings."""

    block_type = BlockType.REFACTOR

    def execute(self, block: Block, context: dict) -> str:
        quality_engine = context.get("quality_engine")
        module_files = context.get("module_files", {})
        llm = context.get("llm")

        if not quality_engine or not module_files:
            return "No quality engine or files"

        module_name = block.meta.get("module", "")
        improved, report = quality_engine.improve_module(
            module_name, module_files, llm=llm, max_llm_calls=2,
        )

        block.tokens_used = report.tokens_used
        block.quality_score = report.score_after

        # Write improved files
        project_dir = context.get("project_dir")
        if project_dir and report.issues_fixed > 0:
            module_dir = Path(project_dir) / "src" / module_name
            for filename, code in improved.items():
                (module_dir / filename).write_text(code)
            block.files_changed = list(improved.keys())

        return report.summary()


class TestHandler(BlockHandler):
    """TEST → run tsc + ProjectAnalyzer."""

    block_type = BlockType.TEST

    def execute(self, block: Block, context: dict) -> str:
        fix_engine = context.get("fix_engine")
        project_dir = context.get("project_dir")

        if not project_dir:
            return "No project dir"

        # TSC check
        tsc_errors = 0
        if fix_engine:
            errors, clean, _ = fix_engine.check_tsc()
            tsc_errors = len(errors)

        # Health analysis
        try:
            from ..engines.analysis import ProjectAnalyzer
            analyzer = ProjectAnalyzer(Path(project_dir))
            health = analyzer.analyze()
            block.quality_score = health.score() / 100.0
            block.test_results = {
                "tsc_errors": tsc_errors,
                "health_score": health.score(),
                "empty_interfaces": len(health.empty_interfaces),
                "missing_di": len(health.missing_di),
                "dead_exports": len(health.dead_exports),
            }
            return f"Test: TSC={tsc_errors} errors, Health={health.score():.0f}/100"
        except Exception as e:
            block.test_results = {"tsc_errors": tsc_errors}
            return f"Test: TSC={tsc_errors} errors (analyzer failed: {e})"


class AbstractHandler(BlockHandler):
    """ABSTRACT → extract learnings for knowledge store."""

    block_type = BlockType.ABSTRACT

    def execute(self, block: Block, context: dict) -> str:
        session = context.get("session")
        if not session:
            return "No session for abstraction"

        try:
            from ..engines.knowledge import MemoryExtractor, KnowledgeStore
            extractor = MemoryExtractor()
            memory = extractor.extract(session)
            store = KnowledgeStore()
            store.add(memory)
            return f"Abstraction: {len(memory.learnings)} learnings extracted"
        except Exception as e:
            return f"Abstraction failed: {e}"


def register_all_handlers(registry):
    """Register all block handlers in an ActorRegistry."""
    from .base import ActorRegistry

    handlers = [
        BlueprintHandler(),
        TranslateHandler(),
        ReviewHandler(),
        QualityHandler(),
        TestHandler(),
        AbstractHandler(),
    ]

    # Wrap as actors for the registry
    for handler in handlers:
        class _Adapter:
            name = handler.block_type.value
            _handler = handler
            def execute(self, block, context):
                from .base import ActorResult
                output = self._handler.execute(block, context)
                return ActorResult(
                    content=output,
                    tokens_used=block.tokens_used,
                    files_changed=block.files_changed,
                    quality_score=block.quality_score,
                )
        registry.register(handler.block_type, _Adapter())
