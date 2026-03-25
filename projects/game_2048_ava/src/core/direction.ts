import { Position } from './position';

export enum Direction {
  Up = 'Up',
  Down = 'Down',
  Left = 'Left',
  Right = 'Right'
}

export namespace Direction {
  export function delta(dir: Direction): Position {
    switch (dir) {
      case Direction.Up: return new Position(-1, 0);
      case Direction.Down: return new Position(1, 0);
      case Direction.Left: return new Position(0, -1);
      case Direction.Right: return new Position(0, 1);
    }
  }

  export function name(dir: Direction): string {
    return dir;
  }

  export function value(dir: Direction): Position {
    return delta(dir);
  }

  export function opposite(dir: Direction): Direction {
    switch (dir) {
      case Direction.Up: return Direction.Down;
      case Direction.Down: return Direction.Up;
      case Direction.Left: return Direction.Right;
      case Direction.Right: return Direction.Left;
    }
  }
}
