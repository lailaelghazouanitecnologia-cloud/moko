/**
 * Health system: handles HP regeneration and death.
 */

import { System } from '../core/System';
import { Entity } from '../core/Entity';
import { EventBus, GameEventType } from '../core/EventBus';
import { HealthData } from './UnitComponents';
import { ComponentData } from '../core/Component';
import { TileMap } from '../terrain/TileMap';

export class HealthSystem extends System<ComponentData> {
  private readonly _eventBus: EventBus;
  private readonly _pendingDeaths: Array<{ entityId: number; killerId: number | null }> = [];

  constructor(eventBus: EventBus, _tileMap: TileMap) {
    super('HealthSystem', 20);
    this._eventBus = eventBus;
  }

  get requiredComponents(): readonly string[] {
    return ['Health'];
  }

  update(entities: readonly Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const healthComp = entity.getComponent<HealthData>('Health')!;
      const health = healthComp.data;

      // Regeneration
      if (health.regenRate > 0 && health.current < health.max && health.current > 0) {
        const newHp = Math.min(health.max, health.current + health.regenRate * deltaTime);
        healthComp.setData({ current: newHp });
      }

      // Death check
      if (health.current <= 0) {
        this._pendingDeaths.push({ entityId: entity.id, killerId: null });
      }
    }
  }

  /** Apply damage to an entity. Returns remaining health. */
  applyDamage(entityId: number, damage: number, sourceId: number | null, entities: ReadonlyMap<number, Entity>): number {
    const entity = entities.get(entityId);
    if (!entity) return 0;

    const healthComp = entity.getComponent<HealthData>('Health');
    if (!healthComp) return 0;

    const newHp = Math.max(0, healthComp.data.current - damage);
    healthComp.setData({ current: newHp });

    this._eventBus.emit({
      type: GameEventType.DamageDealt,
      sourceId: sourceId ?? -1,
      targetId: entityId,
      damage,
      remainingHealth: newHp,
    });

    if (newHp <= 0) {
      this._pendingDeaths.push({ entityId, killerId: sourceId });
    }

    return newHp;
  }

  /** Apply healing to an entity */
  applyHealing(entityId: number, amount: number, entities: ReadonlyMap<number, Entity>): void {
    const entity = entities.get(entityId);
    if (!entity) return;

    const healthComp = entity.getComponent<HealthData>('Health');
    if (!healthComp) return;

    const newHp = Math.min(healthComp.data.max, healthComp.data.current + amount);
    healthComp.setData({ current: newHp });
  }

  /**
   * Process pending deaths: emit events and clean up tilemap.
   * Should be called after all systems have updated.
   */
  processDeath(world: { removeEntity(id: number): boolean }): number[] {
    const deadIds: number[] = [];

    for (const death of this._pendingDeaths) {
      deadIds.push(death.entityId);

      this._eventBus.emit({
        type: GameEventType.UnitDied,
        entityId: death.entityId,
        killerId: death.killerId,
      });

      world.removeEntity(death.entityId);
    }

    this._pendingDeaths.length = 0;
    return deadIds;
  }
}
