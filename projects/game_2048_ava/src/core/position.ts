import { Direction } from './direction';

export class Position {
  readonly row: number;
  readonly col: number;

  constructor(row: number, col: number) {
    this.row = row;
    this.col = col;
  }

  equals(other: Position): boolean {
    return this.row === other.row && this.col === other.col;
  }

  clone(): Position {
    return new Position(this.row, this.col);
  }

  add(direction: Direction): Position {
    const delta = direction.value();
    return new Position(this.row + delta.row, this.col + delta.col);
  }

  toString(): string {
    return `(${this.row},${this.col})`;
  }

  isValid(size: number): boolean {
    return this.row >= 0 && this.col >= 0 && this.row < size && this.col < size;
  }
}
