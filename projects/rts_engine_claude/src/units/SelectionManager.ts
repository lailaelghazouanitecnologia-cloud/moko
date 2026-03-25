/**
 * Selection manager: handles unit selection, control groups,
 * and box selection queries.
 */

import { Entity } from '../core/Entity';
import { World } from '../core/World';
import { EventBus, GameEventType } from '../core/EventBus';
import { Rectangle } from '../math/Rectangle';
import { PositionData, SelectionData, UnitIdentityData } from './UnitComponents';
import { Vector2 } from '../math/Vector2';

export class SelectionManager {
  private readonly _world: World;
  private readonly _eventBus: EventBus;
  /** Control groups: maps group number (1-9) to entity ids */
  private readonly _controlGroups: Map<number, Set<number>> = new Map();

  constructor(world: World, eventBus: EventBus) {
    this._world = world;
    this._eventBus = eventBus;
  }

  /** Select a single unit for a player, deselecting all others */
  selectUnit(entityId: number, playerId: number): void {
    this.deselectAll(playerId);
    const entity = this._world.getEntity(entityId);
    if (!entity) return;

    const identity = entity.getComponent<UnitIdentityData>('UnitIdentity');
    if (!identity || identity.data.playerId !== playerId) return;

    const sel = entity.getComponent<SelectionData>('Selection');
    if (sel && sel.data.selectable) {
      sel.setData({ selected: true });
      this._eventBus.emit({
        type: GameEventType.UnitSelected,
        entityIds: [entityId],
        playerId,
      });
    }
  }

  /** Select multiple units (e.g., from box selection) */
  selectUnits(entityIds: readonly number[], playerId: number): void {
    this.deselectAll(playerId);
    const selectedIds: number[] = [];

    for (const id of entityIds) {
      const entity = this._world.getEntity(id);
      if (!entity) continue;

      const identity = entity.getComponent<UnitIdentityData>('UnitIdentity');
      if (!identity || identity.data.playerId !== playerId) continue;

      const sel = entity.getComponent<SelectionData>('Selection');
      if (sel && sel.data.selectable) {
        sel.setData({ selected: true });
        selectedIds.push(id);
      }
    }

    if (selectedIds.length > 0) {
      this._eventBus.emit({
        type: GameEventType.UnitSelected,
        entityIds: selectedIds,
        playerId,
      });
    }
  }

  /** Deselect all units for a player */
  deselectAll(playerId: number): void {
    const units = this._world.getEntitiesByTag(`player_${playerId}`);
    for (const entity of units) {
      const sel = entity.getComponent<SelectionData>('Selection');
      if (sel && sel.data.selected) {
        sel.setData({ selected: false });
      }
    }
    this._eventBus.emit({
      type: GameEventType.UnitDeselected,
      playerId,
    });
  }

  /** Get all currently selected entities for a player */
  getSelectedEntities(playerId: number): Entity[] {
    return this._world.getEntitiesByTag(`player_${playerId}`).filter((e) => {
      const sel = e.getComponent<SelectionData>('Selection');
      return sel && sel.data.selected;
    });
  }

  /**
   * Box-select: find all player units within a rectangular region.
   */
  boxSelect(rect: Rectangle, playerId: number): number[] {
    const ids: number[] = [];
    const units = this._world.getEntitiesByTag(`player_${playerId}`);

    for (const entity of units) {
      const pos = entity.getComponent<PositionData>('Position');
      const sel = entity.getComponent<SelectionData>('Selection');
      if (!pos || !sel || !sel.data.selectable) continue;

      if (rect.containsPoint(new Vector2(pos.data.x, pos.data.y))) {
        ids.push(entity.id);
      }
    }
    return ids;
  }

  /** Assign selected units to a control group (1-9) */
  assignControlGroup(groupNumber: number, playerId: number): void {
    const selected = this.getSelectedEntities(playerId);
    const groupSet = new Set<number>();

    for (const entity of selected) {
      groupSet.add(entity.id);
      const sel = entity.getComponent<SelectionData>('Selection');
      if (sel) {
        sel.setData({ groupId: groupNumber });
      }
    }

    this._controlGroups.set(groupNumber, groupSet);
  }

  /** Recall a control group — selects all units in the group */
  recallControlGroup(groupNumber: number, playerId: number): void {
    const group = this._controlGroups.get(groupNumber);
    if (!group || group.size === 0) return;

    // Filter out dead/removed entities
    const validIds = Array.from(group).filter((id) => this._world.getEntity(id) !== undefined);
    this.selectUnits(validIds, playerId);
  }
}
