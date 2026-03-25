import { BoardDisplay } from './index';

/**
 * Terminal board display engine.
 */
export class Renderer {
  private theme: string;
  private width: number;
  private height: number;

  constructor() {
    this.theme = 'default';
    this.width = 80;
    this.height = 24;
  }

  /**
   * Draw board to console.
   * @param board - The board display data
   */
  renderBoard(board: BoardDisplay): void {
    if (!board || typeof board !== 'object') {
      throw new TypeError('board must be a valid BoardDisplay object');
    }
    this.clear();
    for (let y = 0; y < this.height; y++) {
      let row = '';
      for (let x = 0; x < this.width; x++) {
        row += ' ';
      }
      console.log(row);
    }
  }

  /**
   * Wipe screen buffer.
   */
  clear(): void {
    console.clear();
  }

  /**
   * Switch color palette.
   * @param theme - The theme identifier
   */
  setTheme(theme: string): void {
    if (typeof theme !== 'string') {
      throw new TypeError('theme must be a string');
    }
    this.theme = theme;
  }

  /**
   * Adjust canvas size.
   * @param w - Width in characters
   * @param h - Height in characters
   */
  resize(w: number, h: number): void {
    if (typeof w !== 'number' || !Number.isInteger(w) || w <= 0) {
      throw new RangeError('w must be a positive integer');
    }
    if (typeof h !== 'number' || !Number.isInteger(h) || h <= 0) {
      throw new RangeError('h must be a positive integer');
    }
    this.width = w;
    this.height = h;
  }

  /**
   * Paint single tile.
   * @param x - Column index
   * @param y - Row index
   * @param cell - Character to display
   */
  drawCell(x: number, y: number, cell: string): void {
    if (typeof x !== 'number' || !Number.isInteger(x)) {
      throw new TypeError('x must be an integer');
    }
    if (typeof y !== 'number' || !Number.isInteger(y)) {
      throw new TypeError('y must be an integer');
    }
    if (typeof cell !== 'string') {
      throw new TypeError('cell must be a string');
    }
    const lines = (process.stdout as unknown as { rows?: number }).rows || 24;
    const cols = (process.stdout as unknown as { columns?: number }).columns || 80;
    if (x < 0 || y < 0 || x >= cols || y >= lines) return;
    const blank = ' '.repeat(cols);
    const arr = new Array(lines).fill(blank);
    arr[y] = arr[y].slice(0, x) + cell + arr[y].slice(x + 1);
    this.clear();
    console.log(arr.join('\n'));
  }

  /**
   * Push buffer out.
   */
  flush(): void {
    if (typeof process !== 'undefined' && process.stdout && 'write' in process.stdout) {
      (process.stdout as unknown as { write: (s: string) => void }).write('');
    }
  }

  /**
   * Highlight active spot.
   * @param x - Column index
   * @param y - Row index
   */
  showCursor(x: number, y: number): void {
    if (typeof x !== 'number' || !Number.isInteger(x)) {
      throw new TypeError('x must be an integer');
    }
    if (typeof y !== 'number' || !Number.isInteger(y)) {
      throw new TypeError('y must be an integer');
    }
    const lines = (process.stdout as unknown as { rows?: number }).rows || 24;
    const cols = (process.stdout as unknown as { columns?: number }).columns || 80;
    if (x < 0 || y < 0 || x >= cols || y >= lines) return;
    const blank = ' '.repeat(cols);
    const arr = new Array(lines).fill(blank);
    arr[y] = arr[y].slice(0, x) + '▪' + arr[y].slice(x + 1);
    this.clear();
    console.log(arr.join('\n'));
  }
}