/**
 * Type-safe event bus using discriminated unions.
 * All game events flow through this centralized system,
 * enabling loose coupling between modules.
 */

import { Vector2 } from '../math/Vector2';

// ── Discriminated union of all game events ────────────────────────────

export enum GameEventType {
  // Entity lifecycle
  EntityCreated = 'EntityCreated',
  EntityDestroyed = 'EntityDestroyed',

  // Unit events
  UnitMoved = 'UnitMoved',
  UnitAttacked = 'UnitAttacked',
  UnitDied = 'UnitDied',
  UnitSelected = 'UnitSelected',
  UnitDeselected = 'UnitDeselected',
  UnitTrained = 'UnitTrained',

  // Combat events
  DamageDealt = 'DamageDealt',
  ProjectileFired = 'ProjectileFired',
  ProjectileHit = 'ProjectileHit',

  // Resource events
  ResourceGathered = 'ResourceGathered',
  ResourceDepleted = 'ResourceDepleted',
  ResourceSpent = 'ResourceSpent',

  // Building events
  BuildingPlaced = 'BuildingPlaced',
  BuildingCompleted = 'BuildingCompleted',
  BuildingDestroyed = 'BuildingDestroyed',
  ProductionStarted = 'ProductionStarted',
  ProductionCompleted = 'ProductionCompleted',
  UpgradeCompleted = 'UpgradeCompleted',

  // Game state events
  GameStarted = 'GameStarted',
  GamePaused = 'GamePaused',
  GameResumed = 'GameResumed',
  GameEnded = 'GameEnded',
  TurnAdvanced = 'TurnAdvanced',

  // Fog of war
  TileRevealed = 'TileRevealed',
  TileHidden = 'TileHidden',
}

export interface EntityCreatedEvent {
  readonly type: GameEventType.EntityCreated;
  readonly entityId: number;
}

export interface EntityDestroyedEvent {
  readonly type: GameEventType.EntityDestroyed;
  readonly entityId: number;
}

export interface UnitMovedEvent {
  readonly type: GameEventType.UnitMoved;
  readonly entityId: number;
  readonly from: Vector2;
  readonly to: Vector2;
}

export interface UnitAttackedEvent {
  readonly type: GameEventType.UnitAttacked;
  readonly attackerId: number;
  readonly targetId: number;
}

export interface UnitDiedEvent {
  readonly type: GameEventType.UnitDied;
  readonly entityId: number;
  readonly killerId: number | null;
}

export interface UnitSelectedEvent {
  readonly type: GameEventType.UnitSelected;
  readonly entityIds: readonly number[];
  readonly playerId: number;
}

export interface UnitDeselectedEvent {
  readonly type: GameEventType.UnitDeselected;
  readonly playerId: number;
}

export interface UnitTrainedEvent {
  readonly type: GameEventType.UnitTrained;
  readonly entityId: number;
  readonly buildingId: number;
  readonly playerId: number;
}

export interface DamageDealtEvent {
  readonly type: GameEventType.DamageDealt;
  readonly sourceId: number;
  readonly targetId: number;
  readonly damage: number;
  readonly remainingHealth: number;
}

export interface ProjectileFiredEvent {
  readonly type: GameEventType.ProjectileFired;
  readonly projectileId: number;
  readonly sourceId: number;
  readonly targetId: number;
}

export interface ProjectileHitEvent {
  readonly type: GameEventType.ProjectileHit;
  readonly projectileId: number;
  readonly targetId: number;
  readonly damage: number;
}

export interface ResourceGatheredEvent {
  readonly type: GameEventType.ResourceGathered;
  readonly playerId: number;
  readonly resourceType: string;
  readonly amount: number;
}

export interface ResourceDepletedEvent {
  readonly type: GameEventType.ResourceDepleted;
  readonly entityId: number;
  readonly resourceType: string;
}

export interface ResourceSpentEvent {
  readonly type: GameEventType.ResourceSpent;
  readonly playerId: number;
  readonly resourceType: string;
  readonly amount: number;
}

export interface BuildingPlacedEvent {
  readonly type: GameEventType.BuildingPlaced;
  readonly entityId: number;
  readonly playerId: number;
  readonly position: Vector2;
}

export interface BuildingCompletedEvent {
  readonly type: GameEventType.BuildingCompleted;
  readonly entityId: number;
  readonly playerId: number;
}

export interface BuildingDestroyedEvent {
  readonly type: GameEventType.BuildingDestroyed;
  readonly entityId: number;
  readonly playerId: number;
}

export interface ProductionStartedEvent {
  readonly type: GameEventType.ProductionStarted;
  readonly buildingId: number;
  readonly unitType: string;
}

export interface ProductionCompletedEvent {
  readonly type: GameEventType.ProductionCompleted;
  readonly buildingId: number;
  readonly unitType: string;
  readonly entityId: number;
}

export interface UpgradeCompletedEvent {
  readonly type: GameEventType.UpgradeCompleted;
  readonly playerId: number;
  readonly upgradeId: string;
}

export interface GameStartedEvent {
  readonly type: GameEventType.GameStarted;
  readonly playerCount: number;
}

export interface GamePausedEvent {
  readonly type: GameEventType.GamePaused;
}

export interface GameResumedEvent {
  readonly type: GameEventType.GameResumed;
}

export interface GameEndedEvent {
  readonly type: GameEventType.GameEnded;
  readonly winnerId: number | null;
  readonly reason: string;
}

export interface TurnAdvancedEvent {
  readonly type: GameEventType.TurnAdvanced;
  readonly turn: number;
}

export interface TileRevealedEvent {
  readonly type: GameEventType.TileRevealed;
  readonly playerId: number;
  readonly x: number;
  readonly y: number;
}

export interface TileHiddenEvent {
  readonly type: GameEventType.TileHidden;
  readonly playerId: number;
  readonly x: number;
  readonly y: number;
}

/** Discriminated union of all game events */
export type GameEvent =
  | EntityCreatedEvent
  | EntityDestroyedEvent
  | UnitMovedEvent
  | UnitAttackedEvent
  | UnitDiedEvent
  | UnitSelectedEvent
  | UnitDeselectedEvent
  | UnitTrainedEvent
  | DamageDealtEvent
  | ProjectileFiredEvent
  | ProjectileHitEvent
  | ResourceGatheredEvent
  | ResourceDepletedEvent
  | ResourceSpentEvent
  | BuildingPlacedEvent
  | BuildingCompletedEvent
  | BuildingDestroyedEvent
  | ProductionStartedEvent
  | ProductionCompletedEvent
  | UpgradeCompletedEvent
  | GameStartedEvent
  | GamePausedEvent
  | GameResumedEvent
  | GameEndedEvent
  | TurnAdvancedEvent
  | TileRevealedEvent
  | TileHiddenEvent;

/** Extract the event type for a specific GameEventType */
export type EventOfType<T extends GameEventType> = Extract<GameEvent, { type: T }>;

/** Listener callback type — receives the specific event subtype */
type EventListener<T extends GameEventType> = (event: EventOfType<T>) => void;

/**
 * Centralized, type-safe event bus.
 * Supports subscribe, unsubscribe, and emit with full type inference.
 */
export class EventBus {
  private readonly _listeners: Map<GameEventType, Set<EventListener<GameEventType>>> = new Map();
  private readonly _eventLog: GameEvent[] = [];
  private readonly _maxLogSize: number;

  constructor(maxLogSize: number = 1000) {
    this._maxLogSize = maxLogSize;
  }

  /** Subscribe to a specific event type */
  on<T extends GameEventType>(type: T, listener: EventListener<T>): () => void {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, new Set());
    }
    const set = this._listeners.get(type)!;
    const wrappedListener = listener as unknown as EventListener<GameEventType>;
    set.add(wrappedListener);

    // Return unsubscribe function
    return () => {
      set.delete(wrappedListener);
    };
  }

  /** Emit an event to all registered listeners */
  emit<T extends GameEventType>(event: EventOfType<T>): void {
    // Log the event
    this._eventLog.push(event);
    if (this._eventLog.length > this._maxLogSize) {
      this._eventLog.shift();
    }

    const listeners = this._listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
  }

  /** Remove all listeners for a specific event type, or all listeners if no type given */
  clear(type?: GameEventType): void {
    if (type) {
      this._listeners.delete(type);
    } else {
      this._listeners.clear();
    }
  }

  /** Get recent events, optionally filtered by type */
  getRecentEvents(type?: GameEventType, count: number = 50): readonly GameEvent[] {
    const events = type
      ? this._eventLog.filter((e) => e.type === type)
      : this._eventLog;
    return events.slice(-count);
  }
}
