type InputHandler = {
  update(): void;
};

type GameLoopFrame = number;

/**
 * Manages the main game loop and orchestrates updates and rendering.
 */
export class GameEngine {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private readonly inputHandler: InputHandler;
  private readonly maxFPS: number = 60;
  private delta: number = 0;
  private frame: GameLoopFrame = 0;
  private frameId: GameLoopFrame = 0;

  constructor(inputHandler: InputHandler) {
    if (!inputHandler) {
      throw new TypeError('inputHandler is required');
    }
    this.inputHandler = inputHandler;
  }

  /**
   * Starts the game loop if not already running.
   * @returns void
   @throws RangeError if maxFPS is not a positive number
   */
  start(): void {
    if (this.isRunning) return;
    if (this.maxFPS <= 0) {
      throw new RangeError('maxFPS must be a positive number');
    }
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  /**
   * Stops the active game loop.
   * @returns void
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = 0;
    }
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    this.delta = now - this.lastTime;
    this.lastTime = now;

    const frameTime = 1000 / this.maxFPS;
    if (this.delta < frameTime) {
      this.frameId = requestAnimationFrame(this.gameLoop);
      return;
    }

    this.update();
    this.render();

    this.frame = requestAnimationFrame(this.gameLoop);
  };

  private update(): void {
    this.inputHandler.update();
  }

  private render(): void {
    // render logic
  }
}
