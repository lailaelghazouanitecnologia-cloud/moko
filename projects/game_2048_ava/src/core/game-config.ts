export class GameConfig {
  private gridSize: number = 4;
  private winningTile: number = 2048;
  private allowUndo: boolean = false;
  private seed: number = 0;

  getGridSize(): number {
    return this.gridSize;
  }

  set(size: number): void {
    this.gridSize = size;
  }

  getWininTile(): number {
    return this.winningTile;
  }

  setWinnTile(value: number): void {
    this.winningTile = value;
  }

  isUndoAllowed(): boolean {
    return this.allowUndo;
  }

  setAllowUndo(allow: boolean): void {
    this.allowUndo = allow;
  }

  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }
}
