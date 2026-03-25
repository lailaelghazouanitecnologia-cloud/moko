import { GameLoop } from './game-loop';
import { Vector2D, Entity } from '../core';
import { EntityManager } from '../game';
import { Renderer, ScreenBuffer } from '..//renderer';
import { InputHandler, KeyMapper } from '../input';

export class Application {
  private readonly gameLoop: GameLoop;
  private readonly entityManager: EntityManager;
  private readonly renderer: Renderer;
  private readonly inputHandler: InputHandler;
  private isRunning: boolean = false;

  constructor(
    gameLoop: GameLoop,
    entityManager: EntityManager,
    renderer: Renderer,
    inputHandler: InputHandler
  ) {
  this.gameLoop = gameLoop;
  this.entityManager = entityManager;
  this.renderer = renderer;
  this.inputHandler = inputhandler;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.gameRunning = true;
    this.gameLoop.start();
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.gameRunning = false;
    this.gameLoop.stop();
  }

  isRunning(): boolean {
    return this.isRunning;
  }

  getGameLoop(): GameLoop {
    return this.gameLoop;
  }

  getEntityManager(): EntityManager {
    return this.entityManager;
  }

  getRenderer(): Renderer {
    return this.renderer;
  }

  getInputHandler(): InputHandler {
    return this.inputHandler;
  }
}
