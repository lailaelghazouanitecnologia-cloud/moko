/**
 * Outcome of a completed experiment.
 */
export interface ExperimentResult {
  /**
   * Whether the experiment completed successfully.
   */
  success: boolean;

  /**
   * Exit code returned by the experiment process.
   * 0 typically indicates success, non-zero indicates failure.
   */
  exitCode: number;

  /**
   * Signal that terminated the experiment process, if any.
   * Empty string if the process exited normally.
   */
  signal: string;

  /**
   * Duration in milliseconds that the experiment took to complete.
   * Must be non-negative.
   */
  duration: number;

  /**
   * Whether the experiment was terminated due to a timeout.
   */
  timeout: boolean;

  /**
   * Error object if the experiment failed with an error, null otherwise.
   */
  error: Error | null;
}

/**
 * Validates an ExperimentResult object.
 * @param result - The ExperimentResult to validate.
 * @throws {TypeError} If any field has an invalid type.
 * @throws {RangeError} If duration is negative.
 */
export function validateExperimentResult(result: ExperimentResult): void {
  if (typeof result.success !== 'boolean') {
    throw new TypeError('Field "success" must be a boolean');
  }
  if (typeof result.exitCode !== 'number') {
    throw new TypeError('Field "exitCode" must be a number');
  }
  if (typeof result.signal !== 'string') {
    throw new TypeError('Field "signal" must be a string');
  }
  if (typeof result.duration !== 'number') {
    throw new TypeError('Field "duration" must be a number');
  }
  if (result.duration < 0) {
    throw new RangeError('Field "duration" must be non-negative');
  }
  if (typeof result.timeout !== 'boolean') {
    throw new TypeError('Field "timeout" must be a boolean');
  }
  if (result.error !== null && !(result.error instanceof Error)) {
    throw new TypeError('Field "error" must be an Error instance or null');
  }
}

/**
 * Creates a new ExperimentResult with default values.
 * @param overrides - Partial object to override defaults.
 * @returns A new ExperimentResult instance.
 */
export function createExperimentResult(overrides: Partial<ExperimentResult> = {}): ExperimentResult {
  const defaults: ExperimentResult = {
    success: false,
    exitCode: -1,
    signal: '',
    duration: 0,
    timeout: false,
    error: null,
  };
  const result = { ...defaults, ...overrides };
  validateExperimentResult(result);
  return result;
}

/**
 * Checks if the experiment result indicates a timeout.
 * @param result - The ExperimentResult to check.
 * @returns True if the experiment timed out.
 */
export function isTimeout(result: ExperimentResult): boolean {
  validateExperimentResult(result);
  return result.timeout;
}

/**
 * Checks if the experiment result indicates success.
 * @param result - The ExperimentResult to check.
 * @returns True if the experiment succeeded.
 */
export function isSuccess(result: ExperimentResult): boolean {
  validateExperimentResult(result);
  return result.success;
}

/**
 * Checks if the experiment result indicates failure.
 * @param result - The ExperimentResult to check.
 * @returns True if the experiment failed.
 */
export function isFailure(result: ExperimentResult): boolean {
  validateExperimentResult(result);
  return !result.success;
}

/**
 * Serializes an ExperimentResult to a JSON string.
 * @param result - The ExperimentResult to serialize.
 * @returns JSON string representation.
 */
export function serializeExperimentResult(result: ExperimentResult): string {
  validateExperimentResult(result);
  return JSON.stringify(result);
}

/**
 * Deserializes a JSON string into an ExperimentResult.
 * @param json - The JSON string to deserialize.
 * @returns The parsed ExperimentResult.
 * @throws {SyntaxError} If the JSON is invalid.
 * @throws {TypeError} If the parsed object is not a valid ExperimentResult.
 */
export function deserializeExperimentResult(json: string): ExperimentResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new SyntaxError('Invalid JSON string');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new TypeError('Parsed value is not an object');
  }
  const obj = parsed as Record<string, unknown>;
  const result: ExperimentResult = {
    success: Boolean(obj.success),
    exitCode: Number(obj.exitCode),
    signal: String(obj.signal),
    duration: Number(obj.duration),
    timeout: Boolean(obj.timeout),
    error: obj.error instanceof Error ? obj.error : null,
  };
  validateExperimentResult(result);
  return result;
}
