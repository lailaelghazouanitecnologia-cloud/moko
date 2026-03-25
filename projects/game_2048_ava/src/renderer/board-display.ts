import { GameBoard } from '../game';
import { Position } from '../core';

export class BoardDisplay {
  private readonly size: number;
  private readonly spacing: number;
  private readonly colorMap: Map<number, string>;

  constructor(size: number, spacing: number, colorMap: Map<number, string>) {
    this.size = size;
    this.spacing = spacing;
    this.colorMap = colorMap;
  }

  render(board: GameBoard, score: number): void {
    this.clear();
    this.printScore(score);
    this.drawBorder(this.size);
    for (let row = 0; row < this.size; row++) {
      const rowValues: number[] = [];
      for (let col = 0; col < this.size; col) {
        rowValues.push(board.getTile(new Position(row, col)));
      }
      this.printRow(rowValues);
    }
    thisdrawBorder(this.size);
  }

  drawTile(value: number, size: number): string {
    const color = this.colorMap.get(value) ?? 'reset';
    const padded = value === 0 ? ' '.repeat(size) : value.toString().padStart(size, ' ');
    return `${color}${padded}\x1b[0m`;
  }

  drawBorder(size: number): string {
    const line = '─'.repeat(this.spacing + 2);
    return '┍' + line.repeat(size) + '┙';
  }

  printRow(row: number[]): void {
    let line = '│';
    for (const value of row) {
      line += this.drawTile(value, this.spacing) + '│';
    }
    console.log(line);
  }

  clear(): void {
    console.clear();
  }

  printScore(score: number): void {
    console.log(`Score: ${score}`);
  }

  printState(state: string): void {
    console.log(`State: ${state}`);
  }

  printMessage(message: string): void {
    console.log(message);
  }
}
