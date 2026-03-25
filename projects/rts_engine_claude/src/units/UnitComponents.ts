/**
 * Component data types for units.
 * Each component is a plain data bag — all logic lives in systems.
 */

import { ComponentData } from '../core/Component';
import { Vector2 } from '../math/Vector2';
import { UnitType, ArmorType, AttackType } from './UnitType';

// ── Position Component ────────────────────────────────────────────

export interface PositionData extends ComponentData {
  readonly type: 'Position';
  x: number;
  y: number;
}

export function createPositionData(x: number, y: number): PositionData {
  return { type: 'Position', x, y };
}

// ── Health Component ──────────────────────────────────────────────

export interface HealthData extends ComponentData {
  readonly type: 'Health';
  current: number;
  max: number;
  regenRate: number; // HP per second
}

export function createHealthData(max: number, regenRate: number = 0): HealthData {
  return { type: 'Health', current: max, max, regenRate };
}

// ── Movement Component ────────────────────────────────────────────

export interface MovementData extends ComponentData {
  readonly type: 'Movement';
  speed: number;            // tiles per second
  path: Vector2[];          // current waypoints
  pathIndex: number;        // current waypoint index
  moveProgress: number;     // 0-1 interpolation between waypoints
  isMoving: boolean;
}

export function createMovementData(speed: number): MovementData {
  return { type: 'Movement', speed, path: [], pathIndex: 0, moveProgress: 0, isMoving: false };
}

// ── Combat Component ──────────────────────────────────────────────

export interface CombatData extends ComponentData {
  readonly type: 'Combat';
  attackDamage: number;
  attackRange: number;
  attackSpeed: number;
  attackType: AttackType;
  armorType: ArmorType;
  armorValue: number;
  attackCooldown: number;  // seconds until next attack
  targetId: number | null; // entity id of current target
}

export function createCombatData(
  damage: number,
  range: number,
  speed: number,
  attackType: AttackType,
  armorType: ArmorType,
  armorValue: number,
): CombatData {
  return {
    type: 'Combat',
    attackDamage: damage,
    attackRange: range,
    attackSpeed: speed,
    attackType,
    armorType,
    armorValue,
    attackCooldown: 0,
    targetId: null,
  };
}

// ── Unit Identity Component ───────────────────────────────────────

export interface UnitIdentityData extends ComponentData {
  readonly type: 'UnitIdentity';
  unitType: UnitType;
  playerId: number;
  displayChar: string;
  sightRange: number;
}

export function createUnitIdentityData(
  unitType: UnitType,
  playerId: number,
  displayChar: string,
  sightRange: number,
): UnitIdentityData {
  return { type: 'UnitIdentity', unitType, playerId, displayChar, sightRange };
}

// ── Selection Component ───────────────────────────────────────────

export interface SelectionData extends ComponentData {
  readonly type: 'Selection';
  selected: boolean;
  selectable: boolean;
  groupId: number | null; // control group (1-9)
}

export function createSelectionData(): SelectionData {
  return { type: 'Selection', selected: false, selectable: true, groupId: null };
}

// ── Gathering Component (workers) ─────────────────────────────────

export interface GatheringData extends ComponentData {
  readonly type: 'Gathering';
  canGather: boolean;
  gatherRate: number;       // resources per second
  carryCapacity: number;
  currentCarry: number;
  carryingType: string | null;
  targetResourceId: number | null;
  dropOffBuildingId: number | null;
}

export function createGatheringData(rate: number = 5, capacity: number = 10): GatheringData {
  return {
    type: 'Gathering',
    canGather: true,
    gatherRate: rate,
    carryCapacity: capacity,
    currentCarry: 0,
    carryingType: null,
    targetResourceId: null,
    dropOffBuildingId: null,
  };
}
