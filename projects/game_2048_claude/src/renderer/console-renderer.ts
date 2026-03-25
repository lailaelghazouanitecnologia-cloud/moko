import {
  GRID_SIZE,
  TILE_COLORS,
  TILE_BG_COLORS,
  RESET,
  BOLD,
} from "../core";
import { Grid } from "../game";

/** Cell width in characters (must be odd for centred text). */
const CELL_WIDTH = 7;

/** Box-drawing characters. */
const BOX = {
  topLeft: "\u250c",
  topRight: "\u2510",
  bottomLeft: "\u2514",
  bottomRight: "\u2518",
  horizontal: "\u2500",
  vertical: "\u2502",
  teeDown: "\u252c",
  teeUp: "\u2534",
  teeRight: "\u251c",
  teeLeft: "\u2524",
  cross: "\u253c",
} as const;

/**
 * Renders the 2048 grid and status information to stdout.
 */
export class ConsoleRenderer {
  private readonly size: number;

  constructor(size: number = GRID_SIZE) {
    this.size = size;
  }

  /** Clear terminal and draw the full game frame. */
  render(grid: Grid): void {
    this.clearScreen();
    this.drawHeader(grid.score);
    this.drawGrid(grid);
    this.drawStatus(grid);
    this.drawControls();
  }

  /** Show the final game-over or win screen. */
  renderEndScreen(grid: Grid): void {
    this.clearScreen();
    this.drawHeader(grid.score);
    this.drawGrid(grid);

    if (grid.won) {
      console.log(`\n  ${BOLD}\x1b[93m*** YOU WIN! You reached 2048! ***${RESET}`);
    }
    if (grid.over) {
      console.log(`\n  ${BOLD}\x1b[91m*** GAME OVER! No moves left. ***${RESET}`);
    }
    console.log(`\n  Final score: ${BOLD}${grid.score}${RESET}`);
    console.log(`\n  Press ${BOLD}R${RESET} to restart or ${BOLD}Q${RESET} to quit.\n`);
  }

  // ── Private drawing helpers ─────────────────────────────────

  private clearScreen(): void {
    process.stdout.write("\x1b[2J\x1b[H");
  }

  private drawHeader(score: number): void {
    console.log();
    console.log(`  ${BOLD}\x1b[93m╔══════════════════════════╗${RESET}`);
    console.log(`  ${BOLD}\x1b[93m║${RESET}  ${BOLD}\x1b[97m2 0 4 8${RESET}   Score: ${BOLD}${this.padScore(score)}${RESET} ${BOLD}\x1b[93m║${RESET}`);
    console.log(`  ${BOLD}\x1b[93m╚══════════════════════════╝${RESET}`);
    console.log();
  }

  private drawGrid(grid: Grid): void {
    const lines: string[] = [];

    // Top border
    lines.push("  " + this.horizontalBorder(BOX.topLeft, BOX.teeDown, BOX.topRight));

    for (let row = 0; row < this.size; row++) {
      // Cell row
      let cellLine = "  " + BOX.vertical;
      for (let col = 0; col < this.size; col++) {
        const value = grid.getCell(row, col);
        cellLine += this.formatCell(value) + BOX.vertical;
      }
      lines.push(cellLine);

      // Separator or bottom border
      if (row < this.size - 1) {
        lines.push("  " + this.horizontalBorder(BOX.teeRight, BOX.cross, BOX.teeLeft));
      }
    }

    // Bottom border
    lines.push("  " + this.horizontalBorder(BOX.bottomLeft, BOX.teeUp, BOX.bottomRight));

    for (const line of lines) {
      console.log(line);
    }
  }

  private drawStatus(grid: Grid): void {
    if (grid.won) {
      console.log(`\n  ${BOLD}\x1b[93m🏆 You reached 2048! Press any direction to keep playing.${RESET}`);
    }
  }

  private drawControls(): void {
    console.log();
    console.log(`  ${BOLD}Controls:${RESET} WASD or Arrow Keys to move`);
    console.log(`           ${BOLD}R${RESET} = Restart  ${BOLD}Q${RESET} = Quit`);
    console.log();
  }

  private horizontalBorder(left: string, middle: string, right: string): string {
    const segment = BOX.horizontal.repeat(CELL_WIDTH);
    const parts: string[] = [];
    for (let i = 0; i < this.size; i++) {
      parts.push(segment);
    }
    return left + parts.join(middle) + right;
  }

  private formatCell(value: number): string {
    const text = value === 0 ? "\u00b7" : String(value);
    const padded = this.centerText(text, CELL_WIDTH);

    const fg = TILE_COLORS[value] ?? TILE_COLORS[0];
    const bg = TILE_BG_COLORS[value] ?? TILE_BG_COLORS[0];

    return `${bg}${fg}${value !== 0 ? BOLD : ""}${padded}${RESET}`;
  }

  private centerText(text: string, width: number): string {
    const pad = width - text.length;
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return " ".repeat(left) + text + " ".repeat(right);
  }

  private padScore(score: number): string {
    return String(score).padStart(6, " ");
  }
}
