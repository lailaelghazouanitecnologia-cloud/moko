import { MetricRegistry } from '../metrics';
import { Metric } from '../metrics/metric-registry';

export interface ExperimentMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  duration: number;
  samplesProcessed: number;
}

export interface ExperimentMetadata {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  parameters: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Represents the result of an experiment, encapsulating metrics, metadata, and raw data.
 * Provides functionality for metric tracking, result merging, and serialization.
 */
export class ExperimentResult {
  private metrics: ExperimentMetrics;
  private metadata: ExperimentMetadata;
  private rawData: Record<string, unknown>[];
  private registry: MetricRegistry;

  /**
   * Creates an instance of ExperimentResult.
   * @param metrics - The experiment metrics
   * @param metadata - The experiment metadata
   * @param rawData - Optional raw data associated with the experiment
   * @throws {Error} If metrics or metadata are invalid
   */
  constructor(
    metrics: ExperimentMetrics,
    metadata: ExperimentMetadata,
    rawData: Record<string, unknown>[] = []
  ) {
    this.validateConstructorInputs(metrics, metadata, rawData);
    this.metrics = { ...metrics };
    this.metadata = { ...metadata };
    this.rawData = [...rawData];
    this.registry = new MetricRegistry();
  }

  /**
   * Gets a copy of the experiment metrics
   * @returns The experiment metrics
   */
  getMetrics(): ExperimentMetrics {
    return { ...this.metrics };
  }

  /**
   * Gets a copy of the experiment metadata
   * @returns The experiment metadata
   */
  getMetadata(): ExperimentMetadata {
    return { ...this.metadata };
  }

  /**
   * Gets a copy of the raw data
   * @returns The raw data array
   */
  getRawData(): Record<string, unknown>[] {
    return [...this.rawData];
  }

  /**
   * Adds a custom metric to the registry
   * @param name - The name of the metric
   * @param value - The value of the metric
   * @param metadata - Optional metadata for the metric
   * @throws {Error} If name is empty or value is not a finite number
   */
  addMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Metric name must be a non-empty string');
    }
    if (!Number.isFinite(value)) {
      throw new Error('Metric value must be a finite number');
    }

    this.registry.register({
      name,
      value,
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * Gets the latest value of a metric by name
   * @param name - The name of the metric
   * @returns The latest value or undefined if not found
   */
  getMetric(name: string): number | undefined {
    if (!name || typeof name !== 'string') {
      return undefined;
    }
    const metric = this.registry.getLatest(name);
    return metric ? metric.value : undefined;
  }

  /**
   * Gets all metrics from the registry
   * @returns A map of metric names to metric arrays
   */
  getAllMetrics(): Map<string, Metric[]> {
    return this.registry.getAll();
  }

  /**
   * Marks the experiment as completed by setting the completedAt timestamp
   */
  setCompleted(): void {
    this.metadata.completedAt = new Date();
  }

  /**
   * Checks if the experiment is completed
   * @returns True if completed, false otherwise
   */
  isCompleted(): boolean {
    return this.metadata.completedAt !== undefined;
  }

  /**
   * Gets the duration of the experiment in milliseconds
   * @returns The duration in milliseconds
   */
  getDuration(): number {
    if (!this.metadata.completedAt) {
      return Date.now() - this.metadata.startedAt.getTime();
    }
    return this.metadata.completedAt.getTime() - this.metadata.startedAt.getTime();
  }

  /**
   * Serializes the experiment result to JSON
   * @returns The JSON string representation
   * @throws {Error} If serialization fails
   */
  toJSON(): string {
    try {
      return JSON.stringify({
        metrics: this.metrics,
        metadata: this.metadata,
        rawData: this.rawData,
        registryMetrics: Array.from(this.registry.getAll().entries())
      });
    } catch (error) {
      throw new Error(`Failed to serialize experiment result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates an ExperimentResult from a JSON string
   * @param json - The JSON string to parse
   * @returns A new ExperimentResult instance
   * @throws {Error} If JSON is invalid or missing required fields
   */
  static fromJSON(json: string): ExperimentResult {
    try {
      const parsed = JSON.parse(json);
      
      if (!parsed.metrics || !parsed.metadata) {
        throw new Error('Missing required fields: metrics or metadata');
      }

      const result = new ExperimentResult(
        parsed.metrics,
        parsed.metadata,
        parsed.rawData || []
      );
      
      if (parsed.registryMetrics) {
        for (const [name, metrics] of parsed.registryMetrics) {
          for (const metric of metrics) {
            result.addMetric(metric.name, metric.value, metric.metadata);
          }
        }
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to parse experiment result from JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates a deep clone of the experiment result
   * @returns A new ExperimentResult instance with copied data
   */
  clone(): ExperimentResult {
    const cloned = new ExperimentResult(
      { ...this.metrics },
      { ...this.metadata },
      [...this.rawData]
    );
    
    // Clone registry metrics
    const allMetrics = this.registry.getAll();
    for (const [name, metrics] of allMetrics) {
      for (const metric of metrics) {
        cloned.addMetric(metric.name, metric.value, metric.metadata);
      }
    }
    
    return cloned;
  }

  /**
   * Merges another experiment result into this one
   * @param other - The other experiment result to merge
   * @returns A new ExperimentResult representing the merged results
   * @throws {Error} If other is not a valid ExperimentResult
   */
  merge(other: ExperimentResult): ExperimentResult {
    if (!other || !(other instanceof ExperimentResult)) {
      throw new Error('Cannot merge with invalid ExperimentResult');
    }

    const mergedMetrics: ExperimentMetrics = {
      accuracy: (this.metrics.accuracy + other.metrics.accuracy) / 2,
      precision: (this.metrics.precision + other.metrics.precision) / 2,
      recall: (this.metrics.recall + other.metrics.recall) / 2,
      f1Score: (this.metrics.f1Score + other.metrics.f1Score) / 2,
      duration: this.metrics.duration + other.metrics.duration,
      samplesProcessed: this.metrics.samplesProcessed + other.metrics.samplesProcessed
    };

    const mergedMetadata: ExperimentMetadata = {
      id: `${this.metadata.id}+${other.metadata.id}`,
      name: `${this.metadata.name}+${other.metadata.name}`,
      description: [this.metadata.description, other.metadata.description].filter(Boolean).join(' + '),
      tags: [...new Set([...this.metadata.tags, ...other.metadata.tags])],
      parameters: { ...this.metadata.parameters, ...other.metadata.parameters },
      startedAt: this.metadata.startedAt < other.metadata.startedAt ? this.metadata.startedAt : other.metadata.startedAt,
      completedAt: this.metadata.completedAt && other.metadata.completedAt
        ? (this.metadata.completedAt > other.metadata.completedAt ? this.metadata.completedAt : other.metadata.completedAt)
        : undefined
    };

    const mergedRawData = [...this.rawData, ...other.rawData];

    return new ExperimentResult(mergedMetrics, mergedMetadata, mergedRawData);
  }

  /**
   * Validates the experiment result data
   * @returns True if all data is valid, false otherwise
   */
  validate(): boolean {
    return (
      this.isValidMetricValue(this.metrics.accuracy) &&
      this.isValidMetricValue(this.metrics.precision) &&
      this.isValidMetricValue(this.metrics.recall) &&
      this.isValidMetricValue(this.metrics.f1Score) &&
      this.metrics.duration >= 0 &&
      this.metrics.samplesProcessed >= 0 &&
      this.metadata.id.length > 0 &&
      this.metadata.name.length > 0 &&
      this.metadata.startedAt instanceof Date &&
      (!this.metadata.completedAt || this.metadata.completedAt instanceof Date)
    );
  }

  /**
   * Generates a summary of the experiment result
   * @returns A formatted string summary
   */
  summarize(): string {
    const duration = this.getDuration();
    const status = this.isCompleted() ? 'Completed' : 'Running';
    return `Experiment ${this.metadata.name} (${this.metadata.id}): ${status}
  Accuracy: ${(this.metrics.accuracy * 100).toFixed(2)}%
  Precision: ${(this.metrics.precision * 100).toFixed(2)}%
  Recall: ${(this.metrics.recall * 100).toFixed(2)}%
  F1 Score: ${(this.metrics.f1Score * 100).toFixed(2)}%
  Duration: ${(duration / 1000).toFixed(2)}s
  Samples: ${this.metrics.samplesProcessed}`;
  }

  /**
   * Validates constructor inputs
   * @throws {Error} If any input is invalid
   */
  private validateConstructorInputs(
    metrics: ExperimentMetrics,
    metadata: ExperimentMetadata,
    rawData: Record<string, unknown>[]
  ): void {
    if (!metrics || typeof metrics !== 'object') {
      throw new Error('Metrics must be a valid object');
    }
    if (!metadata || typeof metadata !== 'object') {
      throw new Error('Metadata must be a valid object');
    }
    if (!Array.isArray(rawData)) {
      throw new Error('Raw data must be an array');
    }
    if (!metadata.id || typeof metadata.id !== 'string' || metadata.id.trim().length === 0) {
      throw new Error('Metadata id must be a non-empty string');
    }
    if (!metadata.name || typeof metadata.name !== 'string' || metadata.name.trim().length === 0) {
      throw new Error('Metadata name must be a non-empty string');
    }
    if (!metadata.startedAt || !(metadata.startedAt instanceof Date) || isNaN(metadata.startedAt.getTime())) {
      throw new Error('Metadata startedAt must be a valid Date');
    }
    if (!metadata.tags || !Array.isArray(metadata.tags)) {
      throw new Error('Metadata tags must be an array');
    }
    if (!metadata.parameters || typeof metadata.parameters !== 'object') {
      throw new Error('Metadata parameters must be an object');
    }
  }

  /**
   * Checks if a metric value is valid (between 0 and 1)
   * @param value - The value to check
   * @returns True if valid, false otherwise
   */
  private isValidMetricValue(value: number): boolean {
    return typeof value === 'number' && value >= 0 && value <= 1 && Number.isFinite(value);
  }
}
