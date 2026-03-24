import { MetricsComputer } from './metrics-computer';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export class MetricRegistry {
  private metrics: Map<string, Metric[]>;
  private computer: MetricsComputer;

  constructor() {
    this.metrics = new Map();
    this.computer = new MetricsComputer(this);
  }

  /**
   * Registers a new metric in the registry.
   * @param metric - The metric to register.
   * @throws {Error} If the metric is invalid.
   */
  register(metric: Metric): void {
    this.validateMetric(metric);
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    this.metrics.get(metric.name)!.push(metric);
  }

  /**
   * Retrieves all metrics with the given name.
   * @param name - The name of the metrics to retrieve.
   * @returns An array of metrics.
   */
  get(name: string): Metric[] {
    this.validateName(name);
    return this.metrics.get(name) || [];
  }

  /**
   * Retrieves the latest metric with the given name.
   * @param name - The name of the metric to retrieve.
   * @returns The latest metric or undefined if not found.
   */
  getLatest(name: string): Metric | undefined {
    this.validateName(name);
    const metrics = this.get(name);
    return metrics.length > 0 ? metrics[metrics.length - 1] : undefined;
  }

  /**
   * Retrieves all metrics.
   * @returns A copy of the metrics map.
   */
  getAll(): Map<string, Metric[]> {
    return new Map(this.metrics);
  }

  /**
   * Clears metrics by name or all metrics if no name is provided.
   * @param name - The name of the metrics to clear. If not provided, clears all metrics.
   */
  clear(name?: string): void {
    if (name !== undefined) {
      this.validateName(name);
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Computes accuracy and registers it as a metric.
   * @param predictions - Array of predicted labels.
   * @param labels - Array of true labels.
   * @returns The computed accuracy.
   * @throws {Error} If inputs are invalid.
   */
  computeAccuracy(predictions: number[], labels: number[]): number {
    this.validateArrays(predictions, labels);
    const accuracy = this.computer.computeAccuracy(predictions, labels);
    this.register({
      name: 'accuracy',
      value: accuracy,
      timestamp: Date.now()
    });
    return accuracy;
  }

  /**
   * Computes precision for a given class and registers it as a metric.
   * @param predictions - Array of predicted labels.
   * @param labels - Array of true labels.
   * @param classId - The class index to compute precision for.
   * @returns The computed precision.
   * @throws {Error} If inputs are invalid.
   */
  computePrecision(predictions: number[], labels: number[], classId: number): number {
    this.validateArrays(predictions, labels);
    this.validateClassId(classId);
    const precision = this.computer.computePrecision(predictions, labels, classId);
    this.register({
      name: `precision_class_${classId}`,
      value: precision,
      timestamp: Date.now()
    });
    return precision;
  }

  /**
   * Computes recall for a given class and registers it as a metric.
   * @param predictions - Array of predicted labels.
   * @param labels - Array of true labels.
   * @param classId - The class index to compute recall for.
   * @returns The computed recall.
   * @throws {Error} If inputs are invalid.
   */
  computeRecall(predictions: number[], labels: number[], classId: number): number {
    this.validateArrays(predictions, labels);
    this.validateClassId(classId);
    const recall = this.computer.computeRecall(predictions, labels, classId);
    this.register({
      name: `recall_class_${classId}`,
      value: recall,
      timestamp: Date.now()
    });
    return recall;
  }

  /**
   * Computes F1 score from precision and recall and registers it as a metric.
   * @param precision - The precision value.
   * @param recall - The recall value.
   * @returns The computed F1 score.
   * @throws {Error} If inputs are invalid.
   */
  computeF1Score(precision: number, recall: number): number {
    this.validatePrecisionRecall(precision, recall);
    const f1Score = this.computer.computeF1Score(precision, recall);
    this.register({
      name: 'f1_score',
      value: f1Score,
      timestamp: Date.now()
    });
    return f1Score;
  }

  /**
   * Computes confusion matrix and registers it as a metric.
   * @param predictions - Array of predicted labels.
   * @param labels - Array of true labels.
   * @returns The computed confusion matrix.
   * @throws {Error} If inputs are invalid.
   */
  computeConfusionMatrix(predictions: number[], labels: number[]): number[][] {
    this.validateArrays(predictions, labels);
    const matrix = this.computer.computeConfusionMatrix(predictions, labels);
    this.register({
      name: 'confusion_matrix',
      value: matrix.flat().reduce((a, b) => a + b, 0),
      timestamp: Date.now(),
      metadata: { matrix }
    });
    return matrix;
  }

  /**
   * Computes loss and registers it as a metric.
   * @param predictions - Array of predicted values.
   * @param labels - Array of true values.
   * @returns The computed loss.
   * @throws {Error} If inputs are invalid.
   */
  computeLoss(predictions: number[], labels: number[]): number {
    this.validateArrays(predictions, labels);
    const loss = this.computer.computeLoss(predictions, labels);
    this.register({
      name: 'loss',
      value: loss,
      timestamp: Date.now()
    });
    return loss;
  }

  /**
   * Validates a metric object.
   * @param metric - The metric to validate.
   * @private
   * @throws {Error} If the metric is invalid.
   */
  private validateMetric(metric: Metric): void {
    if (!metric || typeof metric !== 'object') {
      throw new Error('Metric must be an object');
    }
    if (typeof metric.name !== 'string' || metric.name.trim() === '') {
      throw new Error('Metric name must be a non-empty string');
    }
    if (typeof metric.value !== 'number' || !isFinite(metric.value)) {
      throw new Error('Metric value must be a finite number');
    }
    if (typeof metric.timestamp !== 'number' || !isFinite(metric.timestamp)) {
      throw new Error('Metric timestamp must be a finite number');
    }
  }

  /**
   * Validates a name string.
   * @param name - The name to validate.
   * @private
   * @throws {Error} If the name is invalid.
   */
  private validateName(name: string): void {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Name must be a non-empty string');
    }
  }

  /**
   * Validates two arrays for equal length and numeric content.
   * @param predictions - The predictions array.
   * @param labels - The labels array.
   * @private
   * @throws {Error} If arrays are invalid.
   */
  private validateArrays(predictions: number[], labels: number[]): void {
    if (!Array.isArray(predictions) || !Array.isArray(labels)) {
      throw new Error('Predictions and labels must be arrays');
    }
    if (predictions.length !== labels.length) {
      throw new Error('Predictions and labels must have the same length');
    }
    if (!predictions.every(p => typeof p === 'number' && isFinite(p))) {
      throw new Error('All predictions must be finite numbers');
    }
    if (!labels.every(l => typeof l === 'number' && isFinite(l))) {
      throw new Error('All labels must be finite numbers');
    }
  }

  /**
   * Validates a class ID.
   * @param classId - The class ID to validate.
   * @private
   * @throws {Error} If the class ID is invalid.
   */
  private validateClassId(classId: number): void {
    if (typeof classId !== 'number' || !isFinite(classId) || classId < 0 || !Number.isInteger(classId)) {
      throw new Error('Class ID must be a non-negative integer');
    }
  }

  /**
   * Validates precision and recall values.
   * @param precision - The precision value.
   * @param recall - The recall value.
   * @private
   * @throws {Error} If values are invalid.
   */
  private validatePrecisionRecall(precision: number, recall: number): void {
    if (typeof precision !== 'number' || !isFinite(precision) || precision < 0 || precision > 1) {
      throw new Error('Precision must be a number between 0 and 1');
    }
    if (typeof recall !== 'number' || !isFinite(recall) || recall < 0 || recall > 1) {
      throw new Error('Recall must be a number between 0 and 1');
    }
  }
}
