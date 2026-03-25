/**
 * RTSGame: the top-level game class that wires everything together.
 *
 * Responsible for:
 * - Initializing and managing all subsystems
 * - Coordinating the game loop
 * - Player management
 * - Win condition checking
 * - Game state serialization
 */

import { World } from '../core/World';
import { EventBus, GameEventType } from '../core/EventBus';
import { GameLoop, GameLoopCallbacks } from '../core/GameLoop';
import { Timer } from '../core/Timer';
import { TileMap } from '../terrain/TileMap';
import { FogOfWar } from '../terrain/FogOfWar';
import {
  generateTerrain,
  TerrainGenConfig,
  GenerationResult,
} from '../terrain/TerrainGenerator';
import { ResourceManager } from '../resources/ResourceManager';
import { ResourceType } from '../resources/ResourceType';
import { MovementSystem } from '../units/MovementSystem';
import { HealthSystem } from '../units/HealthSystem';
import { SelectionManager } from '../units/SelectionManager';
import { CombatSystem } from '../combat/CombatSystem';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import { GatheringSystem } from '../resources/GatheringSystem';
import { ConstructionSystem } from '../buildings/ConstructionSystem';
import { ProductionSystem } from '../buildings/ProductionSystem';
import { ConsoleRenderer } from '../renderer/ConsoleRenderer';
import { AIController, AIDifficulty } from '../ai/AIController';
import { Player, PlayerType } from './Player';
import {
  WinConditionCheck,
  checkElimination,
} from './WinCondition';
import {
  serializeGameState,
  gameStateToJson,
  SerializedGameState,
} from './GameState';
import { Vector2 } from '../math/Vector2';
import { UnitType } from '../units/UnitType';
import { BuildingType } from '../buildings/BuildingType';
import { createUnit } from '../units/UnitFactory';
import { createBuilding } from '../buildings/BuildingFactory';
import { Component } from '../core/Component';
import { createResourceNodeData } from '../resources/ResourceNodeComponent';
import { createPositionData } from '../units/UnitComponents';
import { PositionData, UnitIdentityData } from '../units/UnitComponents';

/** Configuration for creating a new game */
export interface GameConfig {
  readonly terrainConfig?: Partial<TerrainGenConfig>;
  readonly ticksPerSecond?: number;
  readonly winCondition?: WinConditionCheck;
  readonly enableFogOfWar?: boolean;
  readonly enableRendering?: boolean;
}

const DEFAULT_GAME_CONFIG: Required<GameConfig> = {
  terrainConfig: {},
  ticksPerSecond: 10,
  winCondition: checkElimination,
  enableFogOfWar: true,
  enableRendering: true,
};

export class RTSGame {
  // ── Core systems ──────────────────────────────────────────
  private readonly _world: World;
  private readonly _eventBus: EventBus;
  private readonly _timer: Timer;
  private readonly _gameLoop: GameLoop;

  // ── Map ───────────────────────────────────────────────────
  private readonly _tileMap: TileMap;
  private readonly _fogOfWar: FogOfWar;
  private readonly _terrainResult: GenerationResult;

  // ── Game systems ──────────────────────────────────────────
  private readonly _resourceManager: ResourceManager;
  private readonly _movementSystem: MovementSystem;
  private readonly _healthSystem: HealthSystem;
  private readonly _combatSystem: CombatSystem;
  private readonly _projectileSystem: ProjectileSystem;
  private readonly _gatheringSystem: GatheringSystem;
  private readonly _constructionSystem: ConstructionSystem;
  private readonly _productionSystem: ProductionSystem;
  private readonly _selectionManager: SelectionManager;
  private readonly _renderer: ConsoleRenderer | null;

  // ── Game state ────────────────────────────────────────────
  private readonly _players: Player[] = [];
  private readonly _aiControllers: AIController[] = [];
  private readonly _winCondition: WinConditionCheck;
  private _gameOver: boolean = false;
  private _paused: boolean = false;

  constructor(config?: GameConfig) {
    const cfg = { ...DEFAULT_GAME_CONFIG, ...config };

    // Initialize core
    this._world = new World();
    this._eventBus = new EventBus();
    this._timer = new Timer();

    // Generate terrain
    this._terrainResult = generateTerrain(cfg.terrainConfig);
    this._tileMap = this._terrainResult.tileMap;
    this._fogOfWar = new FogOfWar(this._tileMap.width, this._tileMap.height);

    // Initialize resource manager
    this._resourceManager = new ResourceManager(this._eventBus);

    // Initialize systems
    this._movementSystem = new MovementSystem(this._eventBus, this._tileMap);
    this._healthSystem = new HealthSystem(this._eventBus, this._tileMap);
    this._projectileSystem = new ProjectileSystem(this._world, this._eventBus);
    this._combatSystem = new CombatSystem(
      this._world, this._eventBus, this._tileMap,
      this._healthSystem, this._projectileSystem,
    );
    this._gatheringSystem = new GatheringSystem(
      this._world, this._eventBus, this._resourceManager,
    );
    this._constructionSystem = new ConstructionSystem(this._eventBus);
    this._productionSystem = new ProductionSystem(
      this._world, this._eventBus, this._tileMap, this._resourceManager,
    );
    this._selectionManager = new SelectionManager(this._world, this._eventBus);

    // Register systems with the world (in priority order)
    this._world.addSystem(this._movementSystem);
    this._world.addSystem(this._projectileSystem);
    this._world.addSystem(this._healthSystem);
    this._world.addSystem(this._combatSystem);
    this._world.addSystem(this._gatheringSystem);
    this._world.addSystem(this._constructionSystem);
    this._world.addSystem(this._productionSystem);

    // Initialize renderer
    this._renderer = cfg.enableRendering
      ? new ConsoleRenderer(this._world, this._tileMap, this._fogOfWar, this._resourceManager)
      : null;

    // Win condition
    this._winCondition = cfg.winCondition;

    // Setup game loop
    const callbacks: GameLoopCallbacks = {
      update: (dt) => this._update(dt),
      render: () => this._render(),
    };
    this._gameLoop = new GameLoop(callbacks, cfg.ticksPerSecond);

    // Wire up stat tracking events
    this._setupEventTracking();
  }

  // ── Public API ────────────────────────────────────────────

  /** Access the ECS world */
  get world(): World { return this._world; }
  get eventBus(): EventBus { return this._eventBus; }
  get tileMap(): TileMap { return this._tileMap; }
  get fogOfWar(): FogOfWar { return this._fogOfWar; }
  get resourceManager(): ResourceManager { return this._resourceManager; }
  get selectionManager(): SelectionManager { return this._selectionManager; }
  get movementSystem(): MovementSystem { return this._movementSystem; }
  get combatSystem(): CombatSystem { return this._combatSystem; }
  get productionSystem(): ProductionSystem { return this._productionSystem; }
  get constructionSystem(): ConstructionSystem { return this._constructionSystem; }
  get players(): readonly Player[] { return this._players; }
  get isGameOver(): boolean { return this._gameOver; }
  get isPaused(): boolean { return this._paused; }
  get currentTick(): number { return this._gameLoop.tick; }

  /**
   * Add a human player to the game.
   */
  addPlayer(name: string, teamId?: number): Player {
    const id = this._players.length;
    const player = new Player(id, name, PlayerType.Human, teamId ?? id);
    this._players.push(player);
    this._resourceManager.initPlayer(id);
    this._fogOfWar.addPlayer(id);
    return player;
  }

  /**
   * Add an AI player to the game.
   */
  addAIPlayer(name: string, difficulty: AIDifficulty = AIDifficulty.Medium, teamId?: number): Player {
    const id = this._players.length;
    const player = new Player(id, name, PlayerType.AI, teamId ?? id);
    this._players.push(player);
    this._resourceManager.initPlayer(id);
    this._fogOfWar.addPlayer(id);

    const ai = new AIController(
      this._world, this._eventBus, this._tileMap,
      this._resourceManager, this._productionSystem,
      id, difficulty,
    );
    this._aiControllers.push(ai);

    return player;
  }

  /**
   * Setup initial units and buildings for all players.
   * Uses terrain generator's spawn points.
   */
  setupStartingPositions(): void {
    const spawnPoints = this._terrainResult.spawnPoints;

    for (let i = 0; i < this._players.length; i++) {
      const player = this._players[i];
      const spawn = spawnPoints[i % spawnPoints.length] ?? new Vector2(5 + i * 15, 5);

      // Create Town Center
      const tc = createBuilding(BuildingType.TownCenter, player.id, spawn);
      // Make it pre-built
      const constComp = tc.getComponent<import('../buildings/BuildingComponents').ConstructionData>('Construction');
      if (constComp) {
        constComp.setData({ isComplete: true, buildProgress: 1, buildTimeRemaining: 0 });
      }
      this._world.addEntity(tc);

      // Mark building tiles as occupied
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          this._tileMap.setOccupant(
            Math.floor(spawn.x) + dx,
            Math.floor(spawn.y) + dy,
            tc.id,
          );
        }
      }

      // Create starting workers
      for (let w = 0; w < 3; w++) {
        const workerPos = this._tileMap.findNearestPassable(
          new Vector2(spawn.x - 1 - w, spawn.y + 3)
        );
        if (workerPos) {
          const worker = createUnit(UnitType.Worker, player.id, workerPos);
          this._world.addEntity(worker);
          this._tileMap.setOccupant(Math.floor(workerPos.x), Math.floor(workerPos.y), worker.id);

          // Set drop-off to town center
          this._gatheringSystem.setDropOffBuilding(worker.id, tc.id);
        }
      }

      // Create a starting scout
      const scoutPos = this._tileMap.findNearestPassable(
        new Vector2(spawn.x + 4, spawn.y)
      );
      if (scoutPos) {
        const scout = createUnit(UnitType.Scout, player.id, scoutPos);
        this._world.addEntity(scout);
        this._tileMap.setOccupant(Math.floor(scoutPos.x), Math.floor(scoutPos.y), scout.id);
      }
    }

    // Place resource nodes from terrain generation
    for (const cluster of this._terrainResult.resourceClusters) {
      const resourceType = cluster.type === 'gold' ? ResourceType.Gold
        : cluster.type === 'wood' ? ResourceType.Wood
        : ResourceType.Stone;

      const node = this._world.createEntity();
      node.addTag('resource');
      node.addComponent(new Component(createPositionData(cluster.position.x, cluster.position.y)));
      node.addComponent(new Component(createResourceNodeData(resourceType, cluster.amount)));
      this._tileMap.setResource(
        Math.floor(cluster.position.x),
        Math.floor(cluster.position.y),
        node.id,
      );
    }
  }

  /** Start the game loop */
  start(): void {
    this._eventBus.emit({
      type: GameEventType.GameStarted,
      playerCount: this._players.length,
    });
    this._gameLoop.start();
  }

  /** Stop the game loop */
  stop(): void {
    this._gameLoop.stop();
  }

  /** Pause the game */
  pause(): void {
    this._paused = true;
    this._gameLoop.stop();
    this._eventBus.emit({ type: GameEventType.GamePaused });
  }

  /** Resume the game */
  resume(): void {
    this._paused = false;
    this._gameLoop.start();
    this._eventBus.emit({ type: GameEventType.GameResumed });
  }

  /** Manually advance one tick (for debugging / step mode) */
  step(): void {
    this._gameLoop.stepOnce();
  }

  /** Serialize the current game state */
  serialize(): SerializedGameState {
    return serializeGameState(
      this._world, this._tileMap, this._players,
      this._resourceManager, this._gameLoop.tick,
    );
  }

  /** Export game state as JSON string */
  toJson(): string {
    return gameStateToJson(this.serialize());
  }

  // ── Internal update / render ──────────────────────────────

  private _update(deltaTime: number): void {
    if (this._gameOver) return;

    // Update timer
    this._timer.update(deltaTime);

    // Update fog of war vision
    this._updateFogOfWar();

    // Update all ECS systems
    this._world.update(deltaTime);

    // Process deaths
    this._healthSystem.processDeath(this._world);

    // Update AI controllers
    for (const ai of this._aiControllers) {
      const player = this._players.find((p) => p.id === ai.playerId);
      if (player && player.isActive) {
        ai.update(deltaTime);
      }
    }

    // Check win condition
    const result = this._winCondition(this._world, this._players);
    if (result.gameOver) {
      this._gameOver = true;
      this._eventBus.emit({
        type: GameEventType.GameEnded,
        winnerId: result.winnerId,
        reason: result.reason,
      });
      this._gameLoop.stop();
    }
  }

  private _render(): void {
    if (this._renderer) {
      this._renderer.renderToConsole(this._gameLoop.tick);
    }
  }

  /** Update fog of war for all players based on unit positions */
  private _updateFogOfWar(): void {
    for (const player of this._players) {
      if (!player.isActive) continue;

      this._fogOfWar.beginUpdate(player.id);

      // Reveal around units
      const units = this._world.getEntitiesByTag(`player_${player.id}`);
      for (const unit of units) {
        const pos = unit.getComponent<PositionData>('Position');
        const identity = unit.getComponent<UnitIdentityData>('UnitIdentity');
        if (pos && identity) {
          this._fogOfWar.revealArea(
            player.id,
            Math.floor(pos.data.x),
            Math.floor(pos.data.y),
            identity.data.sightRange,
          );
        }

        // Also check BuildingIdentity for buildings
        const bIdentity = unit.getComponent<import('../buildings/BuildingComponents').BuildingIdentityData>('BuildingIdentity');
        if (pos && bIdentity) {
          this._fogOfWar.revealArea(
            player.id,
            Math.floor(pos.data.x),
            Math.floor(pos.data.y),
            bIdentity.data.sightRange,
          );
        }
      }

      this._fogOfWar.endUpdate(player.id);
    }
  }

  /** Wire up events for stat tracking */
  private _setupEventTracking(): void {
    this._eventBus.on(GameEventType.UnitTrained, (e) => {
      const player = this._players.find((p) => p.id === e.playerId);
      if (player) player.incrementStat('unitsProduced');
    });

    this._eventBus.on(GameEventType.UnitDied, (e) => {
      // Find which player owned the dead unit
      const entity = this._world.getEntity(e.entityId);
      if (entity) {
        const identity = entity.getComponent<UnitIdentityData>('UnitIdentity');
        if (identity) {
          const owner = this._players.find((p) => p.id === identity.data.playerId);
          if (owner) owner.incrementStat('unitsLost');
        }
      }

      // Credit the killer
      if (e.killerId !== null) {
        const killer = this._world.getEntity(e.killerId);
        if (killer) {
          const killerIdentity = killer.getComponent<UnitIdentityData>('UnitIdentity');
          if (killerIdentity) {
            const killerOwner = this._players.find((p) => p.id === killerIdentity.data.playerId);
            if (killerOwner) killerOwner.incrementStat('unitsKilled');
          }
        }
      }
    });

    this._eventBus.on(GameEventType.BuildingCompleted, (e) => {
      const player = this._players.find((p) => p.id === e.playerId);
      if (player) player.incrementStat('buildingsConstructed');
    });

    this._eventBus.on(GameEventType.ResourceGathered, (e) => {
      const player = this._players.find((p) => p.id === e.playerId);
      if (player) player.incrementStat('resourcesGathered', e.amount);
    });

    this._eventBus.on(GameEventType.ResourceSpent, (e) => {
      const player = this._players.find((p) => p.id === e.playerId);
      if (player) player.incrementStat('resourcesSpent', e.amount);
    });
  }
}
