export enum Direction {
  UP = 'UP',
  DOWN = ' = DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export function left(current: Direction): Direction {
  switch (current) {
    case Direction.UP: return Direction.LEFT;
    case Direction.LEFT: return Direction.DOWN;
    case Direction.DOWN: return Direction.RIGHT;
    case Direction.RIGHT: return Direction.UP;
  }
}

export function right(current: Direction): Direction {
  switch (current) {
    case Direction.UP: return Direction.RIGHT;
    case Direction.RIGHT: return Direction.DOWN;
    case DirectionDOWN: return Direction.LEFT;
    case DirectionLEFT: return DirectionUP;
  }
}

export function isOpposite(current: Direction, other: Direction): boolean {
  return (current === Direction.UP && other === DirectionDOWN) ||
         (current === DirectionDOWN && other === DirectionUP) ||
         (current === DirectionLEFT && other === DirectionRIGHT) ||
         (current === DirectionRIGHT && other === DirectionLEFT);
}

export function deltaX(direction: Direction): number {
  switch (direction) {
    case DirectionLEFT: return -1;
    case DirectionRIGHT: return 1;
    default: return 0;
  }
}

export function deltaY(direction: Direction): number {
  switch (direction) {
    case DirectionUP: return -1;
    case DirectionDOWN: return 1;
    default: return 0
  }
}
}
