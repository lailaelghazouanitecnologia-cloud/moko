/**
 * Unit type definitions and their stat templates.
 * Each UnitType has base stats that are applied when a unit is created.
 */

export enum ArmorType {
  Unarmored = 'Unarmored',
  Light = 'Light',
  Medium = 'Medium',
  Heavy = 'Heavy',
  Fortified = 'Fortified',
}

export enum AttackType {
  Normal = 'Normal',
  Pierce = 'Pierce',
  Siege = 'Siege',
  Magic = 'Magic',
  Hero = 'Hero',
}

export enum UnitType {
  Worker = 'Worker',
  Infantry = 'Infantry',
  Archer = 'Archer',
  Cavalry = 'Cavalry',
  SiegeRam = 'SiegeRam',
  Catapult = 'Catapult',
  Scout = 'Scout',
  Healer = 'Healer',
}

/** Base stats template for a unit type */
export interface UnitStats {
  readonly unitType: UnitType;
  readonly maxHealth: number;
  readonly attackDamage: number;
  readonly attackRange: number;
  readonly attackSpeed: number;     // attacks per second
  readonly attackType: AttackType;
  readonly armorType: ArmorType;
  readonly armorValue: number;      // flat damage reduction
  readonly moveSpeed: number;       // tiles per second
  readonly sightRange: number;      // vision radius in tiles
  readonly buildTime: number;       // seconds to train
  readonly displayChar: string;     // console character
  readonly canGatherResources: boolean;
}

/** Lookup table for all unit type base stats */
export const UNIT_STATS: Readonly<Record<UnitType, UnitStats>> = {
  [UnitType.Worker]: {
    unitType: UnitType.Worker,
    maxHealth: 40,
    attackDamage: 5,
    attackRange: 1,
    attackSpeed: 0.8,
    attackType: AttackType.Normal,
    armorType: ArmorType.Unarmored,
    armorValue: 0,
    moveSpeed: 2.0,
    sightRange: 5,
    buildTime: 15,
    displayChar: 'w',
    canGatherResources: true,
  },
  [UnitType.Infantry]: {
    unitType: UnitType.Infantry,
    maxHealth: 100,
    attackDamage: 12,
    attackRange: 1,
    attackSpeed: 1.0,
    attackType: AttackType.Normal,
    armorType: ArmorType.Medium,
    armorValue: 3,
    moveSpeed: 2.5,
    sightRange: 6,
    buildTime: 20,
    displayChar: 'I',
    canGatherResources: false,
  },
  [UnitType.Archer]: {
    unitType: UnitType.Archer,
    maxHealth: 60,
    attackDamage: 10,
    attackRange: 6,
    attackSpeed: 1.2,
    attackType: AttackType.Pierce,
    armorType: ArmorType.Light,
    armorValue: 1,
    moveSpeed: 2.5,
    sightRange: 8,
    buildTime: 20,
    displayChar: 'A',
    canGatherResources: false,
  },
  [UnitType.Cavalry]: {
    unitType: UnitType.Cavalry,
    maxHealth: 120,
    attackDamage: 18,
    attackRange: 1,
    attackSpeed: 0.9,
    attackType: AttackType.Normal,
    armorType: ArmorType.Medium,
    armorValue: 4,
    moveSpeed: 4.0,
    sightRange: 7,
    buildTime: 30,
    displayChar: 'C',
    canGatherResources: false,
  },
  [UnitType.SiegeRam]: {
    unitType: UnitType.SiegeRam,
    maxHealth: 200,
    attackDamage: 40,
    attackRange: 1,
    attackSpeed: 0.3,
    attackType: AttackType.Siege,
    armorType: ArmorType.Heavy,
    armorValue: 8,
    moveSpeed: 1.0,
    sightRange: 4,
    buildTime: 45,
    displayChar: 'R',
    canGatherResources: false,
  },
  [UnitType.Catapult]: {
    unitType: UnitType.Catapult,
    maxHealth: 80,
    attackDamage: 35,
    attackRange: 10,
    attackSpeed: 0.25,
    attackType: AttackType.Siege,
    armorType: ArmorType.Unarmored,
    armorValue: 0,
    moveSpeed: 1.0,
    sightRange: 10,
    buildTime: 50,
    displayChar: 'K',
    canGatherResources: false,
  },
  [UnitType.Scout]: {
    unitType: UnitType.Scout,
    maxHealth: 50,
    attackDamage: 6,
    attackRange: 1,
    attackSpeed: 1.5,
    attackType: AttackType.Normal,
    armorType: ArmorType.Light,
    armorValue: 1,
    moveSpeed: 5.0,
    sightRange: 10,
    buildTime: 15,
    displayChar: 'S',
    canGatherResources: false,
  },
  [UnitType.Healer]: {
    unitType: UnitType.Healer,
    maxHealth: 45,
    attackDamage: 0,
    attackRange: 4,
    attackSpeed: 0.8,
    attackType: AttackType.Magic,
    armorType: ArmorType.Unarmored,
    armorValue: 0,
    moveSpeed: 2.0,
    sightRange: 6,
    buildTime: 25,
    displayChar: 'H',
    canGatherResources: false,
  },
};
