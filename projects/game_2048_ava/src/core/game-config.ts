/**
 * Holds global game settings.
 */
export class GameConfig {
  readonly boardWidth: number;
  readonly boardHeight: number;
  readonly tickIntervalMs: number;
  readonly maxPlayers: number;

  constructor(
    boardWidth: number,
    boardHeight: number,
    tickIntervalMs: number,
    maxPlayers: number
  ) {
    if (!Number.isInteger(boardWidth) || boardWidth <= 0) {
      throw new RangeError('boardWidth must be a positive integer');
    }
    if (!Number.isInteger(boardHeight) || boardHeight <= 0) {
      throw new RangeError('boardHeight must be a positive integer');
    }
    if (!Number.isInteger(tickIntervalMs) || tickIntervalMs <= 0) {
      throw new RangeError('tickIntervalMs must be a positive integer');
    }
    if (!Number.isInteger(maxPlayers) || maxPlayers <= 0) {
      throw new RangeError('maxPlayers must be a positive integer');
    }

    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
    this.tickIntervalMs = tickIntervalMs;
    this.maxPlayers = maxPlayers;
  }

  /**
   * Check config validity.
   * @returns true if all values are positive integers
   */
  validate(): boolean {
    return (
      this.boardWidth > 0 &&
      this.boardHeight > 0 &&
      this.tickIntervalMs > 0 &&
      this.maxPlayers > 0
    );
  }

  /**
   * Serialize settings to JSON string.
   * @returns JSON representation of the config
   */
  toJSON(): string {
    return JSON.stringify({
      boardWidth: this.boardWidth,
      boardHeight: this.boardHeight,
      tickIntervalMs: this.tickIntervalMs,
      maxPlayers: this.maxPlayers
    });
  }

  /**
   * Deserialize settings from JSON string.
   * @param json - JSON string to parse
   * @returns new GameConfig instance
   */
  static fromJSON(json: string): GameConfig {
    if (typeof json !== 'string') {
      throw new TypeError('json must be a string');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new TypeError('Invalid JSON string');
    }
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('boardWidth' in parsed) ||
      !('boardHeight' in parsed) ||
      !('tickIntervalMs' in parsed) ||
      !('maxPlayers' in parsed)
    ) {
      throw new TypeError('JSON does not contain required fields');
    }
    const { boardWidth, boardHeight, tickIntervalMs, maxPlayers } = parsed as {
      boardWidth: unknown;
      boardHeight: unknown;
      tickIntervalMs: unknown;
      maxPlayers: unknown;
    };
    return new GameConfig(
      Number(boardWidth),
      Number(boardHeight),
      Number(tickIntervalMs),
      Number(maxPlayers)
    );
  }

  /**
   * Create a deep copy of the config.
   * @returns new GameConfig instance with identical values
   */
  clone(): GameConfig {
    return new GameConfig(
      this.boardWidth,
      this.boardHeight,
      this.tickIntervalMs,
      this.maxPlayers
    );
  }

  /**
   * Apply partial overrides to create a new config.
   * @param partial - subset of fields to override
   * @returns new GameConfig instance with merged values
   */
  merge(partial: Partial<GameConfig>): GameConfig {
    if (partial === null || typeof partial !== 'object') {
      throw new TypeError('partial must be a Partial<GameConfig>');
    }
    const {
      boardWidth,
      boardHeight,
      tickIntervalMs,
      maxPlayers
    } = partial as Partial<{
      boardWidth: unknown;
      boardHeight: unknown;
      tickIntervalMs: unknown;
      maxPlayers: unknown;
    }>;
    return new GameConfig(
      boardWidth !== undefined ? Number(boardWidth) : this.boardWidth,
      boardHeight !== undefined ? Number(boardHeight) : this.boardHeight,
      tickIntervalMs !== undefined
        ? Number(tickIntervalMs)
        : this.tickIntervalMs,
      maxPlayers !== undefined ? Number(maxPlayers) : this.maxPlayers
    );
  }
}
