import * as fs from 'fs';
import * as path from 'path';

import { GameStatus, GameEvent, Direction } from '../core/types';
import { HIGH_SCORE_FILE, DEFAULT_CONFIG } from '../core/constants';
import { GameState } from '../game/state';
import { InputHandler } from '../input/handler';
import { ConsoleRenderer } from '../renderer/console';
import { ScoreDisplay } from '../renderer/display';
import { EventBus } from './event-bus';
import type { GameConfig } from '../core/types';

/**
 * The main game loop. Ties together state, input, rendering, and events.
 * Uses a fixed-timestep approach driven by `setTimeout` for consistent tick rates.
 */
export class GameLoop {
  private readonly state: GameState;
  private readonly input: InputHandler;
  private readonly renderer: ConsoleRenderer;
  private readonly scoreDisplay: ScoreDisplay;
  private readonly eventBus: EventBus;

  private timer: ReturnType<typeof setTimeout> | null;
  private running: boolean;

  /**
   * @param config - Partial game configuration (merged with defaults).
   * @param eventBus - Optional external event bus; one is created if omitted.
   */
  constructor(config: Partial<GameConfig> = {}, eventBus?: EventBus) {
    const merged = { ...DEFAULT_CONFIG, ...config };

    this.state = new GameState(merged);
    this.input = new InputHandler(merged.startDirection ?? Direction.Right);
    this.renderer = new ConsoleRenderer();
    this.scoreDisplay = new ScoreDisplay();
    this.eventBus = eventBus ?? new EventBus();
    this.timer = null;
    this.running = false;

    this.loadHighScore();
  }

  /** Expose the event bus so external code can subscribe to game events. */
  get events(): EventBus {
    return this.eventBus;
  }

  /** Expose current game state for external inspection. */
  get gameState(): GameState {
    return this.state;
  }

  /**
   * Start the game loop. Begins listening for input and scheduling ticks.
   * If the game is in Ready or GameOver state, it transitions to Running.
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.input.startListening();
    this.state.start();

    this.eventBus.emit(GameEvent.StatusChange, { status: this.state.status });

    // Initial render.
    this.renderFrame();

    // Schedule the first tick.
    this.scheduleTick();
  }

  /**
   * Stop the game loop completely. Cleans up timers and input listeners.
   */
  stop(): void {
    this.running = false;

    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.input.stopListening();
    this.saveHighScore();
  }

  /**
   * Pause the game (the loop keeps running but ticks are no-ops).
   */
  pause(): void {
    this.state.pause();
    this.eventBus.emit(GameEvent.StatusChange, { status: GameStatus.Paused });
    this.renderFrame();
  }

  /**
   * Resume from a paused state.
   */
  resume(): void {
    this.state.resume();
    this.eventBus.emit(GameEvent.StatusChange, { status: GameStatus.Running });
  }

  // ── Private: tick scheduling ──────────────────────────────────────

  /** Schedule the next tick using the current tick rate. */
  private scheduleTick(): void {
    if (!this.running) return;

    this.timer = setTimeout(() => {
      this.tick();
      this.scheduleTick();
    }, this.state.tickRate);
  }

  /** Execute one game tick: process input, update state, render, emit events. */
  private tick(): void {
    // Handle meta-inputs (pause, restart).
    if (this.input.drainPause()) {
      this.state.togglePause();
      this.eventBus.emit(GameEvent.StatusChange, { status: this.state.status });
      this.renderFrame();
      return;
    }

    if (this.input.drainRestart()) {
      this.state.start();
      this.input.setCurrentDirection(Direction.Right);
      this.eventBus.emit(GameEvent.StatusChange, { status: this.state.status });
      this.renderFrame();
      return;
    }

    // Only advance game logic when running.
    if (this.state.status !== GameStatus.Running) {
      this.renderFrame();
      return;
    }

    // Apply buffered direction input.
    const nextDir = this.input.drainDirection();
    if (nextDir !== null) {
      this.state.changeDirection(nextDir);
      this.eventBus.emit(GameEvent.DirectionChange, { direction: nextDir });
    }

    // Advance simulation.
    const previousScore = this.state.score;
    const collision = this.state.update();

    this.eventBus.emit(GameEvent.Tick, { tick: this.state.tickCount });

    // React to collision results.
    switch (collision.type) {
      case 'food':
        this.eventBus.emit(GameEvent.FoodEaten, { position: collision.position });
        this.eventBus.emit(GameEvent.ScoreChange, {
          score: this.state.score,
          highScore: this.state.highScore,
        });
        break;

      case 'wall':
      case 'self':
        this.saveHighScore();
        this.eventBus.emit(GameEvent.GameOver, {
          score: this.state.score,
          highScore: this.state.highScore,
        });
        this.eventBus.emit(GameEvent.StatusChange, { status: GameStatus.GameOver });
        break;
    }

    // Render.
    this.renderFrame();
    this.eventBus.emit(GameEvent.Render, undefined as any);
  }

  /** Render the grid and HUD to the terminal. */
  private renderFrame(): void {
    this.renderer.draw(this.state);
    this.scoreDisplay.draw(this.state);
  }

  // ── High score persistence ────────────────────────────────────────

  /** Load the high score from the filesystem. */
  private loadHighScore(): void {
    try {
      const filePath = path.resolve(HIGH_SCORE_FILE);
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, 'utf8').trim();
        const parsed = parseInt(data, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          this.state.setHighScore(parsed);
        }
      }
    } catch {
      // Silently ignore read errors.
    }
  }

  /** Persist the high score to the filesystem. */
  private saveHighScore(): void {
    try {
      const filePath = path.resolve(HIGH_SCORE_FILE);
      fs.writeFileSync(filePath, String(this.state.highScore), 'utf8');
    } catch {
      // Silently ignore write errors.
    }
  }
}
