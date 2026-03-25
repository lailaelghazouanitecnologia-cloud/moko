class Position {
  constructor(
    public readonly x: number,
    public readonly y: number
  ) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new TypeError('Position coordinates must be finite numbers');
    }
  }

  /**
   * Creates a new Position by adding another position to this one.
   * @param other Position to add
   * @returns New Position instance
   * @throws TypeError if other is not a valid Position
   */
  add(other: Position): Position {
    if (!(other instanceof Position)) {
      throw new TypeError('add requires a valid Position instance');
    }
    return new Position(this.x + other.x, this.y + other.y);
  }

  /**
   * Creates a new Position by subtracting another position from this one.
     * @param other Position to subtract
   * @returns New Position instance
   * @throws TypeError if other is not a valid Position
   */
  subtract(other: Position): Position {
    if (!(other instanceof Position)) {
      throw new TypeError('subtract requires a valid Position instance');
    }
    return new Position(this.x - other.x, this.y - other.y);
  }

  /**
   * Compares this position with another for equality.
   * @param other Position to compare
   * @returns true if both coordinates match
   */
  equals(other: Position): boolean {
    if (!(other instanceof Position)) {
      return false;
    }
    return this.x === other.x && this.y === other.y;
  }

  /**
   * Calculates the Manhattan distance to another position.
   * @param other Target position
   * @returns Manhattan distance
   * @throws TypeError if other is not a valid Position
   */
  distance(other: Position): number {
    if (!(other instanceof Position)) {
      throw new TypeError('distance requires a valid Position instance');
    }
    return Math.abs(this.x - other.x) + Math.abs(this.y - other.y);
  }

  /**
   * Creates an independent copy of this position.
   * @read5 New Position instance with identical coordinates
   */
  clone(): Position {
    return new Position(this.x, this.y);
  }

  /**
   * Returns a concise string representation of this position.
   * @returns Formatted string
   */
  toString(): string {
    return `Position(${this.x}, ${this.y})`;
  }
}
