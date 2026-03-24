/**
 * Experiment lifecycle states
 */
export enum Status {
  DRAFT = 'DRAFT',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Check if the provided status represents an active experiment.
 * @param status - The experiment status to evaluate.
 * @returns `true` if the status is `Status.RUNNING`, otherwise `false`.
 * @throws {TypeError} If `status` is not a valid `Status` enum value.
 */
export function isActive(status: Status): boolean {
  validateStatus(status);
  return status === Status.RUNNING;
}

/**
 * Determine whether a transition between two statuses is allowed.
 * @param from - The current status.
 * @param to - The target status.
 * @returns `true` if the transition is valid, otherwise `false`.
 * @throws {TypeError} If either `from` or `to` is not a valid `Status` enum value.
 */
export function canTransition(from: Status, to: Status): boolean {
  validateStatus(from);
  validateStatus(to);

  const transitions: Record<Status, Status[]> = {
    [Status.DRAFT]: [Status.RUNNING, Status.ARCHIVED],
    [Status.RUNNING]: [Status.PAUSED, Status.STOPPED, Status.COMPLETED],
    [Status.PAUSED]: [Status.RUNNING, Status.STOPPED],
    [Status.STOPPED]: [Status.RUNNING, Status.COMPLETED, Status.ARCHIVED],
    [Status.COMPLETED]: [Status.ARCHIVED],
    [Status.ARCHIVED]: []
  };

  return transitions[from]?.includes(to) ?? false;
}

/**
 * Retrieve the list of statuses that can be transitioned to from the given status.
 * @param status - The current status.
 * @returns An array of valid next statuses.
 * @throws {TypeError} If `status` is not a valid `Status` enum value.
 */
export function getNextStates(status: Status): Status[] {
  validateStatus(status);

  const transitions: Record<Status, Status[]> = {
    [Status.DRAFT]: [Status.RUNNING, Status.ARCHIVED],
    [Status.RUNNING]: [Status.PAUSED, Status.STOPPED, Status.COMPLETED],
    [Status.PAUSED]: [Status.RUNNING, Status.STOPPED],
    [Status.STOPPED]: [Status.RUNNING, Status.COMPLETED, Status.ARCHIVED],
    [Status.COMPLETED]: [Status.ARCHIVED],
    [Status.ARCHIVED]: []
  };

  return transitions[status] ?? [];
}

/**
 * Validate that a value is a valid `Status` enum member.
 * @param value - The value to validate.
 * @throws {TypeError} If `value` is not a valid `Status`.
 * @private
 */
function validateStatus(value: unknown): asserts value is Status {
  if (!Object.values(Status).includes(value as Status)) {
    throw new TypeError(`Invalid status: ${value}`);
  }
}
