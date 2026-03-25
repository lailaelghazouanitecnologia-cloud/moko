/**
 * Resource manager: tracks per-player resource stockpiles,
 * handles spending, gathering, and income.
 */

import { EventBus, GameEventType } from '../core/EventBus';
import { ResourceType, ResourceCost, STARTING_RESOURCES } from './ResourceType';

/** Snapshot of a player's resource stockpile */
export interface ResourceSnapshot {
  readonly [ResourceType.Gold]: number;
  readonly [ResourceType.Wood]: number;
  readonly [ResourceType.Stone]: number;
  readonly [ResourceType.Food]: number;
}

export class ResourceManager {
  private readonly _eventBus: EventBus;
  /** Per-player resource stockpiles */
  private readonly _stockpiles: Map<number, Record<ResourceType, number>> = new Map();
  /** Per-player storage capacity (0 = unlimited) */
  private readonly _capacities: Map<number, Record<ResourceType, number>> = new Map();

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  /** Initialize a player with starting resources */
  initPlayer(playerId: number, startingResources?: Partial<Record<ResourceType, number>>): void {
    const stock: Record<ResourceType, number> = {
      [ResourceType.Gold]: startingResources?.[ResourceType.Gold] ?? STARTING_RESOURCES[ResourceType.Gold],
      [ResourceType.Wood]: startingResources?.[ResourceType.Wood] ?? STARTING_RESOURCES[ResourceType.Wood],
      [ResourceType.Stone]: startingResources?.[ResourceType.Stone] ?? STARTING_RESOURCES[ResourceType.Stone],
      [ResourceType.Food]: startingResources?.[ResourceType.Food] ?? STARTING_RESOURCES[ResourceType.Food],
    };
    this._stockpiles.set(playerId, stock);
    this._capacities.set(playerId, {
      [ResourceType.Gold]: 0,
      [ResourceType.Wood]: 0,
      [ResourceType.Stone]: 0,
      [ResourceType.Food]: 0,
    });
  }

  /** Get current amount of a resource for a player */
  getAmount(playerId: number, type: ResourceType): number {
    return this._stockpiles.get(playerId)?.[type] ?? 0;
  }

  /** Get a snapshot of all resources for a player */
  getSnapshot(playerId: number): ResourceSnapshot {
    const stock = this._stockpiles.get(playerId);
    if (!stock) {
      return {
        [ResourceType.Gold]: 0,
        [ResourceType.Wood]: 0,
        [ResourceType.Stone]: 0,
        [ResourceType.Food]: 0,
      };
    }
    return { ...stock };
  }

  /** Add resources (from gathering, income, etc.) */
  addResource(playerId: number, type: ResourceType, amount: number): void {
    const stock = this._stockpiles.get(playerId);
    if (!stock) return;

    const cap = this._capacities.get(playerId);
    let newAmount = stock[type] + amount;

    // Enforce capacity if set
    if (cap && cap[type] > 0) {
      newAmount = Math.min(newAmount, cap[type]);
    }

    stock[type] = newAmount;

    this._eventBus.emit({
      type: GameEventType.ResourceGathered,
      playerId,
      resourceType: type,
      amount,
    });
  }

  /** Check if a player can afford a cost */
  canAfford(playerId: number, cost: ResourceCost): boolean {
    const stock = this._stockpiles.get(playerId);
    if (!stock) return false;

    for (const [type, amount] of Object.entries(cost)) {
      if (amount !== undefined && (stock[type as ResourceType] ?? 0) < amount) {
        return false;
      }
    }
    return true;
  }

  /**
   * Spend resources (for training, building, upgrading).
   * Returns true if the player could afford it, false otherwise.
   */
  spend(playerId: number, cost: ResourceCost): boolean {
    if (!this.canAfford(playerId, cost)) return false;

    const stock = this._stockpiles.get(playerId)!;
    for (const [type, amount] of Object.entries(cost)) {
      if (amount !== undefined && amount > 0) {
        stock[type as ResourceType] -= amount;
        this._eventBus.emit({
          type: GameEventType.ResourceSpent,
          playerId,
          resourceType: type,
          amount,
        });
      }
    }
    return true;
  }

  /** Set storage capacity for a resource (0 = unlimited) */
  setCapacity(playerId: number, type: ResourceType, capacity: number): void {
    const cap = this._capacities.get(playerId);
    if (cap) {
      cap[type] = capacity;
    }
  }

  /** Increase storage capacity (e.g., when a storage building completes) */
  addCapacity(playerId: number, type: ResourceType, amount: number): void {
    const cap = this._capacities.get(playerId);
    if (cap) {
      cap[type] += amount;
    }
  }

  /** Get current capacity for a resource (0 = unlimited) */
  getCapacity(playerId: number, type: ResourceType): number {
    return this._capacities.get(playerId)?.[type] ?? 0;
  }
}
