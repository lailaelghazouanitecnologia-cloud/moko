import { Direction } from "../core";

/** Union of actions the keyboard handler can produce. */
export type InputAction =
  | { readonly kind: "move"; readonly direction: Direction }
  | { readonly kind: "restart" }
  | { readonly kind: "quit" };

/** Callback invoked when a valid input action is detected. */
export type InputCallback = (action: InputAction) => void;

/**
 * Listens for raw keypress events on stdin and translates them
 * into game actions (move / restart / quit).
 */
export class KeyboardHandler {
  private callback: InputCallback | null = null;

  /** Start listening. Puts stdin into raw mode. */
  start(callback: InputCallback): void {
    this.callback = callback;

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", this.onData);
  }

  /** Stop listening and restore stdin. */
  stop(): void {
    process.stdin.removeListener("data", this.onData);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    this.callback = null;
  }

  /** Handle raw key data from stdin. */
  private readonly onData = (data: string): void => {
    const action = this.parseKey(data);
    if (action && this.callback) {
      this.callback(action);
    }
  };

  private parseKey(data: string): InputAction | null {
    // Ctrl+C — always quit
    if (data === "\u0003") {
      return { kind: "quit" };
    }

    const lower = data.toLowerCase();

    // Quit
    if (lower === "q") {
      return { kind: "quit" };
    }

    // Restart
    if (lower === "r") {
      return { kind: "restart" };
    }

    // WASD
    if (lower === "w") return { kind: "move", direction: Direction.Up };
    if (lower === "a") return { kind: "move", direction: Direction.Left };
    if (lower === "s") return { kind: "move", direction: Direction.Down };
    if (lower === "d") return { kind: "move", direction: Direction.Right };

    // Arrow keys (escape sequences)
    if (data === "\x1b[A") return { kind: "move", direction: Direction.Up };
    if (data === "\x1b[B") return { kind: "move", direction: Direction.Down };
    if (data === "\x1b[C") return { kind: "move", direction: Direction.Right };
    if (data === "\x1b[D") return { kind: "move", direction: Direction.Left };

    return null;
  }
}
