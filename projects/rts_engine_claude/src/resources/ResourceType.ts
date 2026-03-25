/**
 * Resource types and cost definitions for the RTS economy.
 */

export enum ResourceType {
  Gold = 'Gold',
  Wood = 'Wood',
  Stone = 'Stone',
  Food = 'Food',
}

/** A bundle of resource costs (e.g., for training units or constructing buildings) */
export interface ResourceCost {
  readonly [ResourceType.Gold]?: number;
  readonly [ResourceType.Wood]?: number;
  readonly [ResourceType.Stone]?: number;
  readonly [ResourceType.Food]?: number;
}

/** Helper to create a cost object */
export function createCost(
  gold: number = 0,
  wood: number = 0,
  stone: number = 0,
  food: number = 0,
): ResourceCost {
  const cost: Record<string, number> = {};
  if (gold > 0) cost[ResourceType.Gold] = gold;
  if (wood > 0) cost[ResourceType.Wood] = wood;
  if (stone > 0) cost[ResourceType.Stone] = stone;
  if (food > 0) cost[ResourceType.Food] = food;
  return cost as ResourceCost;
}

/** Starting resources for a new player */
export const STARTING_RESOURCES: Readonly<Record<ResourceType, number>> = {
  [ResourceType.Gold]: 500,
  [ResourceType.Wood]: 300,
  [ResourceType.Stone]: 200,
  [ResourceType.Food]: 200,
};
