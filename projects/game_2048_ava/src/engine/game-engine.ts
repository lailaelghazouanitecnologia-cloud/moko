import { Direction } from '../core';
import { GameBoard, GameLogic } from '../game';
import { Renderer } from '../renderer';
import { InputHandler } from './input-handler';

export class GameEngine {
  private readonly board: GameBoard;
  private readonly logic: GameLogic;
  private readonly renderer: Renderer;
  private readonly input: InputHandler;
  private running: boolean;
  private lastTime: number;

  constructor(board: GameBoard, logic: GameLogic, renderer: Renderer, input: InputHandler) {
    this.board = board;
    this.logic = logic;
    this.renderer = renderer;
    this.input = input;
    this.running = false;
    this.lastTime = 0;
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  stop(): void {
    this.running = false;
  }

  private gameLoop(): void {
    if (!this.running) return;

    const currentTime = performance.now();
    const dt = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame(() => this.gameLoop());
  }

  update(dt: number): void {
    // Game logic updates handled by GameLogic
  }

  render(): void {
    this.renderer.clear();
    this.renderer.drawBoard(this.board);
    this.renderer.drawState(this.logic['state']);
  }

  handleInput(dir: Direction): void {
    if (this.logic.move(dir)) {
      this.logic.spawnTile();
      
      if (this.logic.checkWin()) {
        this.logic['state'] = 'won';
        this.stop();
      } else if (this.logic.checkLoss()) {
        this.logic['state'] = 'lost';
        this.stop();
      }
    }
  }

  reset(): void {
    this.logic['state'] = 'playing';
    this.board = new GameBoard(this.board.size);
    this.logic['board'] = this.board;
    this.logic.spawnTile();
    this.logic.spawnTile();
  }

  togglePause(): void {
    if (this.logic['state'] === 'playing') {
      this.logic['state'] = 'idle';
      this.stop();
    } else if (this.logic['state'] === 'idle') {
      this.logic['state'] = 'playing';
      this.start();
    }
  }
}
