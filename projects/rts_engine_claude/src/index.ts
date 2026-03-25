/**
 * RTS Game Engine
 *
 * A complete real-time strategy game engine built with TypeScript
 * using Entity-Component-System (ECS) architecture.
 *
 * Quick start:
 * ```typescript
 * import { RTSGame, AIDifficulty } from 'rts-engine';
 *
 * const game = new RTSGame({ enableRendering: true });
 * game.addPlayer('Human');
 * game.addAIPlayer('Computer', AIDifficulty.Medium);
 * game.setupStartingPositions();
 * game.start();
 * ```
 */

// Core ECS
export {
  Component, ComponentData, ComponentId,
  Entity,
  System,
  EventBus, GameEventType, GameEvent, EventOfType,
  GameLoop, GameLoopCallbacks,
  Timer,
  World,
} from './core';

// Math
export { Vector2, Rectangle, Grid, findPath, PathResult, CostFunction } from './math';

// Terrain
export {
  TerrainType, TerrainProperties, TERRAIN_PROPERTIES,
  TileMap, TileData,
  FogOfWar, Visibility,
  generateTerrain, TerrainGenConfig, DEFAULT_TERRAIN_CONFIG,
  GenerationResult, ResourceCluster,
} from './terrain';

// Units
export {
  UnitType, ArmorType, AttackType, UnitStats, UNIT_STATS,
  PositionData, createPositionData,
  HealthData, createHealthData,
  MovementData, createMovementData,
  CombatData, createCombatData,
  UnitIdentityData, createUnitIdentityData,
  SelectionData, createSelectionData,
  GatheringData, createGatheringData,
  createUnit,
  MovementSystem,
  FormationType, computeFormationOffsets, computeFormationTargets,
  SelectionManager,
  HealthSystem,
} from './units';

// Combat
export {
  calculateDamage, getDamageMultiplier, DamageResult,
  ProjectileSystem, ProjectileData, createProjectileData,
  CombatSystem,
} from './combat';

// Resources
export {
  ResourceType, ResourceCost, createCost, STARTING_RESOURCES,
  ResourceManager, ResourceSnapshot,
  ResourceNodeData, createResourceNodeData,
  GatheringSystem,
} from './resources';

// Buildings
export {
  BuildingType, BuildingStats, BUILDING_STATS, UNIT_TRAINING_COSTS,
  BuildingIdentityData, createBuildingIdentityData,
  ConstructionData, createConstructionData,
  ProductionQueueData, createProductionQueueData, QueueEntry,
  UpgradeData, createUpgradeData,
  createBuilding,
  ConstructionSystem,
  ProductionSystem,
} from './buildings';

// AI
export {
  BTNode, BTStatus, BTContext,
  SelectorNode, SequenceNode, ConditionNode, ActionNode,
  InverterNode, RepeaterNode,
  ThreatAssessment, ThreatInfo,
  AIController, AIDifficulty,
} from './ai';

// Renderer
export { ConsoleRenderer, RenderConfig, DEFAULT_RENDER_CONFIG } from './renderer';

// Engine
export {
  RTSGame, GameConfig,
  Player, PlayerStatus, PlayerType, PlayerStats,
  WinConditionCheck, WinConditionResult,
  checkElimination, checkTownCenterDestruction,
  SerializedGameState, SerializedEntity, SerializedComponent,
  serializeGameState, gameStateToJson, gameStateFromJson,
} from './engine';
