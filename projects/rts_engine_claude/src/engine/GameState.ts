/**
 * Game state serialization and deserialization.
 * Enables save/load, replays, and network synchronization.
 */

import { World } from '../core/World';
import { Entity } from '../core/Entity';
import { ComponentData } from '../core/Component';
import { Player } from './Player';
import { ResourceManager } from '../resources/ResourceManager';
import { ResourceType } from '../resources/ResourceType';
import { TileMap } from '../terrain/TileMap';
import { TerrainType } from '../terrain/TerrainType';

/** Serialized representation of the full game state */
export interface SerializedGameState {
  readonly version: number;
  readonly tick: number;
  readonly terrain: SerializedTerrain;
  readonly entities: readonly SerializedEntity[];
  readonly players: readonly object[];
  readonly resources: readonly SerializedPlayerResources[];
}

export interface SerializedTerrain {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly string[];  // Run-length encoded terrain types
}

export interface SerializedEntity {
  readonly id: number;
  readonly tags: readonly string[];
  readonly active: boolean;
  readonly components: readonly SerializedComponent[];
}

export interface SerializedComponent {
  readonly type: string;
  readonly data: Record<string, unknown>;
}

export interface SerializedPlayerResources {
  readonly playerId: number;
  readonly gold: number;
  readonly wood: number;
  readonly stone: number;
  readonly food: number;
}

const STATE_VERSION = 1;

/**
 * Serialize the current game state to a JSON-compatible object.
 */
export function serializeGameState(
  world: World,
  tileMap: TileMap,
  players: readonly Player[],
  resourceManager: ResourceManager,
  tick: number,
): SerializedGameState {
  // Serialize terrain using run-length encoding
  const terrainTiles: string[] = [];
  for (let y = 0; y < tileMap.height; y++) {
    let row = '';
    for (let x = 0; x < tileMap.width; x++) {
      const terrain = tileMap.getTerrainAt(x, y);
      row += terrainCharMap[terrain] ?? '?';
    }
    terrainTiles.push(row);
  }

  // Serialize entities
  const entities: SerializedEntity[] = [];
  for (const [_id, entity] of world.getAllEntities()) {
    const components: SerializedComponent[] = [];
    for (const comp of entity.getAllComponents()) {
      components.push({
        type: comp.data.type,
        data: { ...comp.data } as Record<string, unknown>,
      });
    }

    entities.push({
      id: entity.id,
      tags: Array.from(entity.tags),
      active: entity.active,
      components,
    });
  }

  // Serialize resources
  const resources: SerializedPlayerResources[] = players.map((p) => {
    const snap = resourceManager.getSnapshot(p.id);
    return {
      playerId: p.id,
      gold: snap[ResourceType.Gold],
      wood: snap[ResourceType.Wood],
      stone: snap[ResourceType.Stone],
      food: snap[ResourceType.Food],
    };
  });

  return {
    version: STATE_VERSION,
    tick,
    terrain: {
      width: tileMap.width,
      height: tileMap.height,
      tiles: terrainTiles,
    },
    entities,
    players: players.map((p) => p.serialize()),
    resources,
  };
}

/** Convert game state to a JSON string */
export function gameStateToJson(state: SerializedGameState): string {
  return JSON.stringify(state, null, 2);
}

/** Parse a JSON string back to a serialized game state */
export function gameStateFromJson(json: string): SerializedGameState {
  const parsed = JSON.parse(json) as SerializedGameState;
  if (parsed.version !== STATE_VERSION) {
    throw new Error(`Unsupported game state version: ${parsed.version} (expected ${STATE_VERSION})`);
  }
  return parsed;
}

/** Terrain type to single character for serialization */
const terrainCharMap: Record<TerrainType, string> = {
  [TerrainType.Grass]: 'G',
  [TerrainType.Forest]: 'F',
  [TerrainType.Mountain]: 'M',
  [TerrainType.Water]: 'W',
  [TerrainType.Desert]: 'D',
  [TerrainType.Swamp]: 'S',
  [TerrainType.Road]: 'R',
  [TerrainType.Bridge]: 'B',
  [TerrainType.Wall]: 'L',
  [TerrainType.Void]: 'V',
};
