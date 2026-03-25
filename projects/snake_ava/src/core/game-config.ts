import { Vector2D } from './vector2-d';
import { Entity } from './entity';

export class GameConfig {
  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly seed: number = Date.now()
  ) {}

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
 }

  getSeed(): number {
    return this.seed;
  }
}
