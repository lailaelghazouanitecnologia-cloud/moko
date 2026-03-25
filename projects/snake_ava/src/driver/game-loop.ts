import { GameState } from '../core/index';
import { Snake } from '../snake/snake';
import { Food } from '../food/food';
// UNRESOLVED: import { Input } from '../input/Input';

export class GameLoop {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly gameState: GameState;
  private readonly snake: Snake;
  private readonly foodList: Food[];
  private readonly inputHandler: Input;
  private readonly updateInterval: number;
  private lastTime: number;
  private isRunning: boolean;
  private animationId: number | null;

  constructor(canvas: HTMLCanvasElement, updateInterval: number = 100) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError('Expected canvas to be an HTMLCanvasElement');
    }
    if (typeof updateInterval !== 'number' || updateInterval <= 0) {
      throw new RangeError('updateInterval must be a positive number');
    }

    this.canvas = canvas;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not obtain 2d context from canvas');
    }
    this.ctx = context;
    this.gameState = new GameState();
    this.snake = new Snake();
    this.foodList = [];
    this.inputHandler = new Input();
    this.updateInterval = updateInterval;
    this.lastTime = 0;
    this.isRunning = false;
    this.animationId = null;
  }

  /**
   * Start the game loop.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.inputHandler.attach(this.canvas);
    this.loop();
  }

  /**
   * Stop the game loop and clean up resources.
   */
  stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.inputHandler.detach();
  }

  /**
   * Pause the game loop without resetting state.
   */
  pause(): void {
    this.isRunning = false;
  }

  /**
   * Resume the paused game loop.
   */
  resume(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  /**
   * Restart the game with a fresh state.
   */
  restart(): void {
    this.stop();
    this.gameState.reset();
    this.snake.reset();
    this.foodList.length = 0;
    this.start();
  }

  /**
   * Check if the game is paused.
   */
  isPaused(): boolean {
    return !this.isRunning;
  }

  /**
   * Check if the game is over.
   */
  isOver(): boolean {
    return this.gameState.isGameOver();
  }

  /**
   * Get the current score.
   */
  getScore(): number {
    return this.gameState.getScore();
  }

  private loop = (): void => {
    if (!this.isRunning) return;
    const now = performance.now();
    const delta = now - this.lastTime;
    if (delta >= this.updateInterval) {
      this.update();
      this.render();
      this.lastTime = now;
    }
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    if (this.gameState.isGameOver()) return;
    this.inputHandler.update();
    this.handleInput();
    this.snake.move(false);
    this.checkCollisions();
    this.checkFood();
  }

  private handleInput(): void {
    if (this.inputHandler.isPressed('up')) this.snake.turnUp();
    if (this.inputHandler.isPressed('down')) this.snake.turnDown();
    if (this.inputHandler.isPressed('left')) this.snake.turnLeft();
    if (this.inputHandler.isPressed('right')) this.snake.turnRight();
  }

  private checkCollisions(): void {
    const head = this.snake.body[0];
    const grid = this.gameState.grid;
    if (!grid.isInside(head)) {
      this.gameState.setGameOver(true);
      return;
    }
    for (let i = 1; i < this.snake.body.length; i++) {
      if (head.equals(this.snake.body[i])) {
        this.gameState.setGameOver(true);
        return;
      }
    }
  }

  private checkFood(): void {
    const head = this.snake.body[0];
    for (let i = this.foodList.length - 1; i >= 0; i--) {
      if (head.equals(this.foodList[i].position)) {
        this.snake.extend();
        this.foodList.splice(i, 1);
        this.gameState.updateScore(10);
      }
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderGrid();
    this.renderFood();
    this.renderSnake();
  }

  private renderGrid(): void {
    const grid = this.gameState.grid;
    const cellSize = 20;
    this.ctx.strokeStyle = 'white';
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        this.ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }

  private renderFood(): void {
    const cellSize = 20;
    this.ctx.fillStyle = 'red';
    for (const food of this.foodList) {
      const pos = food.position;
      this.ctx.fillRect(pos.x * cellSize, pos.y * cellSize, cellSize, cellSize);
    }
  }

  private renderSnake(): void {
    const cellSize = 20;
    this.ctx.fillStyle = 'green';
    for (const segment of this.snake.body) {
      this.ctx.fillRect(segment.x * cellSize, segment.y * cellSize, cellSize, cellSize);
    }
  }
}
