/**
 * Combat system: handles attack targeting, cooldowns, range checks,
 * and delegates damage calculation to DamageCalculator.
 *
 * Each tick:
 * 1. Process projectile hits (from ProjectileSystem)
 * 2. For each combat entity with a target, check range and cooldown
 * 3. If in range and cooldown ready, attack (melee) or fire projectile (ranged)
 * 4. Auto-acquire targets for idle combat units (aggro range)
 */

import { System } from '../core/System';
import { Entity } from '../core/Entity';
import { World } from '../core/World';
import { EventBus, GameEventType } from '../core/EventBus';
import { ComponentData } from '../core/Component';
import { Vector2 } from '../math/Vector2';
import { TileMap } from '../terrain/TileMap';
import { CombatData, PositionData, UnitIdentityData } from '../units/UnitComponents';
import { HealthSystem } from '../units/HealthSystem';
import { calculateDamage } from './DamageCalculator';
import { ProjectileSystem } from './ProjectileSystem';

/** Auto-aggro range: units will engage enemies within this range */
const AUTO_AGGRO_RANGE = 8;

/** Projectile speed in tiles per second */
const PROJECTILE_SPEED = 12;

export class CombatSystem extends System<ComponentData> {
  private readonly _world: World;
  private readonly _eventBus: EventBus;
  private readonly _tileMap: TileMap;
  private readonly _healthSystem: HealthSystem;
  private readonly _projectileSystem: ProjectileSystem;

  constructor(
    world: World,
    eventBus: EventBus,
    tileMap: TileMap,
    healthSystem: HealthSystem,
    projectileSystem: ProjectileSystem,
  ) {
    super('CombatSystem', 25);
    this._world = world;
    this._eventBus = eventBus;
    this._tileMap = tileMap;
    this._healthSystem = healthSystem;
    this._projectileSystem = projectileSystem;
  }

  get requiredComponents(): readonly string[] {
    return ['Combat', 'Position', 'UnitIdentity'];
  }

  update(entities: readonly Entity[], deltaTime: number): void {
    // Step 1: Process projectile hits
    this._processProjectileHits();

    // Step 2: Process combat for each unit
    for (const entity of entities) {
      const combatComp = entity.getComponent<CombatData>('Combat')!;
      const posComp = entity.getComponent<PositionData>('Position')!;
      const identityComp = entity.getComponent<UnitIdentityData>('UnitIdentity')!;
      const combat = combatComp.data;

      // Tick down attack cooldown
      if (combat.attackCooldown > 0) {
        combatComp.setData({
          attackCooldown: Math.max(0, combat.attackCooldown - deltaTime),
        });
      }

      // Skip if unit can't attack (e.g., healer with 0 damage)
      if (combat.attackDamage <= 0) continue;

      // Validate current target
      if (combat.targetId !== null) {
        const target = this._world.getEntity(combat.targetId);
        if (!target || !target.active) {
          combatComp.setData({ targetId: null });
        }
      }

      // Auto-acquire target if none
      if (combat.targetId === null) {
        const newTarget = this._findNearestEnemy(
          entity,
          posComp.data,
          identityComp.data.playerId,
          AUTO_AGGRO_RANGE,
        );
        if (newTarget !== null) {
          combatComp.setData({ targetId: newTarget });
        }
      }

      // Attack if we have a target
      if (combat.targetId !== null && combat.attackCooldown <= 0) {
        this._attemptAttack(entity);
      }
    }
  }

  /** Process hits from projectiles that reached their target */
  private _processProjectileHits(): void {
    const hits = this._projectileSystem.consumeHits();
    const allEntities = this._world.getAllEntities();

    for (const hit of hits) {
      if (hit.splashRadius > 0) {
        // Splash damage: damage all enemies near the impact
        this._applySplashDamage(hit.hitPos, hit.damage, hit.splashRadius, hit.projectileId);
      } else {
        // Direct hit
        this._healthSystem.applyDamage(hit.targetId, hit.damage, hit.projectileId, allEntities);
      }

      this._eventBus.emit({
        type: GameEventType.ProjectileHit,
        projectileId: hit.projectileId,
        targetId: hit.targetId,
        damage: hit.damage,
      });
    }

    this._projectileSystem.cleanupHitProjectiles();
  }

  /** Attempt to attack the current target */
  private _attemptAttack(attacker: Entity): void {
    const combatComp = attacker.getComponent<CombatData>('Combat');
    const posComp = attacker.getComponent<PositionData>('Position');
    if (!combatComp || !posComp) return;

    const combat = combatComp.data;
    const pos = posComp.data;

    if (combat.targetId === null) return;

    const target = this._world.getEntity(combat.targetId);
    if (!target) return;

    const targetPos = target.getComponent<PositionData>('Position');
    const targetCombat = target.getComponent<CombatData>('Combat');
    if (!targetPos) return;

    const attackerPos = new Vector2(pos.x, pos.y);
    const defenderPos = new Vector2(targetPos.data.x, targetPos.data.y);
    const distance = attackerPos.distanceTo(defenderPos);

    // Check range
    if (distance > combat.attackRange + 0.5) return;

    // Get terrain defense bonus
    const terrainProps = this._tileMap.getTerrainProperties(
      Math.floor(targetPos.data.x),
      Math.floor(targetPos.data.y),
    );

    const armorType = targetCombat ? targetCombat.data.armorType : combat.armorType;
    const armorValue = targetCombat ? targetCombat.data.armorValue : 0;

    const dmgResult = calculateDamage(
      combat.attackDamage,
      combat.attackType,
      armorType,
      armorValue,
      terrainProps.defenseBonus,
    );

    // Emit attack event
    this._eventBus.emit({
      type: GameEventType.UnitAttacked,
      attackerId: attacker.id,
      targetId: combat.targetId,
    });

    if (combat.attackRange > 1) {
      // Ranged attack: spawn projectile
      const splashRadius = combat.attackType === 'Siege' ? 1.5 : 0;
      this._projectileSystem.fireProjectile(
        attacker.id,
        combat.targetId,
        dmgResult.finalDamage,
        PROJECTILE_SPEED,
        attackerPos,
        defenderPos,
        splashRadius,
      );
    } else {
      // Melee attack: instant damage
      this._healthSystem.applyDamage(
        combat.targetId,
        dmgResult.finalDamage,
        attacker.id,
        this._world.getAllEntities(),
      );
    }

    // Reset cooldown
    const cooldown = 1 / combat.attackSpeed;
    combatComp.setData({ attackCooldown: cooldown });
  }

  /** Apply splash damage around an impact point */
  private _applySplashDamage(
    center: Vector2,
    damage: number,
    radius: number,
    _sourceId: number,
  ): void {
    const units = this._world.getEntitiesByTag('unit');
    const allEntities = this._world.getAllEntities();

    for (const unit of units) {
      const pos = unit.getComponent<PositionData>('Position');
      if (!pos) continue;

      const dist = center.distanceTo(new Vector2(pos.data.x, pos.data.y));
      if (dist <= radius) {
        // Damage falls off linearly with distance
        const falloff = 1 - (dist / radius) * 0.5;
        const splashDamage = Math.max(1, Math.round(damage * falloff));
        this._healthSystem.applyDamage(unit.id, splashDamage, _sourceId, allEntities);
      }
    }
  }

  /**
   * Find the nearest enemy unit within range.
   * Used for auto-aggro targeting.
   */
  private _findNearestEnemy(
    entity: Entity,
    pos: PositionData,
    playerId: number,
    range: number,
  ): number | null {
    const units = this._world.getEntitiesByTag('unit');
    let nearest: number | null = null;
    let nearestDist = range + 1;

    const myPos = new Vector2(pos.x, pos.y);

    for (const other of units) {
      if (other.id === entity.id) continue;

      const otherIdentity = other.getComponent<UnitIdentityData>('UnitIdentity');
      if (!otherIdentity || otherIdentity.data.playerId === playerId) continue;

      const otherPos = other.getComponent<PositionData>('Position');
      if (!otherPos) continue;

      const dist = myPos.distanceTo(new Vector2(otherPos.data.x, otherPos.data.y));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = other.id;
      }
    }

    return nearest;
  }

  /** Manually set a unit's attack target */
  commandAttack(attackerId: number, targetId: number): void {
    const attacker = this._world.getEntity(attackerId);
    if (!attacker) return;

    const combat = attacker.getComponent<CombatData>('Combat');
    if (combat) {
      combat.setData({ targetId });
    }
  }
}
