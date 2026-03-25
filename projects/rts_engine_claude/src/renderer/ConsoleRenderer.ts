/**
 * Console/text-based renderer for the RTS engine.
 *
 * Renders the game state as ASCII art to stdout. Layers:
 * 1. Terrain base layer
 * 2. Buildings overlay
 * 3. Units overlay
 * 4. Fog of war mask
 * 5. UI panels (resources, minimap, selection info)
 */

import { World } from '../core/World';
import { TileMap } from '../terrain/TileMap';
import { FogOfWar, Visibility } from '../terrain/FogOfWar';
import { TERRAIN_PROPERTIES, TerrainType } from '../terrain/TerrainType';
import { PositionData, UnitIdentityData, HealthData, SelectionData } from '../units/UnitComponents';
import { BuildingIdentityData, ConstructionData } from '../buildings/BuildingComponents';
import { ResourceManager } from '../resources/ResourceManager';
import { ResourceType } from '../resources/ResourceType';
import { Vector2 } from '../math/Vector2';
import { Rectangle } from '../math/Rectangle';

/** Render configuration */
export interface RenderConfig {
  /** Which player's perspective to render from */
  readonly viewPlayerId: number;
  /** Viewport position (top-left corner in world coordinates) */
  readonly viewportX: number;
  readonly viewportY: number;
  /** Viewport size in tiles */
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  /** Whether to show fog of war */
  readonly showFogOfWar: boolean;
  /** Whether to show the minimap */
  readonly showMinimap: boolean;
  /** Whether to show the resource panel */
  readonly showResources: boolean;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  viewPlayerId: 0,
  viewportX: 0,
  viewportY: 0,
  viewportWidth: 40,
  viewportHeight: 20,
  showFogOfWar: true,
  showMinimap: true,
  showResources: true,
};

export class ConsoleRenderer {
  private readonly _world: World;
  private readonly _tileMap: TileMap;
  private readonly _fogOfWar: FogOfWar;
  private readonly _resourceManager: ResourceManager;
  private _config: RenderConfig;

  constructor(
    world: World,
    tileMap: TileMap,
    fogOfWar: FogOfWar,
    resourceManager: ResourceManager,
    config?: Partial<RenderConfig>,
  ) {
    this._world = world;
    this._tileMap = tileMap;
    this._fogOfWar = fogOfWar;
    this._resourceManager = resourceManager;
    this._config = { ...DEFAULT_RENDER_CONFIG, ...config };
  }

  /** Update render configuration */
  setConfig(config: Partial<RenderConfig>): void {
    this._config = { ...this._config, ...config };
  }

  /** Scroll the viewport */
  scrollTo(x: number, y: number): void {
    this._config = {
      ...this._config,
      viewportX: Math.max(0, Math.min(x, this._tileMap.width - this._config.viewportWidth)),
      viewportY: Math.max(0, Math.min(y, this._tileMap.height - this._config.viewportHeight)),
    };
  }

  /**
   * Render the complete game view and return as a string.
   * Does NOT write to stdout — caller decides what to do with it.
   */
  render(tick: number): string {
    const lines: string[] = [];

    // Resource bar
    if (this._config.showResources) {
      lines.push(this._renderResourceBar());
      lines.push('');
    }

    // Main map viewport
    const mapLines = this._renderMapViewport();

    // Minimap
    if (this._config.showMinimap) {
      const minimapLines = this._renderMinimap();
      // Place minimap to the right of the map
      for (let i = 0; i < Math.max(mapLines.length, minimapLines.length); i++) {
        const mapLine = mapLines[i] ?? '';
        const miniLine = minimapLines[i] ?? '';
        lines.push(`${mapLine}  ${mini_bar(i === 0)}${miniLine}`);
      }
    } else {
      lines.push(...mapLines);
    }

    // Selection info
    lines.push('');
    lines.push(this._renderSelectionInfo());

    // Status bar
    lines.push(this._renderStatusBar(tick));

    return lines.join('\n');
  }

  /** Render to stdout (clears screen first) */
  renderToConsole(tick: number): void {
    const output = this.render(tick);
    // Move cursor to top-left and clear screen
    process.stdout.write('\x1B[2J\x1B[0;0H');
    process.stdout.write(output + '\n');
  }

  /** Render the resource bar */
  private _renderResourceBar(): string {
    const snap = this._resourceManager.getSnapshot(this._config.viewPlayerId);
    return [
      `Gold: ${snap[ResourceType.Gold]}`,
      `Wood: ${snap[ResourceType.Wood]}`,
      `Stone: ${snap[ResourceType.Stone]}`,
      `Food: ${snap[ResourceType.Food]}`,
    ].join(' | ');
  }

  /** Render the main map viewport as an array of lines */
  private _renderMapViewport(): string[] {
    const { viewportX: vx, viewportY: vy, viewportWidth: vw, viewportHeight: vh } = this._config;
    const pid = this._config.viewPlayerId;
    const showFog = this._config.showFogOfWar;

    // Build overlay maps for units and buildings
    const unitOverlay = new Map<string, { char: string; selected: boolean }>();
    const buildingOverlay = new Map<string, { char: string; underConstruction: boolean }>();

    // Collect units
    const units = this._world.getEntitiesByTag('unit');
    for (const unit of units) {
      const pos = unit.getComponent<PositionData>('Position');
      const identity = unit.getComponent<UnitIdentityData>('UnitIdentity');
      const sel = unit.getComponent<SelectionData>('Selection');
      if (!pos || !identity) continue;

      const gx = Math.floor(pos.data.x);
      const gy = Math.floor(pos.data.y);
      const key = `${gx},${gy}`;

      if (!showFog || this._fogOfWar.isVisible(pid, gx, gy)) {
        unitOverlay.set(key, {
          char: identity.data.displayChar,
          selected: sel?.data.selected ?? false,
        });
      }
    }

    // Collect buildings
    const buildings = this._world.getEntitiesByTag('building');
    for (const building of buildings) {
      const pos = building.getComponent<PositionData>('Position');
      const identity = building.getComponent<BuildingIdentityData>('BuildingIdentity');
      const constr = building.getComponent<ConstructionData>('Construction');
      if (!pos || !identity) continue;

      const gx = Math.floor(pos.data.x);
      const gy = Math.floor(pos.data.y);

      // Buildings may span multiple tiles
      const size = identity.data.size;
      for (let dy = 0; dy < size.h; dy++) {
        for (let dx = 0; dx < size.w; dx++) {
          const bx = gx + dx;
          const by = gy + dy;
          const key = `${bx},${by}`;

          if (!showFog || this._fogOfWar.isExplored(pid, bx, by)) {
            buildingOverlay.set(key, {
              char: identity.data.displayChar,
              underConstruction: constr ? !constr.data.isComplete : false,
            });
          }
        }
      }
    }

    // Render the viewport
    const lines: string[] = [];
    const topBorder = '+' + '-'.repeat(vw) + '+';
    lines.push(topBorder);

    for (let row = 0; row < vh; row++) {
      let line = '|';
      for (let col = 0; col < vw; col++) {
        const wx = vx + col;
        const wy = vy + row;
        const key = `${wx},${wy}`;

        // Check fog of war
        if (showFog) {
          const vis = this._fogOfWar.getVisibility(pid, wx, wy);
          if (vis === Visibility.Hidden) {
            line += ' ';
            continue;
          }
          if (vis === Visibility.Explored) {
            // Show terrain but dim (using period for explored)
            const terrain = this._tileMap.getTerrainAt(wx, wy);
            const props = TERRAIN_PROPERTIES[terrain];
            line += props.displayChar.toLowerCase();
            continue;
          }
        }

        // Layer priority: units > buildings > terrain
        const unitInfo = unitOverlay.get(key);
        if (unitInfo) {
          line += unitInfo.selected ? unitInfo.char.toUpperCase() : unitInfo.char;
          continue;
        }

        const buildingInfo = buildingOverlay.get(key);
        if (buildingInfo) {
          line += buildingInfo.underConstruction
            ? buildingInfo.char.toLowerCase()
            : buildingInfo.char;
          continue;
        }

        // Terrain
        const terrain = this._tileMap.getTerrainAt(wx, wy);
        const props = TERRAIN_PROPERTIES[terrain];
        line += props.displayChar;
      }
      line += '|';
      lines.push(line);
    }

    lines.push(topBorder);
    return lines;
  }

  /** Render a minimap (condensed view of the full map) */
  private _renderMinimap(): string[] {
    const MINI_W = 16;
    const MINI_H = 8;
    const lines: string[] = [];

    const scaleX = this._tileMap.width / MINI_W;
    const scaleY = this._tileMap.height / MINI_H;
    const pid = this._config.viewPlayerId;

    lines.push('[MINIMAP]');
    const border = '+' + '-'.repeat(MINI_W) + '+';
    lines.push(border);

    for (let my = 0; my < MINI_H; my++) {
      let line = '|';
      for (let mx = 0; mx < MINI_W; mx++) {
        const wx = Math.floor(mx * scaleX);
        const wy = Math.floor(my * scaleY);

        if (this._config.showFogOfWar && !this._fogOfWar.isExplored(pid, wx, wy)) {
          line += ' ';
          continue;
        }

        // Check for units/buildings in this region
        const hasUnit = this._hasEntityInRegion(wx, wy, scaleX, scaleY, 'unit');
        const hasBuilding = this._hasEntityInRegion(wx, wy, scaleX, scaleY, 'building');

        if (hasUnit) {
          line += '*';
        } else if (hasBuilding) {
          line += '#';
        } else {
          const terrain = this._tileMap.getTerrainAt(wx, wy);
          if (terrain === TerrainType.Water) line += '~';
          else if (terrain === TerrainType.Mountain) line += '^';
          else if (terrain === TerrainType.Forest) line += 'T';
          else line += '.';
        }
      }
      line += '|';
      lines.push(line);
    }

    lines.push(border);
    return lines;
  }

  /** Check if any entity with a tag exists in a map region */
  private _hasEntityInRegion(
    wx: number,
    wy: number,
    scaleX: number,
    scaleY: number,
    tag: string,
  ): boolean {
    const entities = this._world.getEntitiesByTag(tag);
    const rect = new Rectangle(wx, wy, scaleX, scaleY);

    for (const e of entities) {
      const pos = e.getComponent<PositionData>('Position');
      if (pos && rect.containsPoint(new Vector2(pos.data.x, pos.data.y))) {
        return true;
      }
    }
    return false;
  }

  /** Render info about currently selected units */
  private _renderSelectionInfo(): string {
    const selected = this._world.getEntitiesByTag(`player_${this._config.viewPlayerId}`)
      .filter((e) => {
        const sel = e.getComponent<SelectionData>('Selection');
        return sel && sel.data.selected;
      });

    if (selected.length === 0) return 'No selection';

    if (selected.length === 1) {
      const unit = selected[0];
      const identity = unit.getComponent<UnitIdentityData>('UnitIdentity');
      const health = unit.getComponent<HealthData>('Health');
      const pos = unit.getComponent<PositionData>('Position');

      const parts: string[] = [];
      if (identity) parts.push(`[${identity.data.unitType}]`);
      if (health) parts.push(`HP: ${Math.ceil(health.data.current)}/${health.data.max}`);
      if (pos) parts.push(`Pos: (${Math.floor(pos.data.x)}, ${Math.floor(pos.data.y)})`);

      return parts.join(' | ');
    }

    return `${selected.length} units selected`;
  }

  /** Render a status bar with game info */
  private _renderStatusBar(tick: number): string {
    const unitCount = this._world.getEntitiesByTag('unit').length;
    const buildingCount = this._world.getEntitiesByTag('building').length;
    return `Tick: ${tick} | Units: ${unitCount} | Buildings: ${buildingCount}`;
  }
}

/** Helper: minimap separator bar */
function mini_bar(isFirst: boolean): string {
  return isFirst ? '  ' : '  ';
}
