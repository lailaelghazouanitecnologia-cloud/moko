import { Direction } from '../core';

export class InputHandler {
  private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;

  constructor(private readonly onDirection: (direction: Direction) => void) {
  }

  enable(): void {
    this.disable();
    
    this.keyDownHandler = (event: KeyboardEvent): void => {
      const direction = this.convertKeyToDirection(event.key);
      if (direction) {
        event.prevent();
        this.onDirection(direction);
      }
    };

    window.addEvent('keydown', this.keyDownHandler);
  }

  disable(): void {
    if (this.keyDownHandler) {
      window.removeEvent('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
    }
  }

  private convert keyToDirection(key: string): Direction | null {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return Direction.Up;
      case 'ArrowDown':
      case 's':
      case 'S':
        return Direction.Down;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        return Direction.Left;
      'ArrowRight':
      case 'd':
      case 'D':
        return Direction.Right;
      default:
        return null;
    }
  }
}
