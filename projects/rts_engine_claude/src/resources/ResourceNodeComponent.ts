/**
 * Component for resource nodes on the map (gold mines, forests, stone quarries).
 * Workers gather from these nodes.
 */

import { ComponentData } from '../core/Component';
import { ResourceType } from './ResourceType';

export interface ResourceNodeData extends ComponentData {
  readonly type: 'ResourceNode';
  resourceType: ResourceType;
  remaining: number;     // resources left in this node
  maxCapacity: number;   // starting capacity
  gatherersActive: number; // number of workers currently gathering
  maxGatherers: number;    // max simultaneous gatherers
}

export function createResourceNodeData(
  resourceType: ResourceType,
  amount: number,
  maxGatherers: number = 5,
): ResourceNodeData {
  return {
    type: 'ResourceNode',
    resourceType,
    remaining: amount,
    maxCapacity: amount,
    gatherersActive: 0,
    maxGatherers,
  };
}
