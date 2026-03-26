"""
BlockExecutor — extracted from DevSupervisor.execute_block.

Handles the lifecycle of executing a single block:
  1. Navigate VM to block
  2. Build context (history, references, registry)
  3. Run discussions if applicable
  4. Dispatch to appropriate actor
  5. Complete block with chain linking
"""
from __future__ import annotations

from typing import Optional, TYPE_CHECKING

from ..core.models import Block, BlockType, BlockStatus, Plan
from ..core.guardrails import RunGuard
from .vm import BlockVM

if TYPE_CHECKING:
    from ..actors.base import ActorRegistry


class BlockExecutor:
    """Executes blocks by delegating to actors with VM-provided context."""

    def __init__(self, vm: BlockVM, guard: RunGuard, verbose: bool = False):
        self.vm = vm
        self.guard = guard
        self.verbose = verbose
        self._actors = None  # Set via set_actors() to avoid circular imports

    def set_actors(self, actors):
        """Set the actor registry for dispatching."""
        self._actors = actors

    def _log(self, msg: str):
        if self.verbose:
            print(f"  [executor] {msg}")

    def execute(self, block: Block, plan: Plan,
                handler_fn=None) -> Block:
        """Execute a single block.

        Args:
            block: The block to execute
            plan: The current plan (for chain linking)
            handler_fn: The handler function to call for execution
                       (passed from supervisor during migration)
        """
        block.start()
        block_id = f"block_{block.index}"
        self.guard.record_block_start(block_id)
        self._log(f"block {block.index} [{block.block_type.value}]: {block.objective[:50]}...")

        # Navigate VM
        if self.vm:
            self.vm.goto(block.index)

        # Execute via provided handler
        if handler_fn:
            result = handler_fn(block)
        else:
            result = {"content": "", "tokens_used": 0}

        # Find previous completed block for chain linking
        prev_block = None
        completed = plan.completed_blocks
        if completed:
            prev_block = completed[-1]

        block.complete(
            output=result.get("content", ""),
            files_changed=result.get("files_changed", []),
            tokens_used=result.get("tokens_used", 0),
            test_results=result.get("test_results", {}),
            prev_block=prev_block,
        )

        if result.get("refs_used"):
            block.references_used = result["refs_used"]
        if result.get("quality_score"):
            block.quality_score = result["quality_score"]

        self.guard.record_block_done(block_id)
        self._log(f"block {block.index} done in {block.elapsed_s:.1f}s [{block.hash[:8]}]")
        return block

    def execute_batch(self, blocks: list[Block], plan: Plan,
                      handler_fn=None) -> list[Block]:
        """Execute a batch of blocks sequentially."""
        results = []
        for block in blocks:
            result = self.execute(block, plan, handler_fn=handler_fn)
            results.append(result)
        return results
