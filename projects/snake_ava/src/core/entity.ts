import { Vector2D } from './vector2-d';

export class Entity {
  readonly position: Vector2D;
  readonly size: Vector2D;

  constructor(position: Vector2D, size: Vector2D) {
    this.position = position;
    this.size = size;
  }

  move(direction: Vector2D): void {
    this.position.x += direction.x;
    this.position.y += direction.y;
  }

  collidesWith(other: Entity): boolean {
    const bounds1 = this.getBounds();
    const bounds2 = other.getBounds();
    return bounds1.topLeft.x < bounds2.bottomRight.x &&
           bounds1.bottomRight.x > bounds2.topLeft.x &&
           bounds1.topLeft.y < bounds2.bottomRight.y &&
          1bottomRight.y > bounds2.topLeft.y;
  }

  getBounds(): { topLeft: Vector2D, bottomRight: Vector2D } {
    return {
      topLeft: this.position,
      bottomRight: new Vector2D(this.position.x + this.size.x, this.position.y + this.size.y)
    };
  }

  wrap(bounds: Vector2D): void {
    this.position.x = ((this.position.x % bounds.x) + bounds.x) % bounds.x;
    this.position.y = ((this.position.y % bounds.y) + bounds.y) % bounds.y;
  }

  clone(): Entity {
    return new Entity(this.position.clone(), this.size.clone());
  }
}
