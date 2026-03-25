/**
 * Generic 2D grid backed by a flat array for cache-friendly access.
 * Used for tilemaps, pathfinding grids, fog of war, etc.
 */

export class Grid<T> {
  public readonly width: number;
  public readonly height: number;
  private readonly _data: T[];

  constructor(width: number, height: number, defaultValue: T | ((x: number, y: number) => T)) {
    this.width = width;
    this.height = height;
    this._data = new Array<T>(width * height);

    if (typeof defaultValue === 'function') {
      const factory = defaultValue as (x: number, y: number) => T;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          this._data[y * width + x] = factory(x, y);
        }
      }
    } else {
      this._data.fill(defaultValue);
    }
  }

  /** Check if coordinates are within bounds */
  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /** Get value at (x, y). Returns undefined if out of bounds. */
  get(x: number, y: number): T | undefined {
    if (!this.inBounds(x, y)) return undefined;
    return this._data[y * this.width + x];
  }

  /** Set value at (x, y). No-op if out of bounds. */
  set(x: number, y: number, value: T): void {
    if (!this.inBounds(x, y)) return;
    this._data[y * this.width + x] = value;
  }

  /** Get value at (x, y), throwing if out of bounds */
  getUnsafe(x: number, y: number): T {
    return this._data[y * this.width + x];
  }

  /** Fill entire grid with a value */
  fill(value: T): void {
    this._data.fill(value);
  }

  /** Iterate over all cells with coordinates */
  forEach(callback: (value: T, x: number, y: number) => void): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        callback(this._data[y * this.width + x], x, y);
      }
    }
  }

  /**
   * Get the 4-connected (cardinal) neighbors of a cell.
   * Returns array of {x, y, value} for in-bounds neighbors.
   */
  getNeighbors4(x: number, y: number): Array<{ x: number; y: number; value: T }> {
    const neighbors: Array<{ x: number; y: number; value: T }> = [];
    const dirs = [
      [0, -1], [1, 0], [0, 1], [-1, 0],
    ];
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (this.inBounds(nx, ny)) {
        neighbors.push({ x: nx, y: ny, value: this._data[ny * this.width + nx] });
      }
    }
    return neighbors;
  }

  /**
   * Get the 8-connected neighbors (including diagonals).
   */
  getNeighbors8(x: number, y: number): Array<{ x: number; y: number; value: T }> {
    const neighbors: Array<{ x: number; y: number; value: T }> = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (this.inBounds(nx, ny)) {
          neighbors.push({ x: nx, y: ny, value: this._data[ny * this.width + nx] });
        }
      }
    }
    return neighbors;
  }

  /** Create a deep copy (only works for primitive/value types) */
  clone(): Grid<T> {
    const grid = new Grid<T>(this.width, this.height, this._data[0]);
    for (let i = 0; i < this._data.length; i++) {
      grid._data[i] = this._data[i];
    }
    return grid;
  }

  /** Total number of cells */
  get size(): number {
    return this.width * this.height;
  }
}
