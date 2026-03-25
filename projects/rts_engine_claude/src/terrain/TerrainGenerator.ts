/**
 * Procedural terrain generator using value noise and biome thresholds.
 *
 * Generates naturalistic maps with water bodies, forests, mountains,
 * and resource-rich areas. Uses a seeded PRNG for reproducibility.
 */

import { TileMap } from './TileMap';
import { TerrainType } from './TerrainType';
import { Vector2 } from '../math/Vector2';

/** Configuration for terrain generation */
export interface TerrainGenConfig {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  /** 0-1, fraction of map that is water */
  readonly waterLevel: number;
  /** 0-1, fraction of land that is forested */
  readonly forestDensity: number;
  /** 0-1, fraction of land that is mountainous */
  readonly mountainDensity: number;
  /** Number of resource deposit clusters to place */
  readonly resourceClusters: number;
}

export const DEFAULT_TERRAIN_CONFIG: TerrainGenConfig = {
  width: 64,
  height: 64,
  seed: 42,
  waterLevel: 0.3,
  forestDensity: 0.25,
  mountainDensity: 0.1,
  resourceClusters: 8,
};

/**
 * Simple seeded PRNG (Mulberry32).
 * Produces deterministic sequences from a 32-bit seed.
 */
class SeededRandom {
  private _state: number;

  constructor(seed: number) {
    this._state = seed | 0;
  }

  /** Returns a float in [0, 1) */
  next(): number {
    this._state += 0x6d2b79f5;
    let t = this._state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Value noise generator using bilinear interpolation of random grid values.
 * Simpler than Perlin noise but sufficient for terrain generation.
 */
class ValueNoise {
  private readonly _rng: SeededRandom;
  private readonly _gridSize: number;
  private readonly _values: Map<string, number> = new Map();

  constructor(rng: SeededRandom, gridSize: number) {
    this._rng = rng;
    this._gridSize = gridSize;
  }

  private _getGridValue(gx: number, gy: number): number {
    const key = `${gx},${gy}`;
    let val = this._values.get(key);
    if (val === undefined) {
      val = this._rng.next();
      this._values.set(key, val);
    }
    return val;
  }

  /** Sample noise at continuous coordinates, returns value in [0, 1] */
  sample(x: number, y: number): number {
    const gx = x / this._gridSize;
    const gy = y / this._gridSize;

    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const fx = gx - x0;
    const fy = gy - y0;

    // Smooth interpolation (smoothstep)
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const v00 = this._getGridValue(x0, y0);
    const v10 = this._getGridValue(x1, y0);
    const v01 = this._getGridValue(x0, y1);
    const v11 = this._getGridValue(x1, y1);

    const top = v00 + (v10 - v00) * sx;
    const bottom = v01 + (v11 - v01) * sx;
    return top + (bottom - top) * sy;
  }

  /**
   * Multi-octave fractal noise for more natural-looking terrain.
   * Each octave doubles in frequency and halves in amplitude.
   */
  fractal(x: number, y: number, octaves: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxAmplitude = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.sample(x * frequency, y * frequency) * amplitude;
      maxAmplitude += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxAmplitude;
  }
}

/** Resource cluster position hint returned by the generator */
export interface ResourceCluster {
  readonly position: Vector2;
  readonly type: 'gold' | 'wood' | 'stone';
  readonly amount: number;
}

export interface GenerationResult {
  readonly tileMap: TileMap;
  /** Suggested spawn points for players (on open grass) */
  readonly spawnPoints: readonly Vector2[];
  /** Resource cluster hints for the resource system to place nodes */
  readonly resourceClusters: readonly ResourceCluster[];
}

/**
 * Generate a complete terrain map from a config.
 *
 * Pipeline:
 * 1. Generate height noise -> assign water/land threshold
 * 2. Generate moisture noise -> assign forest/desert biomes
 * 3. High elevation land -> mountains
 * 4. Place resource clusters using Poisson-like distribution
 * 5. Find valid spawn points far from each other
 */
export function generateTerrain(config: Partial<TerrainGenConfig> = {}): GenerationResult {
  const cfg = { ...DEFAULT_TERRAIN_CONFIG, ...config };
  const rng = new SeededRandom(cfg.seed);
  const heightNoise = new ValueNoise(new SeededRandom(cfg.seed), 12);
  const moistureNoise = new ValueNoise(new SeededRandom(cfg.seed + 1000), 16);

  const tileMap = new TileMap(cfg.width, cfg.height);

  // Step 1 & 2: Assign terrain based on noise
  const heightValues: number[] = new Array(cfg.width * cfg.height);

  for (let y = 0; y < cfg.height; y++) {
    for (let x = 0; x < cfg.width; x++) {
      heightValues[y * cfg.width + x] = heightNoise.fractal(x, y, 4);
    }
  }

  // Sort heights to find the water threshold percentile
  const sorted = [...heightValues].sort((a, b) => a - b);
  const waterThreshold = sorted[Math.floor(cfg.waterLevel * sorted.length)];
  const mountainThreshold = sorted[Math.floor((1 - cfg.mountainDensity) * sorted.length)];

  for (let y = 0; y < cfg.height; y++) {
    for (let x = 0; x < cfg.width; x++) {
      const height = heightValues[y * cfg.width + x];
      const moisture = moistureNoise.fractal(x, y, 3);

      let terrain: TerrainType;

      if (height < waterThreshold) {
        terrain = TerrainType.Water;
      } else if (height > mountainThreshold) {
        terrain = TerrainType.Mountain;
      } else if (moisture > (1 - cfg.forestDensity) && height < mountainThreshold * 0.9) {
        terrain = TerrainType.Forest;
      } else if (moisture < 0.3) {
        terrain = TerrainType.Desert;
      } else {
        terrain = TerrainType.Grass;
      }

      tileMap.setTerrain(x, y, terrain);
    }
  }

  // Step 3: Place resource clusters
  const resourceClusters: ResourceCluster[] = [];
  const resourceTypes: Array<'gold' | 'wood' | 'stone'> = ['gold', 'wood', 'stone'];

  for (let i = 0; i < cfg.resourceClusters; i++) {
    for (let attempt = 0; attempt < 50; attempt++) {
      const rx = rng.nextInt(3, cfg.width - 4);
      const ry = rng.nextInt(3, cfg.height - 4);
      const terrain = tileMap.getTerrainAt(rx, ry);

      if (terrain === TerrainType.Grass || terrain === TerrainType.Forest) {
        const rType = resourceTypes[i % resourceTypes.length];
        resourceClusters.push({
          position: new Vector2(rx, ry),
          type: rType,
          amount: rng.nextInt(500, 2000),
        });
        break;
      }
    }
  }

  // Step 4: Find spawn points (spread out on grass)
  const spawnPoints: Vector2[] = [];
  const minSpawnDist = Math.floor(Math.min(cfg.width, cfg.height) * 0.4);

  for (let attempt = 0; attempt < 200 && spawnPoints.length < 4; attempt++) {
    const sx = rng.nextInt(5, cfg.width - 6);
    const sy = rng.nextInt(5, cfg.height - 6);

    if (tileMap.getTerrainAt(sx, sy) !== TerrainType.Grass) continue;

    // Check area around spawn is mostly clear
    let clearCount = 0;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const t = tileMap.getTerrainAt(sx + dx, sy + dy);
        if (t === TerrainType.Grass) clearCount++;
      }
    }
    if (clearCount < 15) continue;

    // Check distance from other spawns
    const tooClose = spawnPoints.some(
      (sp) => sp.distanceTo(new Vector2(sx, sy)) < minSpawnDist
    );
    if (tooClose) continue;

    spawnPoints.push(new Vector2(sx, sy));
  }

  return { tileMap, spawnPoints, resourceClusters };
}
