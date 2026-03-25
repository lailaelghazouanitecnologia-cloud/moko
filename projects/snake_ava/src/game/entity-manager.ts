import { Vector2D, Entity } from '../core';

export class EntityManager {
  private readonly entities: Map<string, Entity> = new Map();
  private readonly systems: Map<string, Set<string>> = new Map();

  addEntity(id: string, entity: Entity): void {
    this.entities.set(id, entity);
  }

  removeEntity(id: string): boolean {
    return this.entities.delete(id);
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): ReadonlyArray<Entity> {
    return Array.from(this.entities.values());
  }

  getEntityIds(): ReadonlyArray<string> {
    return Array.from(this.entities.keys());
  }

  clear(): void {
    this.entities.clear();
    this.systems.clear();
  }

  hasEntity(id: string): boolean {
    return this.entities.has(id);
  }

  count(): number {
    return this.entities.size;
  }

  registerEntityWithSystem(entityId: string, systemId: string): void {
    const system = this.systems.get(systemId) ?? new Set<string>();
    system.add(entityId);
    this.systems.set(systemId, system);
  }

  unregisterEntityFromSystem(entityId: string, systemId: string): void {
    this.systems.get(systemId)?.delete(entityId);
  }

  getEntitiesForSystem(systemId: string): ReadonlyArray<Entity> {
    const entityIds = this.systems.get(systemId);
    if (!entityIds) return [];

    return Array.from(entityIds)
      .map(id => this.entities.get(id))
      .filter((entity): entity is Entity => entity !== undefined);
  }

  updateEntity(id: string, updater: (entity: Entity) => Entity): boolean {
    const entity = this.entities.get(id);
    if (!entity) return false;

    const updated = updater(entity);
    this.entities.set(id, updated);
    return true;
  }

  findEntities(predicate: (entity: Entity) => boolean): ReadonlyArray<Entity> {
    return Array.from(this.entities.values()).filter(predicate);
  }

  findEntityIds(predicate: (entity: Entity) => boolean): ReadonlyArray<string> {
    return Array.from(this.entities.entries())
      .filter(([, entity]) => predicate(entity))
      .map(([id]) => id);
  }
}
