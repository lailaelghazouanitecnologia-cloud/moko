import { Vector2D, Entity } from '../core';
import { CollisionDetector } from './collision-detector';
import { EntityManager } from './entity-manager';

export class GameWorld {
  private readonly collisionDetector: CollisionDetector;
  private readonly entityManager: EntityManager;
  private readonly worldSize: Vector2D;

  constructor(worldSize: Vector2D) {
    this.worldSize = worldSize;
    this.collisionDetector = new CollisionDetector(new Vector2D(1, 1), worldSize);
    this.entityManager = new EntityManager();
  }

  update(deltaTime: number): void {
    const entities = this.entityManager.getAllEntities();
    
    for (const entity of entities) {
      entity.update(deltaTime);
      
      if (this.collisionDetector.isOutOfBounds(entity)) {
        entity.wrap(this.worldSize);
      }
      
      this.collisionDetector.clampToGrid(entity);
    }
    
    this.checkCollisions();
  }

  private checkCollisions(): void {
    const entities = this.entityManager.getAllEntities();
    
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        if (this.collisionDetector.checkCollision(entities[i], entities[j])) {
          this.handleCollision(entities[i], entities[j]);
        }
      }
    }
  }

  private handleCollision(a: Entity, b: Entity): void {
    // Collision handling logic
  }

  addEntity(entity: Entity): void {
    this.entityManager.addEntity(entity);
  }

  removeEntity(entity: Entity): void {
    this.entityManager.removeEntity(entity);
  }

  getEntities(): ReadonlyArray<Entity> {
    return this.entityManager.getAllEntities();
  }

  getEntityById(id: string): Entity | undefined {
    return this.entityManager.getEntityById(id);
  }

  clear(): void {
    this.entityManager.clear();
  }

  getWorldSize(): Vector2D {
    return this.worldSize;
  }

  getCollisionDetector(): CollisionDetector {
    return this.collisionDetector;
  }

  getEntityManager(): EntityManager {
    return this.entityManager;
  }
}
