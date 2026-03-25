/**
 * Terrain types and their properties.
 * Each terrain type has a movement cost modifier and visual representation.
 */

export enum TerrainType {
  Grass = 'Grass',
  Forest = 'Forest',
  Mountain = 'Mountain',
  Water = 'Water',
  Desert = 'Desert',
  Swamp = 'Swamp',
  Road = 'Road',
  Bridge = 'Bridge',
  Wall = 'Wall',
  Void = 'Void',
}

export interface TerrainProperties {
  readonly type: TerrainType;
  /** Movement cost multiplier (1.0 = normal, Infinity = impassable) */
  readonly movementCost: number;
  /** Whether units can build on this terrain */
  readonly buildable: boolean;
  /** Whether this terrain blocks line of sight */
  readonly blocksVision: boolean;
  /** Defense bonus for units standing on this terrain (0-1 range) */
  readonly defenseBonus: number;
  /** Console character for rendering */
  readonly displayChar: string;
  /** Display color name for console rendering */
  readonly displayColor: string;
}

/** Static lookup table of terrain properties */
export const TERRAIN_PROPERTIES: Readonly<Record<TerrainType, TerrainProperties>> = {
  [TerrainType.Grass]: {
    type: TerrainType.Grass,
    movementCost: 1.0,
    buildable: true,
    blocksVision: false,
    defenseBonus: 0,
    displayChar: '.',
    displayColor: 'green',
  },
  [TerrainType.Forest]: {
    type: TerrainType.Forest,
    movementCost: 1.5,
    buildable: false,
    blocksVision: true,
    defenseBonus: 0.25,
    displayChar: 'T',
    displayColor: 'green',
  },
  [TerrainType.Mountain]: {
    type: TerrainType.Mountain,
    movementCost: 3.0,
    buildable: false,
    blocksVision: true,
    defenseBonus: 0.5,
    displayChar: '^',
    displayColor: 'white',
  },
  [TerrainType.Water]: {
    type: TerrainType.Water,
    movementCost: Infinity,
    buildable: false,
    blocksVision: false,
    defenseBonus: 0,
    displayChar: '~',
    displayColor: 'blue',
  },
  [TerrainType.Desert]: {
    type: TerrainType.Desert,
    movementCost: 1.5,
    buildable: true,
    blocksVision: false,
    defenseBonus: 0,
    displayChar: ':',
    displayColor: 'yellow',
  },
  [TerrainType.Swamp]: {
    type: TerrainType.Swamp,
    movementCost: 2.5,
    buildable: false,
    blocksVision: false,
    defenseBonus: -0.1,
    displayChar: '%',
    displayColor: 'cyan',
  },
  [TerrainType.Road]: {
    type: TerrainType.Road,
    movementCost: 0.5,
    buildable: false,
    blocksVision: false,
    defenseBonus: 0,
    displayChar: '=',
    displayColor: 'white',
  },
  [TerrainType.Bridge]: {
    type: TerrainType.Bridge,
    movementCost: 0.75,
    buildable: false,
    blocksVision: false,
    defenseBonus: 0,
    displayChar: '#',
    displayColor: 'white',
  },
  [TerrainType.Wall]: {
    type: TerrainType.Wall,
    movementCost: Infinity,
    buildable: false,
    blocksVision: true,
    defenseBonus: 0,
    displayChar: 'W',
    displayColor: 'white',
  },
  [TerrainType.Void]: {
    type: TerrainType.Void,
    movementCost: Infinity,
    buildable: false,
    blocksVision: true,
    defenseBonus: 0,
    displayChar: ' ',
    displayColor: 'white',
  },
};
