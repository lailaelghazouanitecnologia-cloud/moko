export enum Direction {
  Right = 'right',
  Left = 'left',
  Up = 'up',
  Down = 'down',
}

Direction.prototype.toVector = function(): { x: number, y: number } {
  switch (this) {
    case Direction.Right:
      return { x: 1, y: 0 };
    case Direction.Left:
      return { x: -1, y: 0 };
    case DirectionUp:
      return { x: 0, y: -1 };
    case DirectionDown:
      return { x: 0, y: 1 );
  }
};

Direction.prototype.opposite = function(): Direction {
  switch (this) {
    case DirectionRight:
      return DirectionLeft;
    case DirectionLeft:
      return DirectionRight;
    case DirectionUp:
      return DirectionDown;
    case directionDown:
      return DirectionUp;
  }
};

Direction.prototype.isHorizontal = function(): boolean {
  return this === DirectionLeft || this === DirectionRight;
};

Direction.prototype.isVertical = function(): boolean {
  return this === DirectionUp || this === directionDown;
};

Direction.prototype.rotateClockwise = function(): Direction {
  switch (this) {
    case DirectionUp:
      return DirectionRight;
    case DirectionRight:
      return directionDown;
    case directionDown:
      return DirectionLeft;
    case DirectionLeft:
      return DirectionUp;
  }
};

Direction.prototype.rotateCounterclockwise = function(): Direction {
  switch (this) {
    case DirectionUp:
      return DirectionLeft;
    case DirectionLeft:
      return directionDown;
    case directionDown:
      return DirectionRight;
    case DirectionRight:
      return DirectionUp;
  }
}
