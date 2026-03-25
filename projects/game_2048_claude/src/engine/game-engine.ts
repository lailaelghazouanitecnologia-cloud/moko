import { Grid } from "../game";
import { ConsoleRenderer } from "../renderer";
import { KeyboardHandler, InputAction } from "../input";

/**
 * Orchestrates the game loop: wires input, game logic, and rendering together.
 */
export class GameEngine {
  private readonly grid: Grid;
  private readonly renderer: ConsoleRenderer;
  private readonly keyboard: KeyboardHandler;
  private endScreenActive: boolean = false;

  constructor() {
    this.grid = new Grid();
    this.renderer = new ConsoleRenderer();
    this.keyboard = new KeyboardHandler();
  }

  /** Launch the game. */
  start(): void {
    this.grid.init();
    this.endScreenActive = false;
    this.renderer.render(this.grid);
    this.keyboard.start(this.handleInput);
  }

  /** Clean up and exit the process. */
  private quit(): void {
    this.keyboard.stop();
    process.stdout.write("\x1b[2J\x1b[H");
    console.log("\n  Thanks for playing 2048! Final score: %d\n", this.grid.score);
    process.exit(0);
  }

  /** Restart the game from scratch. */
  private restart(): void {
    this.grid.init();
    this.endScreenActive = false;
    this.renderer.render(this.grid);
  }

  /** Central input dispatcher. */
  private readonly handleInput = (action: InputAction): void => {
    switch (action.kind) {
      case "quit":
        this.quit();
        break;

      case "restart":
        this.restart();
        break;

      case "move":
        if (this.endScreenActive) break;

        const moved = this.grid.move(action.direction);
        if (!moved) break;

        if (this.grid.over || this.grid.won) {
          this.renderer.renderEndScreen(this.grid);
          this.endScreenActive = true;
        } else {
          this.renderer.render(this.grid);
        }
        break;
    }
  };
}
