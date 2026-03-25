/**
 * Win condition evaluators.
 * Checks game state to determine if any player has won or lost.
 */

import { World } from '../core/World';
import { Player, PlayerStatus } from './Player';
import { BuildingIdentityData } from '../buildings/BuildingComponents';
import { UnitIdentityData } from '../units/UnitComponents';

/** Result of a win condition check */
export interface WinConditionResult {
  readonly gameOver: boolean;
  readonly winnerId: number | null;
  readonly reason: string;
}

/** Check function signature */
export type WinConditionCheck = (
  world: World,
  players: readonly Player[],
) => WinConditionResult;

/**
 * Elimination: a player loses when they have no buildings AND no units.
 * Last team standing wins.
 */
export function checkElimination(world: World, players: readonly Player[]): WinConditionResult {
  const activePlayers = players.filter((p) => p.isActive);
  if (activePlayers.length <= 1) {
    return {
      gameOver: activePlayers.length <= 1,
      winnerId: activePlayers[0]?.id ?? null,
      reason: activePlayers.length === 0 ? 'Draw - all players eliminated' : 'Last player standing',
    };
  }

  // Check each active player for elimination
  for (const player of activePlayers) {
    const hasUnits = world.getEntitiesByTag(`player_${player.id}`).some(
      (e) => e.hasTag('unit') && e.active
    );
    const hasBuildings = world.getEntitiesByTag(`player_${player.id}`).some(
      (e) => e.hasTag('building') && e.active
    );

    if (!hasUnits && !hasBuildings) {
      // This player is eliminated
      player.status = PlayerStatus.Defeated;
    }
  }

  // Check if only one team remains
  const remainingPlayers = players.filter((p) => p.isActive);
  const remainingTeams = new Set(remainingPlayers.map((p) => p.teamId));

  if (remainingTeams.size === 1) {
    const winningTeam = Array.from(remainingTeams)[0];
    const winner = remainingPlayers.find((p) => p.teamId === winningTeam);
    return {
      gameOver: true,
      winnerId: winner?.id ?? null,
      reason: 'All enemy players eliminated',
    };
  }

  return { gameOver: false, winnerId: null, reason: '' };
}

/**
 * Town Center destruction: lose when your last Town Center is destroyed.
 */
export function checkTownCenterDestruction(
  world: World,
  players: readonly Player[],
): WinConditionResult {
  const activePlayers = players.filter((p) => p.isActive);

  for (const player of activePlayers) {
    const buildings = world.getEntitiesByTag('building').filter((b) => {
      const identity = b.getComponent<BuildingIdentityData>('BuildingIdentity');
      return identity && identity.data.playerId === player.id;
    });

    const hasTownCenter = buildings.some((b) => {
      const identity = b.getComponent<BuildingIdentityData>('BuildingIdentity');
      return identity && identity.data.buildingType === 'TownCenter' && b.active;
    });

    if (!hasTownCenter) {
      player.status = PlayerStatus.Defeated;
    }
  }

  const remaining = players.filter((p) => p.isActive);
  if (remaining.length === 1) {
    return {
      gameOver: true,
      winnerId: remaining[0].id,
      reason: 'Last player with a Town Center',
    };
  }

  if (remaining.length === 0) {
    return { gameOver: true, winnerId: null, reason: 'Draw - all Town Centers destroyed' };
  }

  return { gameOver: false, winnerId: null, reason: '' };
}
