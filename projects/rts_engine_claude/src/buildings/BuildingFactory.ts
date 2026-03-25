/**
 * Factory for creating building entities with appropriate components.
 */

import { Entity } from '../core/Entity';
import { Component } from '../core/Component';
import { Vector2 } from '../math/Vector2';
import { BuildingType, BUILDING_STATS } from './BuildingType';
import {
  createBuildingIdentityData,
  createConstructionData,
  createProductionQueueData,
  createUpgradeData,
} from './BuildingComponents';
import {
  createPositionData,
  createHealthData,
  createCombatData,
} from '../units/UnitComponents';
import { AttackType } from '../units/UnitType';

/**
 * Create a building entity (starts under construction).
 */
export function createBuilding(
  buildingType: BuildingType,
  playerId: number,
  position: Vector2,
): Entity {
  const stats = BUILDING_STATS[buildingType];
  const entity = new Entity();

  entity.addTag('building');
  entity.addTag(`player_${playerId}`);

  entity.addComponent(new Component(createPositionData(position.x, position.y)));

  // Buildings start at reduced HP during construction
  entity.addComponent(new Component(createHealthData(stats.maxHealth)));

  entity.addComponent(new Component(
    createBuildingIdentityData(
      buildingType,
      playerId,
      stats.displayChar,
      stats.sightRange,
      stats.isDropOff,
      { ...stats.size },
    )
  ));

  entity.addComponent(new Component(createConstructionData(stats.buildTime)));

  // Add combat component for towers
  if (stats.attackDamage > 0) {
    entity.addComponent(new Component(
      createCombatData(
        stats.attackDamage,
        stats.attackRange,
        1.0,
        AttackType.Pierce,
        stats.armorType,
        stats.armorValue,
      )
    ));
  }

  // Add production queue if the building can produce units
  if (stats.produces.length > 0) {
    entity.addComponent(new Component(createProductionQueueData(stats.produces)));
  }

  // Add upgrade component
  entity.addComponent(new Component(createUpgradeData([])));

  return entity;
}
