// ── Core ────────────────────────────────────────────────────────────
export {
  Direction,
  GameStatus,
  CellType,
  GameEvent,
  Vector2D,
  GRID_WIDTH,
  GRID_HEIGHT,
  TICK_RATE,
  INITIAL_LENGTH,
  POINTS_PER_FOOD,
  MIN_TICK_RATE,
  TICK_RATE_DECREASE,
  HIGH_SCORE_FILE,
  OPPOSITE_DIRECTIONS,
  DEFAULT_CONFIG,
} from './core';

export type {
  Position,
  GameConfig,
  GameEventMap,
  CollisionResult,
} from './core';

// ── Game ────────────────────────────────────────────────────────────
export { Snake, FoodSpawner, CollisionDetector, GameState } from './game';

// ── Input ───────────────────────────────────────────────────────────
export { InputHandler, DEFAULT_KEY_BINDINGS } from './input';
export type { KeyBinding } from './input';

// ── Renderer ────────────────────────────────────────────────────────
export { ConsoleRenderer, ScoreDisplay } from './renderer';

// ── Engine ──────────────────────────────────────────────────────────
export { GameLoop, EventBus } from './engine';
export type { EventListener } from './engine';

// ── Main entry point ────────────────────────────────────────────────

/**
 * Launch the Snake game in the terminal.
 * Called when this module is run directly via `node dist/index.js`.
 */
function main(): void {
  const { GameLoop } = require('./engine');
  const loop = new GameLoop();

  // Graceful shutdown on SIGINT / SIGTERM.
  const shutdown = () => {
    loop.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  loop.start();
}

// Run main() if this file is the entry point.
if (require.main === module) {
  main();
}
