/**
 * Damage calculation engine with armor-type vs attack-type multipliers.
 *
 * Damage formula:
 *   effectiveDamage = baseDamage * typeMultiplier * terrainModifier - armorReduction
 *   finalDamage = max(1, effectiveDamage)  // always deal at least 1 damage
 *
 * The type multiplier matrix is inspired by classic RTS games:
 * - Normal attacks are good against medium armor
 * - Pierce attacks are good against unarmored/light
 * - Siege attacks are good against fortified/heavy
 * - Magic attacks bypass armor type entirely
 */

import { ArmorType, AttackType } from '../units/UnitType';

/**
 * Attack type vs armor type damage multiplier matrix.
 * Values > 1.0 mean bonus damage; < 1.0 mean resistance.
 */
const DAMAGE_MATRIX: Readonly<Record<AttackType, Readonly<Record<ArmorType, number>>>> = {
  [AttackType.Normal]: {
    [ArmorType.Unarmored]: 1.0,
    [ArmorType.Light]: 1.0,
    [ArmorType.Medium]: 1.5,
    [ArmorType.Heavy]: 0.75,
    [ArmorType.Fortified]: 0.5,
  },
  [AttackType.Pierce]: {
    [ArmorType.Unarmored]: 1.5,
    [ArmorType.Light]: 1.5,
    [ArmorType.Medium]: 0.75,
    [ArmorType.Heavy]: 0.5,
    [ArmorType.Fortified]: 0.35,
  },
  [AttackType.Siege]: {
    [ArmorType.Unarmored]: 0.5,
    [ArmorType.Light]: 0.5,
    [ArmorType.Medium]: 0.75,
    [ArmorType.Heavy]: 1.5,
    [ArmorType.Fortified]: 2.0,
  },
  [AttackType.Magic]: {
    [ArmorType.Unarmored]: 1.0,
    [ArmorType.Light]: 1.0,
    [ArmorType.Medium]: 1.0,
    [ArmorType.Heavy]: 1.0,
    [ArmorType.Fortified]: 1.0,
  },
  [AttackType.Hero]: {
    [ArmorType.Unarmored]: 1.0,
    [ArmorType.Light]: 1.0,
    [ArmorType.Medium]: 1.0,
    [ArmorType.Heavy]: 1.0,
    [ArmorType.Fortified]: 1.0,
  },
};

export interface DamageResult {
  /** Final damage dealt after all modifiers */
  readonly finalDamage: number;
  /** The type multiplier that was applied */
  readonly typeMultiplier: number;
  /** Armor reduction amount */
  readonly armorReduction: number;
  /** Terrain defense bonus that was applied */
  readonly terrainBonus: number;
}

/**
 * Calculate damage from an attack.
 *
 * @param baseDamage - Attacker's raw attack damage
 * @param attackType - Attacker's damage type
 * @param armorType - Defender's armor type
 * @param armorValue - Defender's flat armor reduction
 * @param terrainDefenseBonus - 0-1 bonus from terrain (e.g., 0.25 for forests)
 * @param bonusMultiplier - Additional multiplier from upgrades, abilities, etc.
 */
export function calculateDamage(
  baseDamage: number,
  attackType: AttackType,
  armorType: ArmorType,
  armorValue: number,
  terrainDefenseBonus: number = 0,
  bonusMultiplier: number = 1.0,
): DamageResult {
  const typeMultiplier = DAMAGE_MATRIX[attackType][armorType];

  // Armor reduces damage by a flat amount, boosted by terrain
  const effectiveArmor = armorValue * (1 + terrainDefenseBonus);
  const armorReduction = effectiveArmor;

  const rawDamage = baseDamage * typeMultiplier * bonusMultiplier;
  const finalDamage = Math.max(1, Math.round(rawDamage - armorReduction));

  return {
    finalDamage,
    typeMultiplier,
    armorReduction: effectiveArmor,
    terrainBonus: terrainDefenseBonus,
  };
}

/**
 * Get the damage multiplier for a specific attack/armor combination.
 * Useful for AI threat assessment.
 */
export function getDamageMultiplier(attackType: AttackType, armorType: ArmorType): number {
  return DAMAGE_MATRIX[attackType][armorType];
}
