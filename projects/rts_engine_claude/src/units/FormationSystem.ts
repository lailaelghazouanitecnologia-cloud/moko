/**
 * Formation system: arranges groups of selected units into formations
 * when given a group move command.
 *
 * Supported formations:
 * - Line: units spread horizontally facing the movement direction
 * - Box: units arranged in a square grid
 * - Wedge: V-shaped formation with leader at the front
 */

import { Vector2 } from '../math/Vector2';

export enum FormationType {
  Line = 'Line',
  Box = 'Box',
  Wedge = 'Wedge',
}

/** Spacing between units in a formation (in tiles) */
const FORMATION_SPACING = 1.5;

/**
 * Compute formation offsets for a group of units.
 * Returns positions relative to the group center.
 *
 * @param count - Number of units in the group
 * @param formation - Desired formation type
 * @param facing - Direction the formation faces (radians)
 * @returns Array of offset vectors, one per unit
 */
export function computeFormationOffsets(
  count: number,
  formation: FormationType,
  facing: number = 0,
): Vector2[] {
  if (count <= 0) return [];
  if (count === 1) return [Vector2.ZERO];

  let offsets: Vector2[];

  switch (formation) {
    case FormationType.Line:
      offsets = computeLineFormation(count);
      break;
    case FormationType.Box:
      offsets = computeBoxFormation(count);
      break;
    case FormationType.Wedge:
      offsets = computeWedgeFormation(count);
      break;
  }

  // Rotate all offsets by the facing angle
  if (facing !== 0) {
    const cos = Math.cos(facing);
    const sin = Math.sin(facing);
    offsets = offsets.map((v) =>
      new Vector2(v.x * cos - v.y * sin, v.x * sin + v.y * cos)
    );
  }

  return offsets;
}

function computeLineFormation(count: number): Vector2[] {
  const offsets: Vector2[] = [];
  const half = (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    offsets.push(new Vector2((i - half) * FORMATION_SPACING, 0));
  }
  return offsets;
}

function computeBoxFormation(count: number): Vector2[] {
  const offsets: Vector2[] = [];
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const halfCols = (cols - 1) / 2;
  const halfRows = (rows - 1) / 2;

  let placed = 0;
  for (let r = 0; r < rows && placed < count; r++) {
    for (let c = 0; c < cols && placed < count; c++) {
      offsets.push(new Vector2(
        (c - halfCols) * FORMATION_SPACING,
        (r - halfRows) * FORMATION_SPACING,
      ));
      placed++;
    }
  }
  return offsets;
}

function computeWedgeFormation(count: number): Vector2[] {
  const offsets: Vector2[] = [];
  // Leader at front
  offsets.push(Vector2.ZERO);

  let placed = 1;
  let row = 1;
  while (placed < count) {
    // Each row has 2 units (one on each side), expanding outward
    const yOffset = row * FORMATION_SPACING;
    const xOffset = row * FORMATION_SPACING * 0.7;

    if (placed < count) {
      offsets.push(new Vector2(-xOffset, yOffset));
      placed++;
    }
    if (placed < count) {
      offsets.push(new Vector2(xOffset, yOffset));
      placed++;
    }
    row++;
  }
  return offsets;
}

/**
 * Given a set of unit positions and a target center + formation,
 * compute the final destination for each unit.
 */
export function computeFormationTargets(
  center: Vector2,
  count: number,
  formation: FormationType,
  facingAngle: number,
): Vector2[] {
  const offsets = computeFormationOffsets(count, formation, facingAngle);
  return offsets.map((offset) => center.add(offset).round());
}
