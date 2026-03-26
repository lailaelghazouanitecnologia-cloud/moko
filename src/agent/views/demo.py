"""
Demo script — run the TUI standalone to verify it works.

Usage: python -m src.agent.views.demo
"""
import time
import threading
from .tui import AvaTUI


def simulate_pipeline(tui: AvaTUI):
    """Simulate a pipeline run to demo the TUI."""
    time.sleep(1)

    modules = [
        ("memory", 2, 96, 0, 15906),
        ("cpu", 5, 989, 0, 42455),
        ("display", 2, 101, 0, 13767),
        ("input", 1, 53, 0, 12004),
    ]

    for name, types, loc, errors, tokens in modules:
        tui.start_module(name, types=types)
        time.sleep(0.3)

        # Simulate blocks
        for i, btype in enumerate(["A", "I", "R", "T", "X"]):
            tui.add_block(btype, "active")
            time.sleep(0.2)
            tui.complete_block(i)

        tui.write_log(f"generating blueprint for {name}...")
        time.sleep(0.3)

        tui.exec_start(f"tsc --noEmit src/{name}")
        time.sleep(0.4)
        tui.exec_done(f"tsc --noEmit src/{name}", exit_code=0, output=f"{errors} errors")
        time.sleep(0.2)

        tui.write_log(f"translated {types} types → src/{name}/")
        time.sleep(0.2)

        tui.complete_module(name, loc=loc, errors=errors, tokens=tokens,
                            elapsed=3.5, blocks=5)
        time.sleep(0.5)

    # Final wait
    time.sleep(3)
    tui.stop()


def main():
    tui = AvaTUI(
        goal="Build a CHIP-8 emulator",
        modules=["memory", "cpu", "display", "input"],
        provider="groq",
        model="kimi-k2-instruct-0905",
        token_budget=500_000,
    )

    # Run pipeline simulation in background thread
    t = threading.Thread(target=simulate_pipeline, args=(tui,), daemon=True)
    t.start()

    # Run TUI on main thread (blocks until exit)
    tui.run()


if __name__ == "__main__":
    main()
