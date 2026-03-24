export enum AssignmentStatus {
  PENDING = 0,
  COMPLETED = 1,
  CANCELLED = 2
}

/**
 * Utility class for working with AssignmentStatus enum values.
 */
export class AssignmentStatusUtil {
  private static readonly STATUS_MAP: Map<number, string> = new Map([
    [AssignmentStatus.PENDING, 'PENDING'],
    [AssignmentStatus.COMPLETED, 'COMPLETED'],
    [AssignmentStatus.CANCELLED, 'CANCELLED']
  ]);

  private static readonly REVERSE_STATUS_MAP: Map<string, number> = new Map([
    ['PENDING', AssignmentStatus.PENDING],
    ['COMPLETED', AssignmentStatus.COMPLETED],
    ['CANCELLED', AssignmentStatus.CANCELLED]
  ]);

  /**
   * Converts a numeric status value to its string representation.
   * @param status The numeric AssignmentStatus value.
   * @returns The string name of the status.
   * @throws {Error} If the provided status is not a valid AssignmentStatus value.
   */
  public static toString(status: number): string {
    if (!AssignmentStatusUtil.isValid(status)) {
      throw new Error(`Invalid AssignmentStatus value: ${status}`);
    }
    return AssignmentStatusUtil.STATUS_MAP.get(status)!;
  }

  /**
   * Converts a string status name to its numeric AssignmentStatus value.
   * @param name The string name of the status.
   * @returns The numeric AssignmentStatus value.
   * @throws {Error} If the provided name is not a valid AssignmentStatus name.
   */
  public static fromString(name: string): number {
    if (!name || typeof name !== 'string') {
      throw new Error('Status name must be a non-empty string');
    }
    const upperName = name.toUpperCase();
    if (!AssignmentStatusUtil.REVERSE_STATUS_MAP.has(upperName)) {
      throw new Error(`Invalid AssignmentStatus name: ${name}`);
    }
    return AssignmentStatusUtil.REVERSE_STATUS_MAP.get(upperName)!;
  }

  /**
   * Checks if a given numeric value is a valid AssignmentStatus.
   * @param value The value to check.
   * @returns True if the value is a valid AssignmentStatus, false otherwise.
   */
  public static isValid(value: number): boolean {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return false;
    }
    return AssignmentStatusUtil.STATUS_MAP.has(value);
  }

  /**
   * Returns an array of all AssignmentStatus numeric values.
   * @returns An array of all status values.
   */
  public static getAllValues(): number[] {
    return Array.from(AssignmentStatusUtil.STATUS_MAP.keys());
  }

  /**
   * Returns an array of all AssignmentStatus string names.
   * @returns An array of all status names.
   */
  public static getAllNames(): string[] {
    return Array.from(AssignmentStatusUtil.STATUS_MAP.values());
  }

  /**
   * Returns a human-readable label for a given AssignmentStatus value.
   * @param status The numeric AssignmentStatus value.
   * @returns A human-readable label.
   * @throws {Error} If the provided status is not a valid AssignmentStatus value.
   */
  public static getLabel(status: number): string {
    const name = AssignmentStatusUtil.toString(status);
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  /**
   * Checks if the status represents a final state (COMPLETED or CANCELLED).
   * @param status The numeric AssignmentStatus value.
   * @returns True if the status is final, false otherwise.
   * @throws {Error} If the provided status is not a valid AssignmentStatus value.
   */
  public static isFinal(status: number): boolean {
    return status === AssignmentStatus.COMPLETED || status === AssignmentStatus.CANCELLED;
  }

  /**
   * Checks if the status represents a pending state.
   * @param status The numeric AssignmentStatus value.
   * @returns True if the status is pending, false otherwise.
   * @throws {Error} If the provided status is not a valid AssignmentStatus value.
   */
  public static isPending(status: number): boolean {
    return status === AssignmentStatus.PENDING;
  }
}
