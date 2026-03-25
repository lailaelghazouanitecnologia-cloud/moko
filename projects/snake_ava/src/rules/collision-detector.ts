import { BoundingBox } from '../geometry/bounding-box';
import { CollisionEvent } from '../events/collision-event';

export class CollisionDetector {
  private readonly entities: Map<string, BoundingBox>;
  private collisionMatrix: boolean[][];

  constructor() {
    this.entities = new Map<string, BoundingBox>();
    this.collisionMatrix = [];
  }

  /**
   * Registers an entity for collision detection.
   * @param id Unique identifier for the entity
   * @param bounds Bounding box of the entity
   * @throws {TypeError} If id is not a non-empty string
   * @throws {TypeError} If bounds is not a valid BoundingBox
   */
  registerEntity(id: string, bounds: BoundingBox): void {
    if (typeof id !== 'string' || id.length === 0) {
      throw new TypeError('Entity id must be a non-empty string');
    }
    if (!this.isValidBoundingBox(bounds)) {
      throw new TypeError('Invalid bounding box provided');
    }

    this.entities.set(id, bounds);
    this.rebuildCollisionMatrix();
  }

  /**
   * Unregisters an entity from collision detection.
   * @param id Unique identifier of the entity to remove
   * @throws {TypeError} If id is not a non-empty string
   */
  unregisterEntity(id: string): void {
    if (typeof id !== 'string' || id.length === 0) {
      throw new TypeError('Entity id must be a non-empty string');
    }

    this.entities.delete(id);
    this.rebuildCollisionMatrix();
  }

  /**
   * Checks all registered entities for collisions.
   * @returns Array of collision events between pairs of entities
   */
  checkCollisions(): CollisionEvent[] {
    const events: CollisionEvent[] = [];
    const entries = Array.from(this.entities.entries());
    
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [idA, boxA] = entries[i];
        const [idB, boxB] = entries[j];
        
        if (this.isColliding(boxA, boxB)) {
          events.push({ entityA: idA, entityB: idB });
        }
      }
    }
    
    return events;
  }

  /**
   * Checks for collisions involving a specific entity.
   * @param id Unique identifier of the entity to check
   * @returns Array of collision events involving the specified entity
   * @throws {TypeError} If id is not a non-empty string
   */
  checkFor(id: string): CollisionEvent[] {
    if (typeof id !== 'string' || id.length === 0) {
      throw new TypeError('Entity id must be a non-empty string');
    }

    const targetBox = this.entities.get(id);
    if (!targetBox) {
      return [];
    }
    
    const events: CollisionEvent[] = [];
    
    for (const [otherId, otherBox] of this.entities.entries()) {
      if (otherId === id) {
        continue;
      }
      
      if (this.isColliding(targetBox, otherBox)) {
        events.push({ entityA: id, entityB: otherId });
      }
    }
    
    return events;
  }

  /**
   * Updates the bounding box of an existing entity.
   * @param id Unique identifier of the entity to update
   * @param bounds New bounding box for the entity
   * @throws {TypeError} If id is not a non-empty string
   * @throws {TypeError} If bounds is not a valid BoundingBox
   */
  updateBounds(id: string, bounds: BoundingBox): void {
    if (typeof id !== 'string' || id.length === 0) {
      throw new TypeError('Entity id must be a non-empty string');
    }
    if (!this.isValidBoundingBox(bounds)) {
      throw new TypeError('Invalid bounding box provided');
    }

    if (this.entities.has(id)) {
      this.entities.set(id, bounds);
    }
  }

  /**
   * Clears all registered entities and collision data.
   */
  clear(): void {
    this.entities.clear();
    this.collisionMatrix = [];
  }

  private rebuildCollisionMatrix(): void {
    const size = this.entities.size;
    this.collisionMatrix = Array(size).fill(null).map(() => Array(size).fill(false));
  }

  private isColliding(a: BoundingBox, b: BoundingBox): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private isValidBoundingBox(box: unknown): box is BoundingBox {
    return (
      typeof box === 'object' &&
      box !== null &&
      'x' in box &&
      'y' in box &&
      'width' in box &&
      'height' in box &&
      typeof (box as BoundingBox).x === 'number' &&
      typeof (box as BoundingBox).y === 'number' &&
      typeof (box as BoundingBox).width === 'number' &&
      typeof (box as BoundingBox).height === 'number' &&
      (box as BoundingBox).width >= 0 &&
      (box as BoundingBox).height >= 0
    );
  }
}
