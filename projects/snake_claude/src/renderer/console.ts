import { CellType, Position, GameStatus } from '../core/types';
import { GameState } from '../game/state';

/** Box-drawing characters used to render the grid border. */
const BOX = {
  topLeft: '\u250C',     // ┌
  topRight: '\u2510',    // ┐
  bottomLeft: '\u2514',  // └
  bottomRight: '\u2518', // ┘
  horizontal: '\u2500',  // ─
  vertical: '\u2502',    // │
} as const;

/** Characters used to render cell contents. */
const CELL_CHARS: Readonly<Record<CellType, string>> = {
  [CellType.Empty]: ' ',
  [CellType.SnakeHead]: '@',
  [CellType.SnakeBody]: '#',
  [CellType.Food]: '*',
  [CellType.Wall]: '\u2588', // █
};

/**
 * Renders the game state to the terminal using Unicode box-drawing characters.
 * Each cell is rendered as two characters wide for a more square appearance.
 */
export class ConsoleRenderer {
  private readonly doubleWidth: boolean;

  /**
   * @param doubleWidth - If `true`, each cell is rendered two characters wide.
   *                      Defaults to `true` for a more square aspect ratio.
   */
  constructor(doubleWidth: boolean = true) {
    this.doubleWidth = doubleWidth;
  }

  /**
   * Build the complete grid as a 2D array of CellTypes.
   * @param state - The current game state.
   * @returns A height x width array of cell types.
   */
  buildGrid(state: GameState): CellType[][] {
    const grid: CellType[][] = [];

    for (let y = 0; y < state.gridHeight; y++) {
      const row: CellType[] = [];
      for (let x = 0; x < state.gridWidth; x++) {
        row.push(CellType.Empty);
      }
      grid.push(row);
    }

    // Place the snake body (tail first so the head overwrites).
    const body = state.snake.body;
    for (let i = body.length - 1; i >= 1; i--) {
      const seg = body[i];
      if (this.inBounds(seg, state.gridWidth, state.gridHeight)) {
        grid[seg.y][seg.x] = CellType.SnakeBody;
      }
    }

    // Place the head.
    const head = state.snake.head;
    if (this.inBounds(head, state.gridWidth, state.gridHeight)) {
      grid[head.y][head.x] = CellType.SnakeHead;
    }

    // Place food.
    const food = state.food;
    if (food) {
      grid[food.y][food.x] = CellType.Food;
    }

    return grid;
  }

  /**
   * Render the full frame (border + grid + status) as a string.
   * @param state - The current game state.
   * @returns The rendered frame.
   */
  render(state: GameState): string {
    const grid = this.buildGrid(state);
    const lines: string[] = [];

    const cellWidth = this.doubleWidth ? 2 : 1;
    const innerWidth = state.gridWidth * cellWidth;

    // Top border.
    lines.push(BOX.topLeft + BOX.horizontal.repeat(innerWidth) + BOX.topRight);

    // Grid rows.
    for (const row of grid) {
      let rowStr = BOX.vertical;
      for (const cell of row) {
        const ch = CELL_CHARS[cell];
        rowStr += this.doubleWidth ? ch + ch : ch;
      }
      rowStr += BOX.vertical;
      lines.push(rowStr);
    }

    // Bottom border.
    lines.push(BOX.bottomLeft + BOX.horizontal.repeat(innerWidth) + BOX.bottomRight);

    return lines.join('\n');
  }

  /**
   * Render the frame and write it to stdout, clearing the screen first.
   * @param state - The current game state.
   */
  draw(state: GameState): void {
    // Move cursor to top-left and clear screen.
    process.stdout.write('\x1b[2J\x1b[H');

    const frame = this.render(state);
    process.stdout.write(frame + '\n');
  }

  /** Check if a position is within grid bounds. */
  private inBounds(pos: Position, width: number, height: number): boolean {
    return pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height;
  }
}
