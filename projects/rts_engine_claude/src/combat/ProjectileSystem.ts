/**
 * Projectile system: manages ranged attack projectiles that travel
 * from source to target over time.
 */

import { ComponentData } from '../core/Component';
import { Component } from '../core/Component';
import { Entity } from '../core/Entity';
import { System } from '../core/System';
import { World } from '../core/World';
import { EventBus, GameEventType } from '../core/EventBus';
import { Vector2 } from '../math/Vector2';
import { PositionData, createPositionData } from '../units/UnitComponents';

// ── Projectile Component ──────────────────────────────────────────

export interface ProjectileData extends ComponentData {
  readonly type: 'Projectile';
  sourceId: number;
  targetId: number;
  damage: number;
  speed: number;           // tiles per second
  origin: Vector2;
  targetPos: Vector2;      // snapshot of target position at fire time
  progress: number;        // 0 to 1
  splashRadius: number;    // 0 = no splash
}

export function createProjectileData(
  sourceId: number,
  targetId: number,
  damage: number,
  speed: number,
  origin: Vector2,
  targetPos: Vector2,
  splashRadius: number = 0,
): ProjectileData {
  return {
    type: 'Projectile',
    sourceId,
    targetId,
    damage,
    speed,
    origin,
    targetPos,
    progress: 0,
    splashRadius,
  };
}

export class ProjectileSystem extends System<ComponentData> {
  private readonly _world: World;
  private readonly _eventBus: EventBus;
  private readonly _pendingHits: Array<{ projectileId: number; targetId: number; damage: number; splashRadius: number; hitPos: Vector2 }> = [];

  constructor(world: World, eventBus: EventBus) {
    super('ProjectileSystem', 15);
    this._world = world;
    this._eventBus = eventBus;
  }

  get requiredComponents(): readonly string[] {
    return ['Projectile', 'Position'];
  }

  update(entities: readonly Entity[], deltaTime: number): void {
    for (const entity of entities) {
      const projComp = entity.getComponent<ProjectileData>('Projectile')!;
      const posComp = entity.getComponent<PositionData>('Position')!;
      const proj = projComp.data;

      // Calculate travel progress
      const totalDistance = proj.origin.distanceTo(proj.targetPos);
      if (totalDistance <= 0) {
        // Instant hit
        this._registerHit(entity.id, proj);
        continue;
      }

      const progressDelta = (proj.speed * deltaTime) / totalDistance;
      const newProgress = Math.min(1, proj.progress + progressDelta);
      projComp.setData({ progress: newProgress });

      // Update visual position (interpolate along trajectory)
      const currentPos = proj.origin.lerp(proj.targetPos, newProgress);
      posComp.setData({ x: currentPos.x, y: currentPos.y });

      // Check if projectile has reached target
      if (newProgress >= 1) {
        this._registerHit(entity.id, proj);
      }
    }
  }

  private _registerHit(projectileId: number, proj: ProjectileData): void {
    this._pendingHits.push({
      projectileId,
      targetId: proj.targetId,
      damage: proj.damage,
      splashRadius: proj.splashRadius,
      hitPos: proj.targetPos,
    });
  }

  /** Get and clear pending hits for the combat system to process */
  consumeHits(): ReadonlyArray<{ projectileId: number; targetId: number; damage: number; splashRadius: number; hitPos: Vector2 }> {
    const hits = [...this._pendingHits];
    this._pendingHits.length = 0;
    return hits;
  }

  /**
   * Spawn a projectile entity from source to target.
   */
  fireProjectile(
    sourceId: number,
    targetId: number,
    damage: number,
    speed: number,
    origin: Vector2,
    targetPos: Vector2,
    splashRadius: number = 0,
  ): Entity {
    const projectile = this._world.createEntity();
    projectile.addTag('projectile');

    projectile.addComponent(new Component(createPositionData(origin.x, origin.y)));
    projectile.addComponent(new Component(
      createProjectileData(sourceId, targetId, damage, speed, origin, targetPos, splashRadius)
    ));

    this._eventBus.emit({
      type: GameEventType.ProjectileFired,
      projectileId: projectile.id,
      sourceId,
      targetId,
    });

    return projectile;
  }

  /** Remove projectile entities that have hit their target */
  cleanupHitProjectiles(): void {
    const projectiles = this._world.getEntitiesByTag('projectile');
    for (const p of projectiles) {
      const proj = p.getComponent<ProjectileData>('Projectile');
      if (proj && proj.data.progress >= 1) {
        this._world.removeEntity(p.id);
      }
    }
  }
}
