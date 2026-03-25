/**
 * Gathering system: manages worker resource collection.
 *
 * Worker gathering cycle:
 * 1. Move to resource node
 * 2. Gather resources over time (fill carry capacity)
 * 3. Move to nearest drop-off building
 * 4. Deposit resources
 * 5. Return to resource node
 */

import { System } from '../core/System';
import { Entity } from '../core/Entity';
import { World } from '../core/World';
import { EventBus, GameEventType } from '../core/EventBus';
import { ComponentData } from '../core/Component';
import { Vector2 } from '../math/Vector2';
import {
  GatheringData,
  PositionData,
  UnitIdentityData,
} from '../units/UnitComponents';
import { ResourceNodeData } from './ResourceNodeComponent';
import { ResourceManager } from './ResourceManager';
import { ResourceType } from './ResourceType';

export class GatheringSystem extends System<ComponentData> {
  private readonly _world: World;
  private readonly _eventBus: EventBus;
  private readonly _resourceManager: ResourceManager;

  constructor(world: World, eventBus: EventBus, resourceManager: ResourceManager) {
    super('GatheringSystem', 30);
    this._world = world;
    this._eventBus = eventBus;
    this._resourceManager = resourceManager;
  }

  get requiredComponents(): readonly string[] {
    return ['Gathering', 'Position', 'UnitIdentity'];
  }

  update(entities: readonly Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const gatherComp = entity.getComponent<GatheringData>('Gathering')!;
      const posComp = entity.getComponent<PositionData>('Position')!;
      const gather = gatherComp.data;
      const pos = posComp.data;

      if (!gather.canGather) continue;

      // If carrying full load, try to drop off
      if (gather.currentCarry >= gather.carryCapacity && gather.carryingType !== null) {
        this._tryDropOff(entity);
        continue;
      }

      // If we have a target resource, try to gather
      if (gather.targetResourceId !== null) {
        const targetNode = this._world.getEntity(gather.targetResourceId);
        if (!targetNode || !targetNode.active) {
          gatherComp.setData({ targetResourceId: null });
          continue;
        }

        const nodeData = targetNode.getComponent<ResourceNodeData>('ResourceNode');
        const nodePos = targetNode.getComponent<PositionData>('Position');
        if (!nodeData || !nodePos) continue;

        const distance = new Vector2(pos.x, pos.y).distanceTo(
          new Vector2(nodePos.data.x, nodePos.data.y)
        );

        // Must be adjacent to gather
        if (distance <= 1.5) {
          this._gatherResource(entity, targetNode, deltaTime);
        }
      }
    }
  }

  /** Gather from the target resource node */
  private _gatherResource(worker: Entity, node: Entity, deltaTime: number): void {
    const gatherComp = worker.getComponent<GatheringData>('Gathering');
    const nodeComp = node.getComponent<ResourceNodeData>('ResourceNode');
    if (!gatherComp || !nodeComp) return;

    const gather = gatherComp.data;
    const nodeData = nodeComp.data;

    if (nodeData.remaining <= 0) {
      gatherComp.setData({ targetResourceId: null });
      return;
    }

    const gatherAmount = Math.min(
      gather.gatherRate * deltaTime,
      gather.carryCapacity - gather.currentCarry,
      nodeData.remaining,
    );

    gatherComp.setData({
      currentCarry: gather.currentCarry + gatherAmount,
      carryingType: nodeData.resourceType,
    });

    nodeComp.setData({
      remaining: nodeData.remaining - gatherAmount,
    });

    if (nodeData.remaining - gatherAmount <= 0) {
      this._eventBus.emit({
        type: GameEventType.ResourceDepleted,
        entityId: node.id,
        resourceType: nodeData.resourceType,
      });
    }
  }

  /** Try to drop off carried resources at the nearest drop-off building */
  private _tryDropOff(worker: Entity): void {
    const gatherComp = worker.getComponent<GatheringData>('Gathering');
    const posComp = worker.getComponent<PositionData>('Position');
    const identityComp = worker.getComponent<UnitIdentityData>('UnitIdentity');
    if (!gatherComp || !posComp || !identityComp) return;

    const gather = gatherComp.data;
    const pos = posComp.data;
    const identity = identityComp.data;

    if (gather.dropOffBuildingId !== null) {
      const building = this._world.getEntity(gather.dropOffBuildingId);
      if (building) {
        const bPos = building.getComponent<PositionData>('Position');
        if (bPos) {
          const dist = new Vector2(pos.x, pos.y).distanceTo(
            new Vector2(bPos.data.x, bPos.data.y)
          );

          if (dist <= 2.0 && gather.carryingType !== null) {
            this._resourceManager.addResource(
              identity.playerId,
              gather.carryingType as ResourceType,
              gather.currentCarry,
            );

            gatherComp.setData({
              currentCarry: 0,
              carryingType: null,
            });
          }
        }
      }
    }
  }

  /** Command a worker to gather from a specific resource node */
  commandGather(workerId: number, resourceNodeId: number): void {
    const worker = this._world.getEntity(workerId);
    if (!worker) return;

    const gather = worker.getComponent<GatheringData>('Gathering');
    if (!gather || !gather.data.canGather) return;

    gather.setData({
      targetResourceId: resourceNodeId,
    });
  }

  /** Set the drop-off building for a worker */
  setDropOffBuilding(workerId: number, buildingId: number): void {
    const worker = this._world.getEntity(workerId);
    if (!worker) return;

    const gather = worker.getComponent<GatheringData>('Gathering');
    if (gather) {
      gather.setData({ dropOffBuildingId: buildingId });
    }
  }
}
