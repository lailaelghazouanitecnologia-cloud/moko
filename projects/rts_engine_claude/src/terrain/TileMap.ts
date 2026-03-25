/**
 * TileMap: the spatial backbone of the game world.
 * Manages terrain data, occupancy, and provides the cost function for pathfinding.
 */

import { Grid } from '../math/Grid';
import { Vector2 } from '../math/Vector2';
import { CostFunction } from '../math/Pathfinding';
import { TerrainType, TERRAIN_PROPERTIES, TerrainProperties } from './TerrainType';

/** Per-tile data stored in the map */
export interface TileData {
  terrain: TerrainType;
  /** Entity id occupying this tile, or null */
  occupantId: number | null;
  /** Resource node entity id, or null */
  resourceId: number | null;
}

export class TileMap {
  public readonly width: number;
  public readonly height: number;
  private readonly _tiles: Grid<TileData>;

  constructor(width: number, height: number, defaultTerrain: TerrainType = TerrainType.Grass) {
    this.width = width;
    this.height = height;
    this._tiles = new Grid<TileData>(width, height, () => ({
      terrain: defaultTerrain,
      occupantId: null,
      resourceId: null,
    }));
  }

  /** Get tile data at (x, y) */
  getTile(x: number, y: number): TileData | undefined {
    return this._tiles.get(x, y);
  }

  /** Get terrain type at (x, y) */
  getTerrainAt(x: number, y: number): TerrainType {
    const tile = this._tiles.get(x, y);
    return tile ? tile.terrain : TerrainType.Void;
  }

  /** Get terrain properties at (x, y) */
  getTerrainProperties(x: number, y: number): TerrainProperties {
    return TERRAIN_PROPERTIES[this.getTerrainAt(x, y)];
  }

  /** Set terrain at (x, y) */
  setTerrain(x: number, y: number, terrain: TerrainType): void {
    const tile = this._tiles.get(x, y);
    if (tile) {
      tile.terrain = terrain;
    }
  }

  /** Mark a tile as occupied by an entity */
  setOccupant(x: number, y: number, entityId: number | null): void {
    const tile = this._tiles.get(x, y);
    if (tile) {
      tile.occupantId = entityId;
    }
  }

  /** Check if a tile is occupied */
  isOccupied(x: number, y: number): boolean {
    const tile = this._tiles.get(x, y);
    return tile ? tile.occupantId !== null : true;
  }

  /** Set a resource node on a tile */
  setResource(x: number, y: number, resourceId: number | null): void {
    const tile = this._tiles.get(x, y);
    if (tile) {
      tile.resourceId = resourceId;
    }
  }

  /** Check if coordinates are within the map */
  inBounds(x: number, y: number): boolean {
    return this._tiles.inBounds(x, y);
  }

  /** Check if a tile is passable (terrain allows movement and not blocked) */
  isPassable(x: number, y: number): boolean {
    const tile = this._tiles.get(x, y);
    if (!tile) return false;
    const props = TERRAIN_PROPERTIES[tile.terrain];
    return isFinite(props.movementCost) && tile.occupantId === null;
  }

  /** Check if a tile allows building */
  isBuildable(x: number, y: number): boolean {
    const tile = this._tiles.get(x, y);
    if (!tile) return false;
    const props = TERRAIN_PROPERTIES[tile.terrain];
    return props.buildable && tile.occupantId === null && tile.resourceId === null;
  }

  /**
   * Returns a cost function suitable for A* pathfinding.
   * Accounts for terrain cost and occupancy.
   * @param ignoreOccupants - If true, treats occupied tiles as passable
   */
  getCostFunction(ignoreOccupants: boolean = false): CostFunction {
    return (x: number, y: number): number => {
      const tile = this._tiles.get(x, y);
      if (!tile) return Infinity;
      const props = TERRAIN_PROPERTIES[tile.terrain];
      if (!ignoreOccupants && tile.occupantId !== null) return Infinity;
      return props.movementCost;
    };
  }

  /** Iterate over all tiles */
  forEach(callback: (tile: TileData, x: number, y: number) => void): void {
    this._tiles.forEach(callback);
  }

  /**
   * Find the nearest passable tile to a given position.
   * Uses BFS expanding outward from the target.
   */
  findNearestPassable(pos: Vector2, maxRadius: number = 10): Vector2 | null {
    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);

    if (this.isPassable(cx, cy)) return new Vector2(cx, cy);

    for (let r = 1; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // Only check ring
          const nx = cx + dx;
          const ny = cy + dy;
          if (this.isPassable(nx, ny)) {
            return new Vector2(nx, ny);
          }
        }
      }
    }
    return null;
  }
}
