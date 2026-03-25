/**
 * The World is the top-level ECS container.
 * It manages all entities and systems, handling entity queries
 * and system execution order.
 */

import { Entity } from './Entity';
import { System } from './System';
import { ComponentData } from './Component';

export class World {
  private readonly _entities: Map<number, Entity> = new Map();
  private readonly _systems: System<ComponentData>[] = [];
  private _systemsSorted: boolean = true;

  /** Create and register a new entity */
  createEntity(): Entity {
    const entity = new Entity();
    this._entities.set(entity.id, entity);
    return entity;
  }

  /** Add a pre-built entity to the world */
  addEntity(entity: Entity): void {
    this._entities.set(entity.id, entity);
  }

  /** Remove an entity by id */
  removeEntity(id: number): boolean {
    return this._entities.delete(id);
  }

  /** Get an entity by id */
  getEntity(id: number): Entity | undefined {
    return this._entities.get(id);
  }

  /** Get all active entities */
  getActiveEntities(): Entity[] {
    return Array.from(this._entities.values()).filter((e) => e.active);
  }

  /** Get all entities (including inactive) */
  getAllEntities(): ReadonlyMap<number, Entity> {
    return this._entities;
  }

  /** Query entities by tag */
  getEntitiesByTag(tag: string): Entity[] {
    return Array.from(this._entities.values()).filter(
      (e) => e.active && e.hasTag(tag)
    );
  }

  /** Query entities that have all specified component types */
  getEntitiesWithComponents(types: readonly string[]): Entity[] {
    return Array.from(this._entities.values()).filter(
      (e) => e.active && e.hasAllComponents(types)
    );
  }

  /** Register a system. Systems are sorted by priority before execution. */
  addSystem(system: System<ComponentData>): void {
    this._systems.push(system);
    this._systemsSorted = false;
    system.initialize();
  }

  /** Remove a system by reference */
  removeSystem(system: System<ComponentData>): boolean {
    const index = this._systems.indexOf(system);
    if (index >= 0) {
      system.destroy();
      this._systems.splice(index, 1);
      return true;
    }
    return false;
  }

  /** Get a system by name */
  getSystem<T extends System<ComponentData>>(name: string): T | undefined {
    return this._systems.find((s) => s.name === name) as T | undefined;
  }

  /**
   * Run all enabled systems in priority order.
   * Each system receives only the entities that match its required components.
   */
  update(deltaTime: number): void {
    if (!this._systemsSorted) {
      this._systems.sort((a, b) => a.priority - b.priority);
      this._systemsSorted = true;
    }

    const allEntities = Array.from(this._entities.values());

    for (const system of this._systems) {
      if (system.enabled) {
        const matching = system.filterEntities(allEntities);
        system.update(matching, deltaTime);
      }
    }
  }

  /** Total entity count */
  get entityCount(): number {
    return this._entities.size;
  }

  /** Total system count */
  get systemCount(): number {
    return this._systems.length;
  }

  /** Remove all entities and systems */
  clear(): void {
    for (const system of this._systems) {
      system.destroy();
    }
    this._systems.length = 0;
    this._entities.clear();
  }
}
