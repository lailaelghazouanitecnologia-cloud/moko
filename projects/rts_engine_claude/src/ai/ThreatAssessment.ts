/**
 * Threat assessment: evaluates the military situation for AI decision-making.
 *
 * Computes:
 * - Local threat levels around key positions
 * - Army strength comparisons between players
 * - Vulnerability of bases and expansions
 */

import { World } from '../core/World';
import { Vector2 } from '../math/Vector2';
import {
  PositionData,
  CombatData,
  HealthData,
  UnitIdentityData,
} from '../units/UnitComponents';
import { getDamageMultiplier } from '../combat/DamageCalculator';
import { ArmorType, AttackType } from '../units/UnitType';

/** Summary of military strength in a region */
export interface ThreatInfo {
  /** Estimated total DPS (damage per second) */
  readonly totalDps: number;
  /** Total HP of all units */
  readonly totalHp: number;
  /** Number of units */
  readonly unitCount: number;
  /** Combined threat score (DPS * HP as a rough power metric) */
  readonly threatScore: number;
}

export class ThreatAssessment {
  private readonly _world: World;

  constructor(world: World) {
    this._world = world;
  }

  /**
   * Assess military threat around a position within a radius.
   * @param center - Position to assess
   * @param radius - Assessment radius in tiles
   * @param forPlayerId - The player assessing the threat
   * @returns Threat info for enemy units in the area
   */
  assessThreatAt(center: Vector2, radius: number, forPlayerId: number): ThreatInfo {
    const units = this._world.getEntitiesByTag('unit');
    let totalDps = 0;
    let totalHp = 0;
    let unitCount = 0;

    for (const unit of units) {
      const identity = unit.getComponent<UnitIdentityData>('UnitIdentity');
      if (!identity || identity.data.playerId === forPlayerId) continue;

      const pos = unit.getComponent<PositionData>('Position');
      if (!pos) continue;

      const distance = center.distanceTo(new Vector2(pos.data.x, pos.data.y));
      if (distance > radius) continue;

      const combat = unit.getComponent<CombatData>('Combat');
      const health = unit.getComponent<HealthData>('Health');

      if (combat) {
        // Estimate DPS assuming attacking a medium-armor target
        const multiplier = getDamageMultiplier(combat.data.attackType, ArmorType.Medium);
        totalDps += combat.data.attackDamage * combat.data.attackSpeed * multiplier;
      }
      if (health) {
        totalHp += health.data.current;
      }
      unitCount++;
    }

    return {
      totalDps,
      totalHp,
      unitCount,
      threatScore: Math.sqrt(totalDps * totalHp), // geometric mean-ish
    };
  }

  /**
   * Compute the total army strength for a player.
   */
  getArmyStrength(playerId: number): ThreatInfo {
    const units = this._world.getEntitiesByTag(`player_${playerId}`);
    let totalDps = 0;
    let totalHp = 0;
    let unitCount = 0;

    for (const unit of units) {
      if (!unit.hasTag('unit')) continue;

      const combat = unit.getComponent<CombatData>('Combat');
      const health = unit.getComponent<HealthData>('Health');

      if (combat) {
        totalDps += combat.data.attackDamage * combat.data.attackSpeed;
      }
      if (health) {
        totalHp += health.data.current;
      }
      unitCount++;
    }

    return {
      totalDps,
      totalHp,
      unitCount,
      threatScore: Math.sqrt(totalDps * totalHp),
    };
  }

  /**
   * Find the most threatened position among a player's buildings.
   * Returns the building position with the highest nearby enemy threat.
   */
  findMostThreatenedBase(playerId: number): { position: Vector2; threat: ThreatInfo } | null {
    const buildings = this._world.getEntitiesByTag('building').filter((b) => {
      const identity = b.getComponent<UnitIdentityData>('UnitIdentity') ??
        b.getComponent<import('../buildings/BuildingComponents').BuildingIdentityData>('BuildingIdentity');
      return identity && (identity.data as { playerId: number }).playerId === playerId;
    });

    let maxThreat: ThreatInfo | null = null;
    let maxThreatPos: Vector2 | null = null;

    for (const building of buildings) {
      const pos = building.getComponent<PositionData>('Position');
      if (!pos) continue;

      const bPos = new Vector2(pos.data.x, pos.data.y);
      const threat = this.assessThreatAt(bPos, 12, playerId);

      if (!maxThreat || threat.threatScore > maxThreat.threatScore) {
        maxThreat = threat;
        maxThreatPos = bPos;
      }
    }

    if (maxThreat && maxThreatPos && maxThreat.unitCount > 0) {
      return { position: maxThreatPos, threat: maxThreat };
    }
    return null;
  }

  /**
   * Evaluate whether the AI should attack (has favorable army ratio).
   */
  shouldAttack(aiPlayerId: number, enemyPlayerId: number, threshold: number = 1.3): boolean {
    const myArmy = this.getArmyStrength(aiPlayerId);
    const enemyArmy = this.getArmyStrength(enemyPlayerId);

    if (enemyArmy.threatScore === 0) return myArmy.unitCount > 0;
    return myArmy.threatScore / enemyArmy.threatScore >= threshold;
  }
}
