/**
 * Building type definitions, stats, and production capabilities.
 */

import { UnitType } from '../units/UnitType';
import { ResourceCost, createCost } from '../resources/ResourceType';
import { ArmorType } from '../units/UnitType';

export enum BuildingType {
  TownCenter = 'TownCenter',
  Barracks = 'Barracks',
  ArcheryRange = 'ArcheryRange',
  Stable = 'Stable',
  SiegeWorkshop = 'SiegeWorkshop',
  Farm = 'Farm',
  LumberMill = 'LumberMill',
  Quarry = 'Quarry',
  Tower = 'Tower',
  Wall = 'Wall',
}

export interface BuildingStats {
  readonly buildingType: BuildingType;
  readonly maxHealth: number;
  readonly armorType: ArmorType;
  readonly armorValue: number;
  readonly buildTime: number;          // seconds to construct
  readonly cost: ResourceCost;
  readonly sightRange: number;
  /** Unit types this building can produce (empty = non-production building) */
  readonly produces: readonly UnitType[];
  /** Whether workers can drop off resources here */
  readonly isDropOff: boolean;
  /** Size of the building footprint in tiles (width x height) */
  readonly size: { readonly w: number; readonly h: number };
  /** Attack damage (for towers), 0 = no attack */
  readonly attackDamage: number;
  readonly attackRange: number;
  readonly displayChar: string;
}

export const BUILDING_STATS: Readonly<Record<BuildingType, BuildingStats>> = {
  [BuildingType.TownCenter]: {
    buildingType: BuildingType.TownCenter,
    maxHealth: 500,
    armorType: ArmorType.Fortified,
    armorValue: 5,
    buildTime: 60,
    cost: createCost(400, 200, 100),
    sightRange: 8,
    produces: [UnitType.Worker],
    isDropOff: true,
    size: { w: 3, h: 3 },
    attackDamage: 0,
    attackRange: 0,
    displayChar: 'H',
  },
  [BuildingType.Barracks]: {
    buildingType: BuildingType.Barracks,
    maxHealth: 350,
    armorType: ArmorType.Fortified,
    armorValue: 3,
    buildTime: 40,
    cost: createCost(200, 150),
    sightRange: 6,
    produces: [UnitType.Infantry],
    isDropOff: false,
    size: { w: 2, h: 2 },
    attackDamage: 0,
    attackRange: 0,
    displayChar: 'B',
  },
  [BuildingType.ArcheryRange]: {
    buildingType: BuildingType.ArcheryRange,
    maxHealth: 300,
    armorType: ArmorType.Fortified,
    armorValue: 2,
    buildTime: 40,
    cost: createCost(200, 200),
    sightRange: 6,
    produces: [UnitType.Archer],
    isDropOff: false,
    size: { w: 2, h: 2 },
    attackDamage: 0,
    attackRange: 0,
    displayChar: 'R',
  },
  [BuildingType.Stable]: {
    buildingType: BuildingType.Stable,
    maxHealth: 350,
    armorType: ArmorType.Fortified,
    armorValue: 3,
    buildTime: 45,
    cost: createCost(250, 200),
    sightRange: 6,
    produces: [UnitType.Cavalry, UnitType.Scout],
    isDropOff: false,
    size: { w: 2, h: 2 },
    attackDamage: 0,
    attackRange: 0,
    displayChar: 'S',
  },
  [BuildingType.SiegeWorkshop]: {
    buildingType: BuildingType.SiegeWorkshop,
    maxHealth: 400,
    armorType: ArmorType.Fortified,
    armorValue: 4,
    buildTime: 50,
    cost: createCost(300, 200, 100),
    sightRange: 6,
    produces: [UnitType.SiegeRam, UnitType.Catapult],
    isDropOff: false,
    size: { w: 2, h: 2 },
    attackDamage: 0,
    attackRange: 0,
    displayChar: 'W',
  },
  [BuildingType.Farm]: {
    buildingType: BuildingType.Farm,
    maxHealth: 100,
    armorType: ArmorType.Unarmored,
    armorValue: 0,
    buildTime: 20,
    cost: createCost(50, 100),
    sightRange: 3,
    produces: [],
    isDropOff: false,
    size: { w: 2, h: 2 },
    attackDamage: 0,
    attackRange: 0,
    displayChar: 'F',
  },
  [BuildingType.LumberMill]: {
    buildingType: BuildingType.LumberMill,
    maxHealth: 200,
    armorType: ArmorType.Fortified,
    armorValue: 2,
    buildTime: 30,
    cost: createCost(100, 50),
    sightRange: 5,
    produces: [],
    isDropOff: true,
    size: { w: 2, h: 2 },
    attackDamage: 0,
    attackRange: 0,
    displayChar: 'L',
  },
  [BuildingType.Quarry]: {
    buildingType: BuildingType.Quarry,
    maxHealth: 200,
    armorType: ArmorType.Fortified,
    armorValue: 2,
    buildTime: 30,
    cost: createCost(100, 0, 50),
    sightRange: 5,
    produces: [],
    isDropOff: true,
    size: { w: 2, h: 2 },
    attackDamage: 0,
    attackRange: 0,
    displayChar: 'Q',
  },
  [BuildingType.Tower]: {
    buildingType: BuildingType.Tower,
    maxHealth: 250,
    armorType: ArmorType.Fortified,
    armorValue: 5,
    buildTime: 35,
    cost: createCost(150, 100, 50),
    sightRange: 10,
    produces: [],
    isDropOff: false,
    size: { w: 1, h: 1 },
    attackDamage: 15,
    attackRange: 8,
    displayChar: 'O',
  },
  [BuildingType.Wall]: {
    buildingType: BuildingType.Wall,
    maxHealth: 300,
    armorType: ArmorType.Fortified,
    armorValue: 8,
    buildTime: 10,
    cost: createCost(0, 0, 20),
    sightRange: 2,
    produces: [],
    isDropOff: false,
    size: { w: 1, h: 1 },
    attackDamage: 0,
    attackRange: 0,
    displayChar: '#',
  },
};

/** Unit training costs (per unit type) */
export const UNIT_TRAINING_COSTS: Readonly<Record<UnitType, ResourceCost>> = {
  [UnitType.Worker]: createCost(50, 0, 0, 50),
  [UnitType.Infantry]: createCost(100, 0, 0, 50),
  [UnitType.Archer]: createCost(100, 50, 0, 25),
  [UnitType.Cavalry]: createCost(150, 0, 0, 75),
  [UnitType.SiegeRam]: createCost(200, 200, 100),
  [UnitType.Catapult]: createCost(250, 150, 150),
  [UnitType.Scout]: createCost(75, 0, 0, 25),
  [UnitType.Healer]: createCost(150, 0, 0, 50),
};
