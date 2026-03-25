/**
 * Component data types for buildings.
 */

import { ComponentData } from '../core/Component';
import { BuildingType } from './BuildingType';
import { UnitType } from '../units/UnitType';

// ── Building Identity Component ───────────────────────────────────

export interface BuildingIdentityData extends ComponentData {
  readonly type: 'BuildingIdentity';
  buildingType: BuildingType;
  playerId: number;
  displayChar: string;
  sightRange: number;
  isDropOff: boolean;
  size: { w: number; h: number };
}

export function createBuildingIdentityData(
  buildingType: BuildingType,
  playerId: number,
  displayChar: string,
  sightRange: number,
  isDropOff: boolean,
  size: { w: number; h: number },
): BuildingIdentityData {
  return {
    type: 'BuildingIdentity',
    buildingType,
    playerId,
    displayChar,
    sightRange,
    isDropOff,
    size,
  };
}

// ── Construction Component ────────────────────────────────────────

export interface ConstructionData extends ComponentData {
  readonly type: 'Construction';
  buildProgress: number;     // 0 to 1
  buildTimeTotal: number;    // total seconds needed
  buildTimeRemaining: number;
  isComplete: boolean;
  builderId: number | null;  // worker entity id constructing this
}

export function createConstructionData(buildTime: number): ConstructionData {
  return {
    type: 'Construction',
    buildProgress: 0,
    buildTimeTotal: buildTime,
    buildTimeRemaining: buildTime,
    isComplete: false,
    builderId: null,
  };
}

// ── Production Queue Component ────────────────────────────────────

export interface QueueEntry {
  unitType: UnitType;
  timeRemaining: number;
  totalTime: number;
}

export interface ProductionQueueData extends ComponentData {
  readonly type: 'ProductionQueue';
  queue: QueueEntry[];
  maxQueueSize: number;
  producibleUnits: UnitType[];
  rallyPoint: { x: number; y: number } | null;
}

export function createProductionQueueData(
  producibleUnits: readonly UnitType[],
  maxQueueSize: number = 5,
): ProductionQueueData {
  return {
    type: 'ProductionQueue',
    queue: [],
    maxQueueSize,
    producibleUnits: [...producibleUnits],
    rallyPoint: null,
  };
}

// ── Upgrade Component ─────────────────────────────────────────────

export interface UpgradeData extends ComponentData {
  readonly type: 'Upgrade';
  availableUpgrades: string[];
  completedUpgrades: string[];
  currentUpgrade: string | null;
  upgradeProgress: number;
  upgradeTimeTotal: number;
}

export function createUpgradeData(availableUpgrades: string[]): UpgradeData {
  return {
    type: 'Upgrade',
    availableUpgrades,
    completedUpgrades: [],
    currentUpgrade: null,
    upgradeProgress: 0,
    upgradeTimeTotal: 0,
  };
}
