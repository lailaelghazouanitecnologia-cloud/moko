import { GameState } from './game-state';

/**
 * Main game loop that handles the update and render cycle for the game.
 * Manages the game state and ensures smooth gameplay at the target FPS.
 */
export class GameLoop {
  private isRunning: boolean;
  private lastTime: number;
  private state: GameState;
  private targetFps: number;
  private frameId: number;

  /**
   * Creates a new GameLoop instance with the specified target FPS.
   * @param targetFps - The desired frames per second for the game loop (default: 60)
   * @throws {Error} If targetFps is not a positive number
   */
  constructor(targetFps: number = 60) {
    if (!Number.isFinite(targetFps) || targetFps <= 0) {
      throw new Error('targetFps must be a positive number');
    }

    this.isRunning = false;
    this.lastTime = 0;
    this.state = new GameState();
    this.targetFps = targetFps;
    this.frameId = 0;
  }

  /**
   * Starts the game loop if it is not already running.
   * Initializes the timer and begins the update/render cycle.
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.step.bind(this));
  }

  /**
   * Stops the game loop if it is currently running.
   * Cancels any pending animation frame requests.
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameInput);
      this.frameId = 0;
    }
  }

  /**
   * Performs a single frame of the game loop.
   * Calculates delta time, updates game logic, and renders the frame.
   * @param timestamp - The current timestamp from requestAnimationFrame
   */
  step(timestamp: number): void {
    if (!this.isRunning) {
      return;
    }

    if (!Number.isFinite(timestamp) || timestamp < 0) {
      console.warn('Invalid timestamp provided to step:', timestamp);
      this.frameId = requestAnimationFrame(this.step.bind(this));
      return;
    }

    const delta = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    const targetFrameTime = 1000 / this.targetFps;
    const actualFrameTime = delta * 1000;

    // Skip frame if it's running too slowly (more than 1.5x target frame time)
    if (actualFrameTime <= targetFrameTime * 1.5) {
      this.update(delta);
      this.render();
    }

    this.frameId = requestAnimationFrame(this.step.bind(this));
  }

  /**
   * Updates the game logic based on the time elapsed since the last update.
   * Handles snake movement, collision detection, and food consumption.
   * @param delta - Time elapsed in seconds since the last update
   */
  update(delta: number): void {
    if (!Number.isFinite(delta) || delta < 0) {
      console.warn('Invalid delta time provided to update:', delta);
      return;
    }

    if (!this.state) {
      console.warn('Game state is not initialized');
      return;
    }

    // Update game logic based on current state
    if (this.state.is('playing')) {
      const snake = this.state.get('snake') as any;
      const food = this.state.get('food') as any;
      const board = this.state.get('board') as any;

      if (!snake || !food || !board) {
        console.warn('Missing required entities (snake, food, or board) in playing state');
        return;
      }

      if (snake && snake.isAlive) {
        snake.move(delta);

        if (snake.checkSelfCollision() || snake.checkWallCollision(board)) {
          snake.isAlive = false;
          this.state.transition('gameOver');
          return;
        }

        if (food && snake.segments && snake.segments[0] && food.isAt(snange.segments[0])) {
          snake.grow();
          board.removeFood(food.getPosition());
          const newFood = food.spawn(board);
          this.state.set('food', newFood);
        }
      }
    }
  }

  /**
   * Renders the current state of the game to the display.
   * Clears the board and redraws the snake and food.
   */
  render(): void {
    if (!this.state) {
      console.warn('Game state is not initialized');
      return;
    }

    const board = this.state.get('board') as any;
    const snake = this.state.get('snake') as any;
    const food = this.state.get('food') as any;

    if (!board || !board.grid) {
      console.warn('Board or board.grid is not initialized');
      return;
    }

    // Clear and redraw board
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        board.grid[y][x].type = 'empty';
      }
    }

    // Draw snake
    if (snake && snake.segments) {
      snake.segments.forEach((segment: any, index: number) => {
        if (this.isValidPosition(segment) && board.isInside(segment)) {
          board.grid[segment.y][segment.x].type = index === 0 ? 'head' : 'body';
        }
      });
    }

    // Draw food
    if (food && food.getPosition()) {
      const pos = food.getPosition();
      if (this.isValidPosition(pos) && board.isInside(pos)) {
        board.grid[pos.y][pos.x].type = 'food';
      }
    }
  }

  /**
   * Changes the current game state to a new state.
   * @param newState - The new GameState instance to set
   * @throws {Error} If newState is not a valid GameState instance
   */
  setState(newState: GameState): void {
    if (!newState || !(newState instanceof GameState)) {
      throw new Error('Invalid GameState instance provided');
    }

    this.state = newState;
  }

  /**
   * Validates if a position object has valid x and y coordinates.
   * @param pos - The position object to validate
   * @returns True if the position is valid, false otherwise
   */
  private isValidPosition(pos: any): boolean {
    return (
      pos &&
      typeof pos === 'object' &&
      Number.isInteger(pos.x) &&
      Number.isInteger(pos.y) &&
      pos.x >= 0 &&
      pos.y >= 0
    );
  }
}