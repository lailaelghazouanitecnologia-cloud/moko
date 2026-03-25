/**
 * Fog of War system.
 *
 * Three visibility states per tile per player:
 *  - Hidden: never seen, completely dark
 *  - Explored: previously seen but no current vision (greyed out)
 *  - Visible: currently within a unit's sight radius
 *
 * Uses a simple circle-based vision model. Each tick, all player units'
 * sight radiuses are unioned to produce the visible set.
 */

import { Grid } from '../math/Grid';

export enum Visibility {
  Hidden = 0,
  Explored = 1,
  Visible = 2,
}

export class FogOfWar {
  public readonly width: number;
  public readonly height: number;
  private readonly _playerVisibility: Map<number, Grid<Visibility>>;
  /** Transient per-tick "currently seen" flags, reset each update */
  private readonly _currentVision: Map<number, Grid<boolean>>;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this._playerVisibility = new Map();
    this._currentVision = new Map();
  }

  /** Register a player for fog tracking */
  addPlayer(playerId: number): void {
    this._playerVisibility.set(
      playerId,
      new Grid<Visibility>(this.width, this.height, Visibility.Hidden)
    );
    this._currentVision.set(
      playerId,
      new Grid<boolean>(this.width, this.height, false)
    );
  }

  /** Begin a new vision update cycle — clears transient vision */
  beginUpdate(playerId: number): void {
    const vision = this._currentVision.get(playerId);
    if (vision) {
      vision.fill(false);
    }
  }

  /**
   * Reveal tiles within a unit's sight radius.
   * Called for each unit during the vision update phase.
   *
   * Uses a simple filled-circle algorithm (Bresenham-style).
   */
  revealArea(playerId: number, cx: number, cy: number, radius: number): void {
    const vis = this._playerVisibility.get(playerId);
    const current = this._currentVision.get(playerId);
    if (!vis || !current) return;

    const r2 = radius * radius;
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) {
          vis.set(x, y, Visibility.Visible);
          current.set(x, y, true);
        }
      }
    }
  }

  /**
   * Finalize the vision update — any previously Visible tile that is NOT
   * in current vision drops to Explored.
   */
  endUpdate(playerId: number): void {
    const vis = this._playerVisibility.get(playerId);
    const current = this._currentVision.get(playerId);
    if (!vis || !current) return;

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!current.getUnsafe(x, y) && vis.getUnsafe(x, y) === Visibility.Visible) {
          vis.set(x, y, Visibility.Explored);
        }
      }
    }
  }

  /** Get the visibility state of a tile for a player */
  getVisibility(playerId: number, x: number, y: number): Visibility {
    const vis = this._playerVisibility.get(playerId);
    if (!vis) return Visibility.Hidden;
    return vis.get(x, y) ?? Visibility.Hidden;
  }

  /** Check if a tile is currently visible to a player */
  isVisible(playerId: number, x: number, y: number): boolean {
    return this.getVisibility(playerId, x, y) === Visibility.Visible;
  }

  /** Check if a tile has ever been seen by a player */
  isExplored(playerId: number, x: number, y: number): boolean {
    const v = this.getVisibility(playerId, x, y);
    return v === Visibility.Visible || v === Visibility.Explored;
  }

  /** Reveal the entire map for a player (debug/cheat) */
  revealAll(playerId: number): void {
    const vis = this._playerVisibility.get(playerId);
    if (vis) {
      vis.fill(Visibility.Visible);
    }
  }
}
