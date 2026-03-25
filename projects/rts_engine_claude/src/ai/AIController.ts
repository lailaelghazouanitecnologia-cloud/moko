/**
 * AI Controller: drives computer-controlled players using behavior trees
 * and strategic resource allocation.
 *
 * Strategy phases:
 * 1. Early game: build workers, gather resources, establish economy
 * 2. Mid game: build military buildings, train army, scout
 * 3. Late game: push with superior army, target enemy bases
 *
 * The AI evaluates its behavior tree each tick to decide on actions.
 */

import { World } from '../core/World';
import { EventBus } from '../core/EventBus';
import { ResourceManager } from '../resources/ResourceManager';
import { TileMap } from '../terrain/TileMap';
import { ResourceType } from '../resources/ResourceType';
import { UnitType } from '../units/UnitType';
import { UnitIdentityData } from '../units/UnitComponents';
import { BuildingType } from '../buildings/BuildingType';
import { BuildingIdentityData, ConstructionData, ProductionQueueData } from '../buildings/BuildingComponents';
import { ProductionSystem } from '../buildings/ProductionSystem';
import { ThreatAssessment } from './ThreatAssessment';
import {
  BTNode,
  BTContext,
  BTStatus,
  SelectorNode,
  SequenceNode,
  ConditionNode,
  ActionNode,
} from './BehaviorTree';

/** AI difficulty settings */
export enum AIDifficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

/** Strategic priority weights */
interface StrategyWeights {
  economyWeight: number;
  militaryWeight: number;
  defenseWeight: number;
}

const DIFFICULTY_WEIGHTS: Record<AIDifficulty, StrategyWeights> = {
  [AIDifficulty.Easy]: { economyWeight: 0.6, militaryWeight: 0.3, defenseWeight: 0.1 },
  [AIDifficulty.Medium]: { economyWeight: 0.4, militaryWeight: 0.4, defenseWeight: 0.2 },
  [AIDifficulty.Hard]: { economyWeight: 0.3, militaryWeight: 0.5, defenseWeight: 0.2 },
};

export class AIController {
  private readonly _world: World;
  private readonly _resourceManager: ResourceManager;
  private readonly _productionSystem: ProductionSystem;
  private readonly _threatAssessment: ThreatAssessment;
  private readonly _playerId: number;
  private readonly _difficulty: AIDifficulty;
  private readonly _weights: StrategyWeights;
  private readonly _behaviorTree: BTNode;
  private readonly _blackboard: Map<string, unknown> = new Map();
  private _tickAccumulator: number = 0;
  private readonly _decisionInterval: number;

  constructor(
    world: World,
    _eventBus: EventBus,
    _tileMap: TileMap,
    resourceManager: ResourceManager,
    productionSystem: ProductionSystem,
    playerId: number,
    difficulty: AIDifficulty = AIDifficulty.Medium,
  ) {
    this._world = world;
    this._resourceManager = resourceManager;
    this._productionSystem = productionSystem;
    this._threatAssessment = new ThreatAssessment(world);
    this._playerId = playerId;
    this._difficulty = difficulty;
    this._weights = DIFFICULTY_WEIGHTS[difficulty];
    this._behaviorTree = this._buildBehaviorTree();

    // Higher difficulty = faster decisions
    this._decisionInterval = difficulty === AIDifficulty.Hard ? 1.0
      : difficulty === AIDifficulty.Medium ? 2.0
      : 3.0;
  }

  get playerId(): number {
    return this._playerId;
  }

  /** Update the AI — called each game tick */
  update(deltaTime: number): void {
    this._tickAccumulator += deltaTime;

    if (this._tickAccumulator >= this._decisionInterval) {
      this._tickAccumulator = 0;

      const context: BTContext = {
        playerId: this._playerId,
        deltaTime: this._decisionInterval,
        blackboard: this._blackboard,
      };

      this._behaviorTree.tick(context);
    }
  }

  /** Build the AI behavior tree */
  private _buildBehaviorTree(): BTNode {
    return new SelectorNode('Root', [
      // Priority 1: Respond to base threats
      new SequenceNode('DefendBase', [
        new ConditionNode('IsBaseUnderAttack', (ctx) => this._isBaseUnderAttack(ctx)),
        new ActionNode('DefendBase', (ctx) => this._defendBase(ctx)),
      ]),

      // Priority 2: Economic development
      new SequenceNode('Economy', [
        new ConditionNode('NeedsWorkers', (ctx) => this._needsWorkers(ctx)),
        new ActionNode('TrainWorkers', (ctx) => this._trainWorkers(ctx)),
      ]),

      // Priority 3: Build military
      new SequenceNode('BuildMilitary', [
        new ConditionNode('CanBuildArmy', (_ctx) => this._canBuildArmy()),
        new ActionNode('TrainArmy', (_ctx) => this._trainArmy()),
      ]),

      // Priority 4: Attack if strong enough
      new SequenceNode('Attack', [
        new ConditionNode('ShouldAttack', (_ctx) => this._shouldAttack()),
        new ActionNode('LaunchAttack', (_ctx) => this._launchAttack()),
      ]),
    ]);
  }

  private _isBaseUnderAttack(_ctx: BTContext): boolean {
    const threat = this._threatAssessment.findMostThreatenedBase(this._playerId);
    if (threat && threat.threat.unitCount > 0) {
      this._blackboard.set('threatPosition', threat.position);
      return true;
    }
    return false;
  }

  private _defendBase(_ctx: BTContext): BTStatus {
    // Placeholder: rally army to threat position
    const _pos = this._blackboard.get('threatPosition');
    void _pos; // Future: command units to this position
    // In a full implementation, this would command units to move to defend
    return BTStatus.Success;
  }

  private _needsWorkers(_ctx: BTContext): boolean {
    const workers = this._world.getEntitiesByTag(`player_${this._playerId}`).filter((e) => {
      const id = e.getComponent<UnitIdentityData>('UnitIdentity');
      return id && id.data.unitType === UnitType.Worker;
    });
    return workers.length < 8 * this._weights.economyWeight;
  }

  private _trainWorkers(_ctx: BTContext): BTStatus {
    const townCenters = this._findBuildings(BuildingType.TownCenter);
    for (const tc of townCenters) {
      const queue = tc.getComponent<ProductionQueueData>('ProductionQueue');
      if (queue && queue.data.queue.length < 2) {
        if (this._productionSystem.queueUnit(tc.id, UnitType.Worker)) {
          return BTStatus.Success;
        }
      }
    }
    return BTStatus.Failure;
  }

  private _canBuildArmy(): boolean {
    const gold = this._resourceManager.getAmount(this._playerId, ResourceType.Gold);
    const food = this._resourceManager.getAmount(this._playerId, ResourceType.Food);
    return gold >= 100 && food >= 50;
  }

  private _trainArmy(): BTStatus {
    // Prioritize units based on difficulty and strategy
    const barracks = this._findBuildings(BuildingType.Barracks);
    const archeryRanges = this._findBuildings(BuildingType.ArcheryRange);

    // Train infantry from barracks
    for (const b of barracks) {
      const queue = b.getComponent<ProductionQueueData>('ProductionQueue');
      const constr = b.getComponent<ConstructionData>('Construction');
      if (queue && constr?.data.isComplete && queue.data.queue.length < 3) {
        if (this._productionSystem.queueUnit(b.id, UnitType.Infantry)) {
          return BTStatus.Success;
        }
      }
    }

    // Train archers from archery ranges
    for (const r of archeryRanges) {
      const queue = r.getComponent<ProductionQueueData>('ProductionQueue');
      const constr = r.getComponent<ConstructionData>('Construction');
      if (queue && constr?.data.isComplete && queue.data.queue.length < 3) {
        if (this._productionSystem.queueUnit(r.id, UnitType.Archer)) {
          return BTStatus.Success;
        }
      }
    }

    return BTStatus.Failure;
  }

  private _shouldAttack(): boolean {
    // Find any enemy player
    const allUnits = this._world.getEntitiesByTag('unit');
    let enemyPlayerId: number | null = null;

    for (const unit of allUnits) {
      const identity = unit.getComponent<UnitIdentityData>('UnitIdentity');
      if (identity && identity.data.playerId !== this._playerId) {
        enemyPlayerId = identity.data.playerId;
        break;
      }
    }

    if (enemyPlayerId === null) return false;
    this._blackboard.set('enemyPlayerId', enemyPlayerId);

    const threshold = this._difficulty === AIDifficulty.Hard ? 1.1 : 1.5;
    return this._threatAssessment.shouldAttack(this._playerId, enemyPlayerId, threshold);
  }

  private _launchAttack(): BTStatus {
    // Placeholder: command army units toward enemy base
    // In a full implementation, this would pathfind army to enemy structures
    return BTStatus.Success;
  }

  /** Find all buildings of a specific type owned by this AI */
  private _findBuildings(buildingType: BuildingType): import('../core/Entity').Entity[] {
    return this._world.getEntitiesByTag('building').filter((b) => {
      const identity = b.getComponent<BuildingIdentityData>('BuildingIdentity');
      return identity &&
        identity.data.playerId === this._playerId &&
        identity.data.buildingType === buildingType;
    });
  }
}
