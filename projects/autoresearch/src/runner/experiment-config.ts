/**
 * Configuration for experiment execution.
 * @interface
 */
export interface ExperimentConfig {
  /**
   * Maximum duration (in seconds) the experiment is allowed to run.
   * Must be a positive finite number.
   */
  duration: number;

  /**
   * Shell command to execute.
   * Must be non-empty after trimming.
   */
  command: string;

  /**
   * Arguments passed to the command.
   * Each argument must be a non-empty string.
   */
  args: string[];

  /**
   * Absolute or relative path to the working directory for the command.
   * Must be non-empty after trimming.
   */
  workingDir: string;

  /**
   * Environment variables injected into the command context.
   * Keys must be valid POSIX environment variable names.
   * Values are coerced to strings.
   */
  env: Record<string, string>;

  /**
   * Maximum number of automatic retries on non-zero exit.
   * Must be an integer ≥ 0.
   */
  maxRetries: number;
}

/**
 * Validates an {@link ExperimentConfig} object.
 * @param config - The configuration object to validate.
 * @throws {TypeError} If any field is invalid.
 */
export function validateExperimentConfig(config: unknown): asserts config is ExperimentConfig {
  if (typeof config !== 'object' || config === null) {
    throw new TypeError('ExperimentConfig must be a non-null object');
  }

  const c = config as Record<string, unknown>;

  // duration
  if (typeof c.duration !== 'number' || !Number.isFinite(c.duration) || c.duration <= 0) {
    throw new TypeError('duration must be a positive finite number');
  }

  // command
  if (typeof c.command !== 'string' || c.command.trim().length === 0) {
    throw new TypeError('command must be a non-empty string');
  }

  // args
  if (!Array.isArray(c.args)) {
    throw new TypeError('args must be an array');
  }
  for (let i = 0; i < c.args.length; i++) {
    if (typeof c.args[i] !== 'string' || (c.args[i] as string).trim().length === 0) {
      throw new TypeError(`args[${i}] must be a non-empty string`);
    }
  }

  // workingDir
  if (typeof c.workingDir !== 'string' || c.workingDir.trim().length === 0) {
    throw new TypeError('workingDir must be a non-empty string');
  }

  // env
  if (typeof c.env !== 'object' || c.env === null) {
    throw new TypeError('env must be a non-null object');
  }
  for (const [k, v] of Object.entries(c.env)) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) {
      throw new TypeError(`env key "${k}" is not a valid POSIX environment variable name`);
    }
    if (typeof v !== 'string') {
      (c.env as Record<string, string>)[k] = String(v);
    }
  }

  // maxRetries
  if (typeof c.maxRetries !== 'number' || !Number.isInteger(c.maxRetries) || c.maxRetries < 0) {
    throw new TypeError('maxRetries must be a non-negative integer');
  }
}

/**
 * Creates a sanitized copy of {@link ExperimentConfig}.
 * @param config - The configuration to clone.
 * @returns A new validated configuration object.
 * @throws {TypeError} If validation fails.
 */
export function sanitizeExperimentConfig(config: unknown): ExperimentConfig {
  validateExperimentConfig(config);
  return {
    duration: config.duration,
    command: config.command.trim(),
    args: config.args.map((a) => a.trim()),
    workingDir: config.workingDir.trim(),
    env: { ...config.env },
    maxRetries: config.maxRetries,
  };
}
