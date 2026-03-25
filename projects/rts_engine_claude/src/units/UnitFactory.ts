/**
 * Factory for creating unit entities with the correct components
 * based on their UnitType stats.
 */

import { Entity } from '../core/Entity';
import { Component } from '../core/Component';
import { UnitType, UNIT_STATS } from './UnitType';
import {
  createPositionData,
  createHealthData,
  createMovementData,
  createCombatData,
  createUnitIdentityData,
  createSelectionData,
  createGatheringData,
} from './UnitComponents';
import { Vector2 } from '../math/Vector2';

/**
 * Create a fully-configured unit entity from a UnitType.
 * Attaches all standard components with stats from the template.
 */
export function createUnit(
  unitType: UnitType,
  playerId: number,
  position: Vector2,
): Entity {
  const stats = UNIT_STATS[unitType];
  const entity = new Entity();

  entity.addTag('unit');
  entity.addTag(`player_${playerId}`);

  entity.addComponent(new Component(createPositionData(position.x, position.y)));
  entity.addComponent(new Component(createHealthData(stats.maxHealth)));
  entity.addComponent(new Component(createMovementData(stats.moveSpeed)));
  entity.addComponent(new Component(
    createCombatData(
      stats.attackDamage,
      stats.attackRange,
      stats.attackSpeed,
      stats.attackType,
      stats.armorType,
      stats.armorValue,
    )
  ));
  entity.addComponent(new Component(
    createUnitIdentityData(unitType, playerId, stats.displayChar, stats.sightRange)
  ));
  entity.addComponent(new Component(createSelectionData()));

  if (stats.canGatherResources) {
    entity.addComponent(new Component(createGatheringData()));
  }

  return entity;
}
