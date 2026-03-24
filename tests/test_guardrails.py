"""Tests for guardrails module — safety limits, loop detection, budget enforcement."""
import time
import threading
import pytest

from src.agent.dev.guardrails import GuardrailTripped, RunLimits, RunGuard


# ── RunLimits ──────────────────────────────────────────────

class TestRunLimits:
    def test_defaults(self):
        lim = RunLimits()
        assert lim.max_total_tokens == 500_000
        assert lim.max_plan_blocks == 200
        assert lim.max_discussions_total == 30
        assert lim.max_eval_branches == 20
        assert lim.max_run_seconds == 3600
        assert lim.max_identical_outputs == 3

    def test_from_config_direct_keys(self):
        lim = RunLimits.from_config({"max_total_tokens": 100, "max_plan_blocks": 10})
        assert lim.max_total_tokens == 100
        assert lim.max_plan_blocks == 10
        # Others stay default
        assert lim.max_eval_branches == 20

    def test_from_config_nested_guardrails(self):
        lim = RunLimits.from_config({
            "guardrails": {"max_total_tokens": 200, "max_run_seconds": 60}
        })
        assert lim.max_total_tokens == 200
        assert lim.max_run_seconds == 60

    def test_from_config_ignores_unknown(self):
        lim = RunLimits.from_config({"unknown_key": 999})
        assert lim.max_total_tokens == 500_000


# ── Token tracking ─────────────────────────────────────────

class TestTokenTracking:
    def test_record_tokens_accumulates(self):
        guard = RunGuard(RunLimits(max_total_tokens=10000))
        guard.record_tokens(100)
        guard.record_tokens(200)
        assert guard.total_tokens == 300
        assert guard.total_llm_calls == 2

    def test_record_tokens_trips_on_budget(self):
        guard = RunGuard(RunLimits(max_total_tokens=500))
        guard.record_tokens(300)
        with pytest.raises(GuardrailTripped, match="token_budget"):
            guard.record_tokens(300)
        assert guard.tripped

    def test_guardrail_tripped_has_usage(self):
        guard = RunGuard(RunLimits(max_total_tokens=100))
        with pytest.raises(GuardrailTripped) as exc_info:
            guard.record_tokens(200)
        assert exc_info.value.guardrail == "token_budget"
        assert "tokens" in exc_info.value.usage


# ── Plan growth ────────────────────────────────────────────

class TestPlanGrowth:
    def test_check_plan_size_ok(self):
        guard = RunGuard(RunLimits(max_plan_blocks=100))
        guard.check_plan_size(50)  # no exception

    def test_check_plan_size_trips(self):
        guard = RunGuard(RunLimits(max_plan_blocks=10))
        with pytest.raises(GuardrailTripped, match="plan_growth"):
            guard.check_plan_size(11)

    def test_record_block_inserted_trips(self):
        guard = RunGuard(RunLimits(max_blocks_inserted=2))
        guard.record_block_inserted()
        guard.record_block_inserted()
        with pytest.raises(GuardrailTripped, match="block_insertion"):
            guard.record_block_inserted()


# ── Block processing ───────────────────────────────────────

class TestBlockProcessing:
    def test_record_block_start_done(self):
        guard = RunGuard()
        guard.record_block_start("b1")
        assert "b1" in guard._block_start_times
        guard.record_block_done("b1")
        assert "b1" not in guard._block_start_times

    def test_check_stale_blocks_trips(self):
        guard = RunGuard(RunLimits(max_block_seconds=0))
        guard.record_block_start("slow")
        time.sleep(0.05)
        with pytest.raises(GuardrailTripped, match="stale_block"):
            guard.check_stale_blocks()

    def test_check_stale_blocks_ok_when_fast(self):
        guard = RunGuard(RunLimits(max_block_seconds=300))
        guard.record_block_start("fast")
        guard.check_stale_blocks()  # no exception


# ── Cycle / loop detection ─────────────────────────────────

class TestCycleDetection:
    def test_check_cycle_detects_repeat(self):
        guard = RunGuard()
        assert not guard.check_cycle("state_A")
        assert not guard.check_cycle("state_B")
        assert guard.check_cycle("state_A")  # revisited

    def test_check_output_loop_detects_repetition(self):
        guard = RunGuard(RunLimits(max_identical_outputs=3))
        assert not guard.check_output_loop("hash_a")
        assert not guard.check_output_loop("hash_a")
        assert guard.check_output_loop("hash_a")  # 3 identical

    def test_check_output_loop_no_false_positive(self):
        guard = RunGuard(RunLimits(max_identical_outputs=3))
        assert not guard.check_output_loop("a")
        assert not guard.check_output_loop("b")
        assert not guard.check_output_loop("a")  # not 3 consecutive identical


# ── Discussions ────────────────────────────────────────────

class TestDiscussions:
    def test_check_discussion_limit(self):
        guard = RunGuard(RunLimits(max_discussions_total=2))
        assert guard.check_discussion_limit()  # 1
        assert guard.check_discussion_limit()  # 2
        assert not guard.check_discussion_limit()  # at limit


# ── Evaluations ────────────────────────────────────────────

class TestEvaluations:
    def test_check_eval_branch(self):
        guard = RunGuard(RunLimits(max_eval_branches=2))
        assert guard.check_eval_branch()
        assert guard.check_eval_branch()
        assert not guard.check_eval_branch()

    def test_check_eval_proposals_caps(self):
        guard = RunGuard(RunLimits(max_eval_proposals=5))
        result = guard.check_eval_proposals(3)
        assert result == 3
        result = guard.check_eval_proposals(5)  # would be 8, capped at 5
        assert result == 5


# ── Time ───────────────────────────────────────────────────

class TestTime:
    def test_check_time_ok(self):
        guard = RunGuard(RunLimits(max_run_seconds=3600))
        guard.check_time()  # no exception

    def test_check_time_trips(self):
        guard = RunGuard(RunLimits(max_run_seconds=0))
        time.sleep(0.05)
        with pytest.raises(GuardrailTripped, match="time_limit"):
            guard.check_time()


# ── Status ─────────────────────────────────────────────────

class TestStatus:
    def test_status_returns_dict(self):
        guard = RunGuard()
        guard.record_tokens(100)
        s = guard.status()
        assert "tokens" in s
        assert s["llm_calls"] == 1
        assert s["tripped"] is False

    def test_elapsed_s(self):
        guard = RunGuard()
        time.sleep(0.05)
        assert guard.elapsed_s >= 0.04


# ── Thread safety ──────────────────────────────────────────

class TestThreadSafety:
    def test_concurrent_token_recording(self):
        guard = RunGuard(RunLimits(max_total_tokens=1_000_000))
        errors = []

        def record():
            try:
                for _ in range(100):
                    guard.record_tokens(1)
            except GuardrailTripped:
                pass
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=record) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert not errors
        assert guard.total_tokens == 1000
        assert guard.total_llm_calls == 1000
