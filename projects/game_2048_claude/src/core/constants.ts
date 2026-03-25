/** Default grid size (4x4). */
export const GRID_SIZE = 4;

/** Value required to win the game. */
export const WIN_VALUE = 2048;

/** Number of tiles placed at game start. */
export const INITIAL_TILES = 2;

/** Probability of spawning a 4 instead of a 2. */
export const FOUR_PROBABILITY = 0.1;

/** ANSI color codes mapped to tile values for terminal rendering. */
export const TILE_COLORS: Readonly<Record<number, string>> = {
  0: "\x1b[90m",       // dark gray (empty)
  2: "\x1b[97m",       // bright white
  4: "\x1b[93m",       // bright yellow
  8: "\x1b[33m",       // orange-ish
  16: "\x1b[91m",      // bright red
  32: "\x1b[31m",      // red
  64: "\x1b[95m",      // bright magenta
  128: "\x1b[96m",     // bright cyan
  256: "\x1b[94m",     // bright blue
  512: "\x1b[92m",     // bright green
  1024: "\x1b[32m",    // green
  2048: "\x1b[1;93m",  // bold bright yellow
};

/** ANSI background colors for tiles. */
export const TILE_BG_COLORS: Readonly<Record<number, string>> = {
  0: "\x1b[48;5;236m",
  2: "\x1b[48;5;255m",
  4: "\x1b[48;5;229m",
  8: "\x1b[48;5;215m",
  16: "\x1b[48;5;209m",
  32: "\x1b[48;5;203m",
  64: "\x1b[48;5;197m",
  128: "\x1b[48;5;228m",
  256: "\x1b[48;5;227m",
  512: "\x1b[48;5;226m",
  1024: "\x1b[48;5;220m",
  2048: "\x1b[48;5;214m",
};

/** ANSI reset sequence. */
export const RESET = "\x1b[0m";

/** Bold ANSI sequence. */
export const BOLD = "\x1b[1m";
