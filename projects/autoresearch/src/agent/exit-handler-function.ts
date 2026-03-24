/**
 * A function that performs cleanup or finalization tasks when the agent is shutting down.
 * May be synchronous or asynchronous.
 * 
 * @example
 * ```ts
 * const handler: ExitHandlerFunction = async () => {
 *   await closeDatabase();
 *   logger.info('Cleanup complete');
 * };
 * ```
 */
export type ExitHandlerFunction = () => Promise<void> | void;

/**
 * Validates that the provided value is a valid ExitHandlerFunction.
 * 
 * @param value - The value to validate.
 * @returns True if the value is a valid ExitHandlerFunction, false otherwise.
 */
export function isExitHandlerFunction(value: unknown): value is ExitHandlerFunction {
  return typeof value === 'function';
}

/**
 * Asserts that the provided value is a valid ExitHandlerFunction.
 * 
 * @param value - The value to assert.
 * @param name - The name of the parameter for error messages.
 * @throws {TypeError} If the value is not a valid ExitHandlerFunction.
 */
export function assertExitHandlerFunction(value: unknown, name = 'handler'): asserts value is ExitHandlerFunction {
  if (!isExitHandlerFunction(value)) {
    throw new TypeError(`${name} must be a function`);
  }
}

/**
 * Executes an exit handler safely, catching and logging any errors.
 * 
 * @param handler - The exit handler to execute.
 * @param logger - Optional logger for error messages.
 * @returns A promise that resolves when the handler has been executed.
 */
export async function executeExitHandler(
  handler: ExitHandlerFunction,
  logger?: { error: (message: string, error?: unknown) => void }
): Promise<void> {
  assertExitHandlerFunction(handler, 'handler');

  try {
    const result = handler();
    if (result && typeof result.then === 'function') {
      await result;
    }
  } catch (error) {
    const message = 'Exit handler threw an error';
    if (logger) {
      logger.error(message, error);
    } else {
      console.error(message, error);
    }
  }
}
