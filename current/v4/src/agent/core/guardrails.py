"""
Guardrails — centralized safety limits, loop detection, and budget enforcement.

Every DevSupervisor, DevManager, and FeatureAnalyzer shares a RunGuard
instance that tracks cumulative usage and halts execution before runaway.

Protects against:
  - Unbounded token spending (global token cap)
  - Infinite plan growth (max blocks inserted)
  - Discussion loops (max rounds)
  - Cycle/repetition in block processing (visited-state tracking)
  - Stuck blocks (staleness timeout)
  - Unbounded parallel branches (eval branch cap)
  - LLM call storms (rate limiter)
"""
from __future__ import annotations

import time
import threading
from dataclasses import dataclass, field
from typing import Optional


class GuardrailTripped(Exception):
    """Raised when a guardrail limit is exceeded."""
    def __init__(self, guardrail: str, message: str, usage: dict = None):
        self.guardrail = guardrail
        self.usage = usage or {}
        super().__init__(f"GUARDRAIL [{guardrail}]: {message}")


@dataclass
class RunLimits:
    """Configurable limits for a single run. All can be overridden via config."""

    # ── Token budget ────────────────────────────────────
    max_total_tokens: int = 500_000       # global cap across all LLM calls
    warn_tokens_pct: float = 0.8          # warn at 80% of budget

    # ── Plan growth ─────────────────────────────────────
    max_plan_blocks: int = 200            # max blocks in a plan (including inserted)
    max_blocks_inserted: int = 50         # max dynamically inserted blocks
    max_iterations: int = 100             # main loop iterations

    # ── Discussions ─────────────────────────────────────
    max_discussion_rounds: int = 5        # per feature/type
    max_discussions_total: int = 30       # across entire run

    # ── Evaluations ─────────────────────────────────────
    max_eval_branches: int = 20           # total eval branches per run
    max_parallel_branches: int = 5        # concurrent eval branches
    max_eval_proposals: int = 50          # proposals in eval.yaml

    # ── Time ────────────────────────────────────────────
    max_run_seconds: int = 3600           # 1 hour hard cap
    max_block_seconds: int = 300          # 5 min per block
    stale_block_seconds: int = 120        # block stuck IN_PROGRESS

    # ── LLM rate limiting ───────────────────────────────
    min_call_interval_s: float = 0.1      # 100ms between calls (10 req/s max)
    max_calls_per_minute: int = 60        # burst cap

    # ── Cycles ──────────────────────────────────────────
    max_identical_outputs: int = 3        # same output repeated = loop

    @classmethod
    def from_config(cls, config: dict) -> "RunLimits":
        """Create limits from config dict, using defaults for missing keys."""
        limits = cls()
        for key in cls.__dataclass_fields__:
            if key in config:
                setattr(limits, key, config[key])
        # Also accept nested "guardrails" key
        if "guardrails" in config:
            for key, val in config["guardrails"].items():
                if hasattr(limits, key):
                    setattr(limits, key, val)
        return limits


class RunGuard:
    """Runtime guard that tracks usage and enforces limits.

    Thread-safe. One instance per run (supervisor/manager).
    """

    def __init__(self, limits: RunLimits = None):
        self.limits = limits or RunLimits()
        self._lock = threading.Lock()

        # ── Counters ────────────────────────────────────
        self.total_tokens: int = 0
        self.total_llm_calls: int = 0
        self.total_blocks_processed: int = 0
        self.total_blocks_inserted: int = 0
        self.total_discussions: int = 0
        self.total_eval_branches: int = 0
        self.total_eval_proposals: int = 0

        # ── Timing ──────────────────────────────────────
        self.run_start: float = time.time()
        self.last_llm_call: float = 0.0
        self._calls_this_minute: list[float] = []

        # ── Loop detection ──────────────────────────────
        self._visited_states: set[str] = set()
        self._output_hashes: list[str] = []
        self._block_start_times: dict[str, float] = {}

        # ── Warnings issued ─────────────────────────────
        self._warnings: list[str] = []
        self._tripped: bool = False

    # ── Token tracking ──────────────────────────────────

    def record_tokens(self, tokens: int) -> int:
        """Record token usage. Returns total. Raises if over budget."""
        with self._lock:
            self.total_tokens += tokens
            self.total_llm_calls += 1
            self.last_llm_call = time.time()

            # Track calls-per-minute
            now = time.time()
            self._calls_this_minute = [
                t for t in self._calls_this_minute if now - t < 60
            ]
            self._calls_this_minute.append(now)

            # Check token budget
            if self.total_tokens >= self.limits.max_total_tokens:
                self._trip("token_budget",
                           f"Token budget exhausted: {self.total_tokens:,} / "
                           f"{self.limits.max_total_tokens:,}")

            # Warn at threshold
            warn_at = int(self.limits.max_total_tokens * self.limits.warn_tokens_pct)
            if self.total_tokens >= warn_at and f"tokens_{warn_at}" not in self._warnings:
                self._warnings.append(f"tokens_{warn_at}")
                print(f"  ⚠ Token budget {self.limits.warn_tokens_pct:.0%}: "
                      f"{self.total_tokens:,} / {self.limits.max_total_tokens:,}")

            return self.total_tokens

    # ── Rate limiting ───────────────────────────────────

    def throttle(self):
        """Wait if needed to respect rate limits. Call before each LLM call."""
        with self._lock:
            now = time.time()

            # Per-minute cap
            recent = [t for t in self._calls_this_minute if now - t < 60]
            if len(recent) >= self.limits.max_calls_per_minute:
                wait = 60 - (now - recent[0]) + 0.1
                if wait > 0:
                    time.sleep(min(wait, 5.0))  # max 5s wait

            # Min interval
            elapsed = now - self.last_llm_call
            if elapsed < self.limits.min_call_interval_s:
                time.sleep(self.limits.min_call_interval_s - elapsed)

    # ── Plan growth ─────────────────────────────────────

    def check_plan_size(self, total_blocks: int):
        """Check plan hasn't grown too large."""
        if total_blocks > self.limits.max_plan_blocks:
            self._trip("plan_growth",
                       f"Plan exceeded max blocks: {total_blocks} / "
                       f"{self.limits.max_plan_blocks}")

    def record_block_inserted(self) -> int:
        """Track dynamically inserted blocks."""
        with self._lock:
            self.total_blocks_inserted += 1
            if self.total_blocks_inserted > self.limits.max_blocks_inserted:
                self._trip("block_insertion",
                           f"Too many blocks inserted: {self.total_blocks_inserted} / "
                           f"{self.limits.max_blocks_inserted}")
            return self.total_blocks_inserted

    # ── Block processing ────────────────────────────────

    def record_block_start(self, block_id: str):
        """Mark block as started for staleness detection."""
        with self._lock:
            self._block_start_times[block_id] = time.time()
            self.total_blocks_processed += 1

    def record_block_done(self, block_id: str):
        """Mark block as finished."""
        with self._lock:
            self._block_start_times.pop(block_id, None)

    def check_stale_blocks(self):
        """Check for blocks stuck too long."""
        now = time.time()
        with self._lock:
            for block_id, start in list(self._block_start_times.items()):
                elapsed = now - start
                if elapsed > self.limits.max_block_seconds:
                    self._trip("stale_block",
                               f"Block '{block_id}' stuck for {elapsed:.0f}s "
                               f"(limit: {self.limits.max_block_seconds}s)")

    # ── Loop / cycle detection ──────────────────────────

    def check_cycle(self, state_key: str) -> bool:
        """Check if we've visited this exact state before. Returns True if cycle detected."""
        with self._lock:
            if state_key in self._visited_states:
                return True
            self._visited_states.add(state_key)
            return False

    def check_output_loop(self, output_hash: str) -> bool:
        """Detect if LLM is producing the same output repeatedly."""
        with self._lock:
            self._output_hashes.append(output_hash)

            # Check last N outputs for repetition
            n = self.limits.max_identical_outputs
            if len(self._output_hashes) >= n:
                recent = self._output_hashes[-n:]
                if len(set(recent)) == 1:
                    return True
            return False

    # ── Discussions ─────────────────────────────────────

    def check_discussion_limit(self) -> bool:
        """Check if we can run another discussion. Returns False if at limit."""
        with self._lock:
            if self.total_discussions >= self.limits.max_discussions_total:
                return False
            self.total_discussions += 1
            return True

    # ── Evaluations ─────────────────────────────────────

    def check_eval_branch(self) -> bool:
        """Check if we can launch another eval branch. Returns False if at limit."""
        with self._lock:
            if self.total_eval_branches >= self.limits.max_eval_branches:
                return False
            self.total_eval_branches += 1
            return True

    def check_eval_proposals(self, count: int):
        """Check proposal count against limit."""
        with self._lock:
            self.total_eval_proposals += count
            if self.total_eval_proposals > self.limits.max_eval_proposals:
                excess = self.total_eval_proposals - self.limits.max_eval_proposals
                self.total_eval_proposals = self.limits.max_eval_proposals
                print(f"  ⚠ Eval proposals capped at {self.limits.max_eval_proposals} "
                      f"({excess} dropped)")
                return self.limits.max_eval_proposals
            return self.total_eval_proposals

    # ── Time ────────────────────────────────────────────

    def check_time(self):
        """Check global run time."""
        elapsed = time.time() - self.run_start
        if elapsed > self.limits.max_run_seconds:
            self._trip("time_limit",
                       f"Run exceeded time limit: {elapsed:.0f}s / "
                       f"{self.limits.max_run_seconds}s")

    @property
    def elapsed_s(self) -> float:
        return time.time() - self.run_start

    # ── Status ──────────────────────────────────────────

    @property
    def tripped(self) -> bool:
        return self._tripped

    def status(self) -> dict:
        """Current usage snapshot."""
        return {
            "tokens": f"{self.total_tokens:,} / {self.limits.max_total_tokens:,}",
            "llm_calls": self.total_llm_calls,
            "blocks": self.total_blocks_processed,
            "blocks_inserted": self.total_blocks_inserted,
            "discussions": f"{self.total_discussions} / {self.limits.max_discussions_total}",
            "eval_branches": f"{self.total_eval_branches} / {self.limits.max_eval_branches}",
            "elapsed": f"{self.elapsed_s:.0f}s / {self.limits.max_run_seconds}s",
            "tripped": self._tripped,
            "warnings": len(self._warnings),
        }

    def print_status(self):
        """Print compact status line."""
        s = self.status()
        pct = (self.total_tokens / max(self.limits.max_total_tokens, 1)) * 100
        print(f"  [guard] tokens={s['tokens']} ({pct:.0f}%) "
              f"calls={s['llm_calls']} blocks={s['blocks']} "
              f"elapsed={s['elapsed']}")

    # ── Internal ────────────────────────────────────────

    def _trip(self, guardrail: str, message: str):
        """Trip a guardrail — raise exception to halt execution."""
        self._tripped = True
        raise GuardrailTripped(
            guardrail, message,
            usage=self.status(),
        )
