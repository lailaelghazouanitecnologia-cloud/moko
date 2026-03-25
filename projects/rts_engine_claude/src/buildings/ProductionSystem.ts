/**
 * Production system: processes building production queues,
 * training units and spawning them near the building.
 */

import { System } from '../core/System';
import { Entity } from '../core/Entity';
import { World } from '../core/World';
import { EventBus, GameEventType } from '../core/EventBus';
import { ComponentData } from '../core/Component';
import { TileMap } from '../terrain/TileMap';
import { Vector2 } from '../math/Vector2';
import { UnitType, UNIT_STATS } from '../units/UnitType';
import { createUnit } from '../units/UnitFactory';
import { ResourceManager } from '../resources/ResourceManager';
import {
  ProductionQueueData,
  ConstructionData,
  BuildingIdentityData,
  QueueEntry,
} from './BuildingComponents';
import { UNIT_TRAINING_COSTS } from './BuildingType';
import { PositionData } from '../units/UnitComponents';

export class ProductionSystem extends System<ComponentData> {
  private readonly _world: World;
  private readonly _eventBus: EventBus;
  private readonly _tileMap: TileMap;
  private readonly _resourceManager: ResourceManager;

  constructor(
    world: World,
    eventBus: EventBus,
    tileMap: TileMap,
    resourceManager: ResourceManager,
  ) {
    super('ProductionSystem', 40);
    this._world = world;
    this._eventBus = eventBus;
    this._tileMap = tileMap;
    this._resourceManager = resourceManager;
  }

  get requiredComponents(): readonly string[] {
    return ['ProductionQueue', 'Construction', 'BuildingIdentity', 'Position'];
  }

  update(entities: readonly Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const queueComp = entity.getComponent<ProductionQueueData>('ProductionQueue')!;
      const constComp = entity.getComponent<ConstructionData>('Construction')!;
      const identComp = entity.getComponent<BuildingIdentityData>('BuildingIdentity')!;
      const posComp = entity.getComponent<PositionData>('Position')!;

      // Can only produce if construction is complete
      if (!constComp.data.isComplete) continue;

      const queue = queueComp.data.queue;
      if (queue.length === 0) continue;

      // Process the front of the queue
      const current = queue[0];
      current.timeRemaining -= deltaTime;

      if (current.timeRemaining <= 0) {
        // Unit training complete — spawn it
        const spawnPos = this._findSpawnPosition(posComp.data, identComp.data.size);

        if (spawnPos) {
          const unit = createUnit(current.unitType, identComp.data.playerId, spawnPos);
          this._world.addEntity(unit);
          this._tileMap.setOccupant(Math.floor(spawnPos.x), Math.floor(spawnPos.y), unit.id);

          this._eventBus.emit({
            type: GameEventType.ProductionCompleted,
            buildingId: entity.id,
            unitType: current.unitType,
            entityId: unit.id,
          });

          this._eventBus.emit({
            type: GameEventType.UnitTrained,
            entityId: unit.id,
            buildingId: entity.id,
            playerId: identComp.data.playerId,
          });
        }

        // Remove from queue
        const newQueue = queue.slice(1);
        queueComp.setData({ queue: newQueue });
      }
    }
  }

  /**
   * Queue a unit for production at a building.
   * Returns true if successfully queued (building can produce it, player can afford it).
   */
  queueUnit(buildingId: number, unitType: UnitType): boolean {
    const building = this._world.getEntity(buildingId);
    if (!building) return false;

    const queueComp = building.getComponent<ProductionQueueData>('ProductionQueue');
    const identComp = building.getComponent<BuildingIdentityData>('BuildingIdentity');
    const constComp = building.getComponent<ConstructionData>('Construction');

    if (!queueComp || !identComp || !constComp) return false;
    if (!constComp.data.isComplete) return false;

    // Check if building can produce this unit type
    if (!queueComp.data.producibleUnits.includes(unitType)) return false;

    // Check queue capacity
    if (queueComp.data.queue.length >= queueComp.data.maxQueueSize) return false;

    // Check resources
    const cost = UNIT_TRAINING_COSTS[unitType];
    if (!this._resourceManager.spend(identComp.data.playerId, cost)) return false;

    // Add to queue
    const entry: QueueEntry = {
      unitType,
      timeRemaining: UNIT_STATS[unitType].buildTime,
      totalTime: UNIT_STATS[unitType].buildTime,
    };

    const newQueue = [...queueComp.data.queue, entry];
    queueComp.setData({ queue: newQueue });

    this._eventBus.emit({
      type: GameEventType.ProductionStarted,
      buildingId,
      unitType,
    });

    return true;
  }

  /** Cancel the last item in a building's production queue (refunds resources) */
  cancelLast(buildingId: number): boolean {
    const building = this._world.getEntity(buildingId);
    if (!building) return false;

    const queueComp = building.getComponent<ProductionQueueData>('ProductionQueue');
    const identComp = building.getComponent<BuildingIdentityData>('BuildingIdentity');
    if (!queueComp || !identComp) return false;

    const queue = queueComp.data.queue;
    if (queue.length === 0) return false;

    const cancelled = queue[queue.length - 1];
    const cost = UNIT_TRAINING_COSTS[cancelled.unitType];

    // Refund resources
    for (const [type, amount] of Object.entries(cost)) {
      if (amount !== undefined && amount > 0) {
        this._resourceManager.addResource(
          identComp.data.playerId,
          type as Parameters<typeof this._resourceManager.addResource>[1],
          amount,
        );
      }
    }

    queueComp.setData({ queue: queue.slice(0, -1) });
    return true;
  }

  /** Set a building's rally point for newly produced units */
  setRallyPoint(buildingId: number, point: Vector2): void {
    const building = this._world.getEntity(buildingId);
    if (!building) return;

    const queueComp = building.getComponent<ProductionQueueData>('ProductionQueue');
    if (queueComp) {
      queueComp.setData({ rallyPoint: { x: point.x, y: point.y } });
    }
  }

  /** Find a passable tile adjacent to the building for unit spawning */
  private _findSpawnPosition(
    buildingPos: PositionData,
    buildingSize: { w: number; h: number },
  ): Vector2 | null {
    const bx = Math.floor(buildingPos.x);
    const by = Math.floor(buildingPos.y);

    // Check tiles around the building perimeter
    for (let dy = -1; dy <= buildingSize.h; dy++) {
      for (let dx = -1; dx <= buildingSize.w; dx++) {
        // Only check perimeter
        if (dx >= 0 && dx < buildingSize.w && dy >= 0 && dy < buildingSize.h) continue;

        const sx = bx + dx;
        const sy = by + dy;

        if (this._tileMap.isPassable(sx, sy)) {
          return new Vector2(sx, sy);
        }
      }
    }

    return this._tileMap.findNearestPassable(new Vector2(bx, by));
  }
}
