/**
 * Player state management.
 * Tracks player identity, status, and statistics.
 */

export enum PlayerStatus {
  Active = 'Active',
  Defeated = 'Defeated',
  Victorious = 'Victorious',
  Disconnected = 'Disconnected',
}

export enum PlayerType {
  Human = 'Human',
  AI = 'AI',
  Observer = 'Observer',
}

export interface PlayerStats {
  unitsProduced: number;
  unitsLost: number;
  unitsKilled: number;
  buildingsConstructed: number;
  buildingsLost: number;
  resourcesGathered: number;
  resourcesSpent: number;
}

export class Player {
  public readonly id: number;
  public readonly name: string;
  public readonly playerType: PlayerType;
  private _status: PlayerStatus;
  private _teamId: number;
  private readonly _stats: PlayerStats;

  constructor(id: number, name: string, playerType: PlayerType, teamId: number = id) {
    this.id = id;
    this.name = name;
    this.playerType = playerType;
    this._status = PlayerStatus.Active;
    this._teamId = teamId;
    this._stats = {
      unitsProduced: 0,
      unitsLost: 0,
      unitsKilled: 0,
      buildingsConstructed: 0,
      buildingsLost: 0,
      resourcesGathered: 0,
      resourcesSpent: 0,
    };
  }

  get status(): PlayerStatus {
    return this._status;
  }

  set status(value: PlayerStatus) {
    this._status = value;
  }

  get teamId(): number {
    return this._teamId;
  }

  get stats(): Readonly<PlayerStats> {
    return this._stats;
  }

  get isActive(): boolean {
    return this._status === PlayerStatus.Active;
  }

  /** Increment a stat counter */
  incrementStat(stat: keyof PlayerStats, amount: number = 1): void {
    this._stats[stat] += amount;
  }

  /** Serialize player state */
  serialize(): object {
    return {
      id: this.id,
      name: this.name,
      playerType: this.playerType,
      status: this._status,
      teamId: this._teamId,
      stats: { ...this._stats },
    };
  }
}
