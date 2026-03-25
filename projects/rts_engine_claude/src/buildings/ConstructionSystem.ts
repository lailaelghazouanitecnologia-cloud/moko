/**
 * Construction system: advances building construction progress
 * and handles completion.
 */

import { System } from '../core/System';
import { Entity } from '../core/Entity';
import { EventBus, GameEventType } from '../core/EventBus';
import { ComponentData } from '../core/Component';
import { ConstructionData, BuildingIdentityData } from './BuildingComponents';
import { HealthData, PositionData } from '../units/UnitComponents';

export class ConstructionSystem extends System<ComponentData> {
  private readonly _eventBus: EventBus;

  constructor(eventBus: EventBus) {
    super('ConstructionSystem', 35);
    this._eventBus = eventBus;
  }

  get requiredComponents(): readonly string[] {
    return ['Construction', 'BuildingIdentity', 'Health', 'Position'];
  }

  update(entities: readonly Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const constComp = entity.getComponent<ConstructionData>('Construction')!;
      const identComp = entity.getComponent<BuildingIdentityData>('BuildingIdentity')!;
      const healthComp = entity.getComponent<HealthData>('Health')!;
      const posComp = entity.getComponent<PositionData>('Position')!;
      const construction = constComp.data;

      if (construction.isComplete) continue;

      // Only advance if a builder is assigned (or set to auto-build)
      const buildRate = construction.builderId !== null ? 1.0 : 0.0;
      if (buildRate <= 0) continue;

      const newRemaining = Math.max(0, construction.buildTimeRemaining - deltaTime * buildRate);
      const newProgress = 1 - (newRemaining / construction.buildTimeTotal);

      constComp.setData({
        buildTimeRemaining: newRemaining,
        buildProgress: newProgress,
      });

      // Building HP scales with construction progress
      const scaledHp = Math.floor(healthComp.data.max * newProgress);
      healthComp.setData({ current: Math.max(healthComp.data.current, scaledHp) });

      // Check completion
      if (newRemaining <= 0) {
        constComp.setData({ isComplete: true, buildProgress: 1 });
        healthComp.setData({ current: healthComp.data.max });

        this._eventBus.emit({
          type: GameEventType.BuildingCompleted,
          entityId: entity.id,
          playerId: identComp.data.playerId,
        });
      }
    }
  }

  /** Assign a worker to build/repair a building */
  assignBuilder(buildingId: number, workerId: number, entities: ReadonlyMap<number, Entity>): void {
    const building = entities.get(buildingId);
    if (!building) return;

    const constComp = building.getComponent<ConstructionData>('Construction');
    if (constComp) {
      constComp.setData({ builderId: workerId });
    }
  }

  /** Remove builder assignment */
  removeBuilder(buildingId: number, entities: ReadonlyMap<number, Entity>): void {
    const building = entities.get(buildingId);
    if (!building) return;

    const constComp = building.getComponent<ConstructionData>('Construction');
    if (constComp) {
      constComp.setData({ builderId: null });
    }
  }
}
