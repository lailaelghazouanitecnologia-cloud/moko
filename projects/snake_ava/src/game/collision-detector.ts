import { Vector2D, Entity } from '../core';

export class CollisionDetector {
  private readonly gridSize: Vector2D;
  private readonly worldBounds: Vector2D;

  constructor(gridSize: Vector2D, worldBounds: Vector2D) {
    this.gridSize = gridSize;
    this.worldBounds = worldBounds;
  }

  checkCollision(a: Entity, b: Entity): boolean {
    return a.collidesWith(b);
  }

  checkWallCollision(entity: Entity): boolean {
    const bounds = entity.getBounds();
    return bounds.topLeft.x < 0 || 
           bounds.topLeft.y < 0 || 
           bounds.bottomRight.x > this.worldBounds.x || 
           bounds.bottomRight.y > this.worldBounds.y;
  }

  checkSelfCollision(snake: Entity[]): boolean {
    if (snake.length < 2) return false;
    const head = snake[0];
    return snake.slice(1).some(segment => head.collidesWith(segment));
  }

  checkFoodCollision(snake: Entity, food: Entity): boolean {
    return snake.collidesWith(food);
  }

  getCollidingEntities(entity: Entity, others: Entity[]): Entity[] {
    return others.filter(other => entity.collidesWith(other));
  }

  clampToGrid(entity: Entity): void {
    const gridX = Math.floor(entity.position.x / this.gridSize.x) * this.gridSize.x;
    const gridY = Math.floor(entity.position.y / this.gridSize.y) * this.gridSize.y;
    entity.move(new Vector2D(gridX - entity.position.x, gridY - entity.position.y));
  }

  isOutOfBounds(entity: Entity): boolean {
    const bounds = entity.getBounds();
    return bounds.bottomRight.x < 0 || 
           bounds.bottomRight.y < 0 || 
           bounds.topLeft.x > this.worldBounds.x || 
           bounds.topLeft.y > this.worldBounds.y;
  }
}
