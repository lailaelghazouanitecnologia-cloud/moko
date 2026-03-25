/**
 * Movement system: advances units along their computed A* paths.
 *
 * Each tick, for each unit with a path:
 * 1. Compute how far the unit can travel this tick (speed * dt)
 * 2. Interpolate along the path, advancing through waypoints
 * 3. Update the unit's position and the tilemap occupancy
 * 4. Emit UnitMoved events
 */

import { System } from '../core/System';
import { Entity } from '../core/Entity';
import { EventBus, GameEventType } from '../core/EventBus';
import { TileMap } from '../terrain/TileMap';
import { Vector2 } from '../math/Vector2';
import { findPath } from '../math/Pathfinding';
import { MovementData, PositionData } from './UnitComponents';
import { ComponentData } from '../core/Component';

export class MovementSystem extends System<ComponentData> {
  private readonly _eventBus: EventBus;
  private readonly _tileMap: TileMap;

  constructor(eventBus: EventBus, tileMap: TileMap) {
    super('MovementSystem', 10);
    this._eventBus = eventBus;
    this._tileMap = tileMap;
  }

  get requiredComponents(): readonly string[] {
    return ['Position', 'Movement'];
  }

  update(entities: readonly Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const posComp = entity.getComponent<PositionData>('Position')!;
      const movComp = entity.getComponent<MovementData>('Movement')!;
      const pos = posComp.data;
      const mov = movComp.data;

      if (!mov.isMoving || mov.path.length === 0) continue;
      if (mov.pathIndex >= mov.path.length) {
        movComp.setData({ isMoving: false, path: [], pathIndex: 0, moveProgress: 0 });
        continue;
      }

      let distanceRemaining = mov.speed * deltaTime;

      while (distanceRemaining > 0 && mov.pathIndex < mov.path.length) {
        const target = mov.path[mov.pathIndex];
        const currentPos = new Vector2(pos.x, pos.y);
        const distToWaypoint = currentPos.distanceTo(target);

        if (distanceRemaining >= distToWaypoint) {
          // Arrive at waypoint
          distanceRemaining -= distToWaypoint;
          const oldX = Math.floor(pos.x);
          const oldY = Math.floor(pos.y);

          posComp.setData({ x: target.x, y: target.y });

          // Update tilemap occupancy
          const newX = Math.floor(target.x);
          const newY = Math.floor(target.y);
          if (oldX !== newX || oldY !== newY) {
            this._tileMap.setOccupant(oldX, oldY, null);
            this._tileMap.setOccupant(newX, newY, entity.id);
          }

          movComp.setData({ pathIndex: mov.pathIndex + 1, moveProgress: 0 });

          this._eventBus.emit({
            type: GameEventType.UnitMoved,
            entityId: entity.id,
            from: currentPos,
            to: target,
          });
        } else {
          // Partial move toward next waypoint
          const direction = target.subtract(currentPos).normalize();
          const newPos = currentPos.add(direction.multiply(distanceRemaining));
          posComp.setData({ x: newPos.x, y: newPos.y });
          movComp.setData({ moveProgress: distanceRemaining / distToWaypoint });
          distanceRemaining = 0;
        }
      }

      // Reached end of path
      if (mov.pathIndex >= mov.path.length) {
        movComp.setData({ isMoving: false, path: [], pathIndex: 0, moveProgress: 0 });
      }
    }
  }

  /**
   * Command a unit to move to a destination.
   * Computes an A* path and sets the movement component.
   */
  commandMove(entity: Entity, destination: Vector2): boolean {
    const posComp = entity.getComponent<PositionData>('Position');
    const movComp = entity.getComponent<MovementData>('Movement');
    if (!posComp || !movComp) return false;

    const pos = posComp.data;
    const start = new Vector2(Math.floor(pos.x), Math.floor(pos.y));
    const goal = destination.floor();

    const result = findPath(
      this._tileMap.width,
      this._tileMap.height,
      start,
      goal,
      this._tileMap.getCostFunction(false),
    );

    if (result.found && result.path.length > 0) {
      movComp.setData({
        path: [...result.path],
        pathIndex: 1, // skip first waypoint (current position)
        moveProgress: 0,
        isMoving: true,
      });
      return true;
    }
    return false;
  }

  /** Stop a unit's movement */
  commandStop(entity: Entity): void {
    const movComp = entity.getComponent<MovementData>('Movement');
    if (movComp) {
      movComp.setData({ isMoving: false, path: [], pathIndex: 0, moveProgress: 0 });
    }
  }
}
