import { Vector2D, Entity } from '../core';
import { EntityManager } from '../game';
import { Renderer, ScreenBuffer } from '../renderer';
import { InputHandler, KeyMapper } from '../input';

export class GameLoop {
  private readonly application: Application;
  private readonly entityManager: EntityManager;
  private readonly renderer: Renderer;
  private readonly inputHandler: InputHandler;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private readonly targetFps: number;
  private readonly frameTime: number;

  constructor(application: Application, entityManager: EntityManager, renderer: Renderer, inputHandler: InputHandler, targetFps: number = 60) {
    this.application = application;
    this.entityManager = entityManager;
    this.renderer = renderer;
    this.inputHandler = inputHandler;
    this.targetFps = targetFps;
    this.frameTime = 1000 / targetFps;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
  }

  private loop(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    const nextFrameTime = Math.max(0, this.frameTime - (performance.now() - currentTime));
    setTimeout(() => this.loop(), nextFrameTime);
  }

  private update(deltaTime: number): void {
    this.inputHandler.processInput();
    this.application.update(deltaTime);
  }

  private render(): void {
    const backBuffer = this.renderer.backBuffer;
    this.clearBuffer(backBuffer);
    this.application.render();
    this.renderer.swapBuffers();
  }

  private clearBuffer(buffer: ScreenBuffer): void {
    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        buffer.buffer[y][x] = ' ';
      }
    }
  }

  isRunning(): boolean {
    return this.isRunning;
  }

  getTargetFps(): number {
    return this.targetFps;
  }

  getFrameTime(): number {
    return this.frameTime;
  }
}
