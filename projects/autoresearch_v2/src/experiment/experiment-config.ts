// Define missing validation functions
function validateExperimentName(name: string): boolean {
  return typeof name === 'string' && name.trim().length > 0;
}

function validateParameters(params: Record<string, unknown>): boolean {
  return params !== null && typeof params === 'object';
}

function validateMetrics(metrics: string[]): boolean {
  return Array.isArray(metrics) && metrics.every(m => typeof m === 'string');
}

// Define missing ExperimentError class
class ExperimentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExperimentError';
  }
}

/**
 * Configuration for an experiment.
 */
export interface ExperimentConfigData {
  /** Unique name for the experiment */
  name: string;
  /** Optional description of the experiment */
  description?: string;
  /** Number of iterations to run */
  iterations: number;
  /** Timeout in milliseconds */
  timeout: number;
  /** Parameters for the experiment */
  parameters: Record<string, unknown>;
  /** Metrics to collect */
  metrics: string[];
  /** Optional metadata for the experiment */
  metadata?: Record<string, unknown>;
}

/**
 * Manages experiment configuration with validation, serialization, and immutability features.
 */
export class ExperimentConfig {
  private name: string;
  private description?: string;
  private iterations: number;
  private timeout: number;
  private parameters: Record<string, unknown>;
  private metrics: string[];
  private metadata?: Record<string, unknown>;

  /**
   * Creates a new ExperimentConfig instance.
   * @param config - The configuration data
   * @throws {ExperimentError} If validation fails
   */
  constructor(config: ExperimentConfigData) {
    this.validateConfig(config);
    
    this.name = config.name.trim();
    this.description = config.description?.trim();
    this.iterations = config.iterations;
    this.timeout = config.timeout;
    this.parameters = { ...config.parameters };
    this.metrics = [...config.metrics];
    this.metadata = config.metadata ? { ...config.metadata } : undefined;
  }

  /**
   * Gets the experiment name.
   * @returns The experiment name
   */
  getName(): string {
    return this.name;
  }

  /**
   * Gets the experiment description.
   * @returns The description or undefined if not set
   */
  getDescription(): string | undefined {
    return this.description;
  }

  /**
   * Gets the number of iterations.
   * @returns The iteration count
   */
  getIterations(): number {
    return this.iterations;
  }

  /**
   * Gets the timeout in milliseconds.
   * @returns The timeout value
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * Gets the experiment parameters.
   * @returns A copy of the parameters object
   */
  getParameters(): Record<string, unknown> {
    return { ...this.parameters };
  }

  /**
   * Gets the metrics to collect.
   * @returns A copy of the metrics array
   */
  getMetrics(): string[] {
    return [...this.metrics];
  }

  /**
   * Gets the metadata.
   * @returns A copy of the metadata or undefined
   */
  getMetadata(): Record<string, unknown> | undefined {
    return this.metadata ? { ...this.metadata } : undefined;
  }

  /**
   * Sets the experiment name.
   * @param name - The new name
   * @throws {ExperimentError} If name is invalid
   */
  setName(name: string): void {
    if (!validateExperimentName(name)) {
      throw new ExperimentError('Invalid experiment name');
    }
    this.name = name.trim();
  }

  /**
   * Sets the experiment description.
   * @param description - The new description
   */
  setDescription(description: string): void {
    this.description = description?.trim();
  }

  /**
   * Sets the number of iterations.
   * @param iterations - The new iteration count
   * @throws {ExperimentError} If iterations is not positive
   */
  setIterations(iterations: number): void {
    if (!Number.isInteger(iterations) || iterations <= 0) {
      throw new ExperimentError('Iterations must be a positive integer');
    }
    this.iterations = iterations;
  }

  /**
   * Sets the timeout.
   * @param timeout - The new timeout in milliseconds
   * @throws {ExperimentError} If timeout is not positive
   */
  setTimeout(timeout: number): void {
    if (!Number.isInteger(timeout) || timeout <= 0) {
      throw new ExperimentError('Timeout must be a positive integer');
    }
    this.timeout = timeout;
  }

  /**
   * Sets the parameters.
   * @param parameters - The new parameters object
   * @throws {ExperimentError} If parameters are invalid
   */
  setParameters(parameters: Record<string, unknown>): void {
    if (!validateParameters(parameters)) {
      throw new ExperimentError('Invalid parameters format');
    }
    this.parameters = { ...parameters };
  }

  /**
   * Sets the metrics.
   * @param metrics - The new metrics array
   * @throws {ExperimentError} If metrics are invalid
   */
  setMetrics(metrics: string[]): void {
    if (!validateMetrics(metrics)) {
      throw new ExperimentError('Invalid metrics format');
    }
    this.metrics = [...metrics];
  }

  /**
   * Sets the metadata.
   * @param metadata - The new metadata object
   */
  setMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...metadata };
  }

  /**
   * Validates the current configuration.
   * @returns true if valid, throws otherwise
   * @throws {ExperimentError} If validation fails
   */
  validate(): boolean {
    const config: ExperimentConfigData = {
      name: this.name,
      description: this.description,
      iterations: this.iterations,
      timeout: this.timeout,
      parameters: this.parameters,
      metrics: this.metrics,
      metadata: this.metadata
    };
    
    this.validateConfig(config);
    return true;
  }

  /**
   * Serializes the configuration to JSON string.
   * @returns The JSON representation
   */
  toJSON(): string {
    return JSON.stringify({
      name: this.name,
      description: this.description,
      iterations: this.iterations,
      timeout: this.timeout,
      parameters: this.parameters,
      metrics: this.metrics,
      metadata: this.metadata
    });
  }

  /**
   * Deserializes from JSON string.
   * @param json - The JSON string
   * @returns A new ExperimentConfig instance
   * @throws {ExperimentError} If JSON is invalid or validation fails
   */
  static fromJSON(json: string): ExperimentConfig {
    try {
      const parsed = JSON.parse(json);
      return new ExperimentConfig({
        name: parsed.name,
        description: parsed.description,
        iterations: parsed.iterations,
        timeout: parsed.timeout,
        parameters: parsed.parameters,
        metrics: parsed.metrics,
        metadata: parsed.metadata
      });
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ExperimentError('Invalid JSON format');
      }
      throw error;
    }
  }

  /**
   * Creates a deep copy of this configuration.
   * @returns A new ExperimentConfig instance
   */
  clone(): ExperimentConfig {
    return new ExperimentConfig({
      name: this.name,
      description: this.description,
      iterations: this.iterations,
      timeout: this.timeout,
      parameters: { ...this.parameters },
      metrics: [...this.metrics],
      metadata: this.metadata ? { ...this.metadata } : undefined
    });
  }

  /**
   * Merg another configuration into this one.
   * @param other - Partial configuration to merge
   * @returns A new ExperimentConfig instance
   */
  merge(other: Partial<ExperimentConfigData>): ExperimentConfig {
    const merged: ExperimentConfigData = {
      name: other.name ?? this.name,
      description: other.description ?? this.description,
      iterations: other.iterations ?? this.iterations,
      timeout: other.timeout ?? this.timeout,
      parameters: { ...this.parameters, ...other.parameters },
      metrics: other.metrics ?? this.metrics,
      metadata: { ...this.metadata, ...other.metadata }
    };
    
    return new ExperimentConfig(merged);
  }

  /**
   * Validates configuration data.
   * @param config - The configuration to validate
   * @throws {ExperimentError} If validation fails
   */
  private validateConfig(config: ExperimentConfigData): void {
    if (!validateExperimentName(config.name)) {
      throw new ExperimentError('Invalid experiment name');
    }
    
    if (!Number.isInteger(config.iterations) || config.iterations <= 0) {
      throw new ExperimentError('Iterations must be a positive integer');
    }
    
    if (!Number.isInteger(config.timeout) || config.timeout <= 0) {
      throw new ExperimentError('Timeout must be a positive integer');
    }
    
    if (!validateMetrics(config.metrics)) {
      throw new ExperimentError('Invalid metrics format');
    }
    
    if (!validateParameters(config.parameters)) {
      throw new ExperimentError('Invalid parameters format');
    }
  }
}
