/**
 * Constants for agent status.
 *
 * @remarks
 * This class provides immutable string constants that represent the possible
 * states an agent can be in.  Use these constants instead of hard-coded strings
 * to ensure type safety and maintainability.
 *
 * @example
 * ```ts
 * if (agent.status === AgentStatus.ACTIVE) {
 *   // handle active agent
 * }
 * ```
 */
export class AgentStatus {
  static readonly ACTIVE = 'active';

  static readonly IDLE = 'idle';

  static readonly WAITING = 'waiting';

  /**
   * Collection of all valid status strings.
   * @internal
   */
  private static readonly STATUSES: ReadonlyArray<string> = [
    AgentStatus.ACTIVE,
    AgentStatus.IDLE,
    AgentStatus.WAITING,
  ];

  private constructor() {
    // Utility class; do not instantiate.
  }

  /**
   * Validates whether a given value is a known agent status.
   *
   * @param value - The value to validate.
   * @returns `true` if the value is one of the defined status constants.
   *
   * @example
   * ```ts
   * AgentStatus.isValid('active'); // true
   * AgentStatus.isValid('unknown'); // false
   * ```
   */
  static isValid(value: unknown): value is AgentStatus {
    return typeof value === 'string' && AgentStatus.STATUSES.includes(value);
  }

  /**
   * Asserts that a given value is a valid agent status.
   *
   * @param value - The value to check.
   * @param name - The name of the variable to include in the error message.
   * @throws {TypeError} If the value is not a valid agent status.
   *
   * @example
   * ```ts
   * AgentStatus.assertValid('active', 'status'); // OK
   * AgentStatus.assertValid('unknown', 'status'); // throws TypeError
   * ```
   */
  static assertValid(value: unknown, name = 'value'): asserts value is AgentStatus {
    if (!AgentStatus.isValid(value)) {
      throw new TypeError(
        `${name} must be one of ${AgentStatus.STATUSES.join(', ')}`
      );
    }
  }
}
