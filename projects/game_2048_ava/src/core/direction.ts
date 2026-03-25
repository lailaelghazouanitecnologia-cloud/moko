export enum Direction {
  Up = 'Up',
  Down = 'Down',
  Left = 'Left',
  Right = 'Right'
}

export function toVector(dir: Direction): { x: number; y: number } {
  switch (dir) {
    case Direction.Up: return { x: 0, y: -1 };
    case Direction.Down: return { x: 0, y: 1 };
    case Direction.Left: return { x: -1, y: 0 };
    case Direction.Right: return { x: 1, y: 0 };
  }
}

export function opposite(dir: Direction): Direction {
  switch (dir) {
    case Direction.Up: return Direction.Down;
    case Direction.Down: return Direction.Up;
    case Direction.Left: return Direction.Right;
    case Direction.Right: return Direction.Left;
  }
}

export function rotate(dir: Direction): Direction {
  switch (dir) {
    case Direction.Up: return Direction.Right;
    case Direction.Down: return Direction.Left;
    case Direction.Left: return Direction.Up;
    case Direction.Right: return Direction.Down;
  }
}

export function rotateCounter(dir: Direction): Direction {
  switch (dir) {
    case Direction.Up: return Direction.Left;
    case Direction.Down: return Direction.Right;
    case Direction.Left: return Direction.Down;
    case Direction.Right: return Direction.Up;
  }
}
