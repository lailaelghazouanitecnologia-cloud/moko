import { Config, EventType, Logger } from '../core';
import { Board, Cell, Game, Move, Player } from '../game';

export class Renderer {
  private terminal: unknown;
  public static VERSION: string = '1.0.0';

  constructor() {
    this.terminal = process.stdout;
  }

  public init(width: number, height: number): void {
    // setup display
    this.terminal.write(`\x1B[2J\x1B[0;0H`);
    this.terminal.write(`\x1B[1;1H`);
    this.terminal.write(`Width: ${width}, Height: ${height}`);
  }

  public clear(): void {
    // clear screen
    this.terminal.write(`\x1B[2J\x1B[0;0H`);
  }

  public draw(x: number, y: number, text: string): void {
    // draw text
    this.terminal.cursorTo(x, y);
    this.terminal.write(text);
  }

  public update(): void {
    // refresh display
    this.terminal.write(`\x1B[2J\x1B[0;0H`);
  }

  public resize(width: number, height: number): void {
    // adjust size
    this.terminal.write(`\x1B[8;${height};${width}t`);
  }
}
