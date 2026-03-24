import { Logger } from '../utils/logger';

/**
 * Computes standardized metrics from raw predictions and labels.
 * Supports binary classification and regression metrics.
 */
export class MetricComputer {
  public metricType: string;
  public threshold: number;
  public classWeights: Map<string, number>;

  /**
   * Creates a new MetricComputer instance.
   * @param metricType - The type of metric to compute
   * @param threshold - Threshold for binary classification (default: 0.5)
   * @param classWeights - Optional weights for different classes
   * @throws {Error} If metricType is not supported
   */
  constructor(metricType: string, threshold: number = 0.5, classWeights: Map<string, number> = new Map()) {
    if (!metricType || typeof metricType !== 'string') {
      throw new Error('Metric type must be a non-empty string');
    }
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be a number between 0 and 1');
    }
    if (!(classWeights instanceof Map)) {
      throw new Error('Class weights must be a Map instance');
    }

    this.metricType = metricType;
    this.threshold = threshold;
    this.classWeights = classWeights;
  }

  /**
   * Computes accuracy as the ratio of correct predictions to total predictions.
   * @param predictions - Array of predicted values
   * @param labels - Array of true labels
   * @returns Accuracy score between 0 and 1
   * @throws {Error} If input arrays have different lengths or are empty
   */
  public computeAccuracy(predictions: number[], labels: number[]): number {
    this.validateInputArrays(predictions, labels, 'predictions', 'labels');
    
    if (predictions.length === 0) {
      Logger.warn('Empty arrays provided to computeAccuracy, returning 0');
      return 0;
    }

    let correct = 0;
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i] === labels[i]) {
        correct++;
      }
    }
    return correct / predictions.length;
  }

  /**
   * Computes precision as TP / (TP + FP).
   * @param predictions - Array of predicted probabilities or binary values
   * @param labels - Array of true binary labels (0 or 1)
   * @returns Precision score between 0 and 1
   * @throws {Error} If input arrays have different lengths or contain invalid values
   */
  public computePrecision(predictions: number[], labels: number[]): number {
    this.validateInputArrays(predictions, labels, 'predictions', 'labels');
    this.validateBinaryLabels(labels);

    let tp = 0;
    let fp = 0;
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i] >= this.threshold ? 1 : 0;
      const label = labels[i];
      if (pred === 1 && label === 1) {
        tp++;
      } else if (pred === 1 && label === 0) {
        fp++;
      }
    }
    if (tp + fp === 0) {
      Logger.warn('No positive predictions made, precision is 0');
      return 0;
    }
    return tp / (tp + fp);
  }

  /**
   * Computes recall as TP / (TP + FN).
   * @param predictions - Array of predicted probabilities or binary values
   * @param labels - Array of true binary labels (0 or 1)
   * @returns Recall score between 0 and 1
   * @throws {Error} If input arrays have different lengths or contain invalid values
   */
  public computeRecall(predictions: number[], labels: number[]): number {
    this.validateInputArrays(predictions, labels, 'predictions', 'labels');
    this.validateBinaryLabels(labels);

    let tp = 0;
    let fn = 0;
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i] >= this.threshold ? 1 : 0;
      const label = labels[i];
      if (pred === 1 && label === 1) {
        tp++;
      } else if (pred === 0 && label === 1) {
        fn++;
      }
    }
    if (tp + fn === 0) {
      Logger.warn('No positive labels in ground truth, recall is 0');
      return 0;
    }
    return tp / (tp + fn);
  }

  /**
   * Computes F1 score as the harmonic mean of precision and recall.
   * @param precision - Precision score
   * @param recall - Recall score
   * @returns F1 score between 0 and 1
   * @throws {Error} If precision or recall are not valid numbers
   */
  public computeF1(precision: number, recall: number): number {
    if (!this.isValidNumber(precision) || !this.isValidNumber(recall)) {
      throw new Error('Precision and recall must be valid numbers');
    }
    if (precision < 0 || precision > 1 || recall < 0 || recall > 1) {
      throw new Error('Precision and recall must be between 0 and 1');
    }

    if (precision + recall === 0) {
      return 0;
    }
    return 2 * (precision * recall) / (precision + recall);
  }

  /**
   * Computes AUC (Area Under the ROC Curve).
   * @param scores - Array of prediction scores/probabilities
   * @param labels - Array of true binary labels (0 or 1)
   * @returns AUC score between 0 and 1
   * @throws {Error} If input arrays have different lengths or contain invalid values
   */
  public computeAUC(scores: number[], labels: number[]): number {
    this.validateInputArrays(scores, labels, 'scores', 'labels');
    this.validateBinaryLabels(labels);

    if (scores.length === 0) {
      Logger.warn('Empty arrays provided to computeAUC, returning 0');
      return 0;
    }

    const pairs: Array<{ score: number; label: number }> = [];
    for (let i = 0; i < scores.length; i++) {
      pairs.push({ score: scores[i], label: labels[i] });
    }
    pairs.sort((a, b) => b.score - a.score);
    
    let tp = 0;
    let fp = 0;
    let auc = 0;
    let m = 0;
    let n = 0;
    
    for (let i = 0; i < pairs.length; i++) {
      if (pairs[i].label === 1) {
        m++;
      } else {
        n++;
      }
    }
    
    if (m === 0 || n === 0) {
      Logger.warn('Only one class present in labels, AUC is undefined, returning 0');
      return 0;
    }
    
    for (let i = 0; i < pairs.length; i++) {
      if (pairs[i].label === 1) {
        tp++;
      } else {
        fp++;
        auc += tp;
      }
    }
    
    return auc / (m * n);
  }

  /**
   * Computes Mean Squared Error.
   * @param predictions - Array of predicted values
   * @param targets - Array of target values
   * @returns MSE value (non-negative)
   * @throws {Error} If input arrays have different lengths or contain non-numeric values
   */
  public computeMSE(predictions: number[], targets: number[]): number {
    this.validateInputArrays(predictions, targets, 'predictions', 'targets');
    this.validateNumericArray(predictions, 'predictions');
    this.validateNumericArray(targets, 'targets');

    if (predictions.length === 0) {
      Logger.warn('Empty arrays provided to computeMSE, returning 0');
      return 0;
    }

    let sum = 0;
    for (let i = 0; i < predictions.length; i++) {
      const diff = predictions[i] - targets[i];
      sum += diff * diff;
    }
    return sum / predictions.length;
  }

  /**
   * Computes Mean Absolute Error.
   * @param predictions - Array of predicted values
   * @param targets - Array of target values
   * @returns MAE value (non-negative)
   * @throws {Error} If input arrays have different lengths or contain non-numeric values
   */
  public computeMAE(predictions: number[], targets: number[]): number {
    this.validateInputArrays(predictions, targets, 'predictions', 'targets');
    this.validateNumericArray(predictions, 'predictions');
    this.validateNumericArray(targets, 'targets');

    if (predictions.length === 0) {
      Logger.warn('Empty arrays provided to computeMAE, returning 0');
      return 0;
    }

    let sum = 0;
    for (let i = 0; i < predictions.length; i++) {
      sum += Math.abs(predictions[i] - targets[i]);
    }
    return sum / predictions.length;
  }

  /**
   * Computes confusion matrix for binary classification.
   * @param predictions - Array of predicted probabilities or binary values
   * @param labels - Array of true binary labels (0 or 1)
   * @returns 2x2 confusion matrix [[TN, FP], [FN, TP]]
   * @throws {Error} If input arrays have different lengths or contain invalid values
   */
  public computeConfusionMatrix(predictions: number[], labels: number[]): number[][] {
    this.validateInputArrays(predictions, labels, 'predictions', 'labels');
    this.validateBinaryLabels(labels);

    const matrix = [
      [0, 0], // [TN, FP]
      [0, 0]  // [FN, TP]
    ];
    
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i] >= this.threshold ? 1 : 0;
      const label = labels[i];
      matrix[pred][label]++;
    }
    
    return matrix;
  }

  /**
   * Computes all metrics for a single class.
   * @param predictions - Array of predicted probabilities or binary values
   * @param labels - Array of true binary labels (0 or 1)
   * @returns Map containing precision, recall, f1, and accuracy
   * @throws {Error} If input arrays have different lengths or contain invalid values
   */
  public computePerClassMetrics(predictions: number[], labels: number[]): Map<string, number> {
    this.validateInputArrays(predictions, labels, 'predictions', 'labels');
    this.validateBinaryLabels(labels);

    const metrics = new Map<string, number>();
    const precision = this.computePrecision(predictions, labels);
    const recall = this.computeRecall(predictions, labels);
    const f1 = this.computeF1(precision, recall);
    const accuracy = this.computeAccuracy(predictions, labels);
    
    metrics.set('precision', precision);
    metrics.set('recall', recall);
    metrics.set('f1', f1);
    metrics.set('accuracy', accuracy);
    
    return metrics;
  }

  /**
   * Aggregates multiple metric values by computing their mean.
   * @param metrics - Map where keys are metric names and values are arrays of metric values
   * @returns Map with aggregated (mean) values for each metric
   * @throws {Error} If metrics is not a valid Map or contains invalid data
   */
  public aggregateMetrics(metrics: Map<string, number[]>): Map<string, number> {
    if (!(metrics instanceof Map)) {
      throw new Error('Metrics must be a Map instance');
    }
    
    const aggregated = new Map<string, number>();
    
    for (const [key, values] of metrics.entries()) {
      if (!Array.isArray(values)) {
        throw new Error(`Values for metric '${key}' must be an array`);
      }
      
      if (values.length === 0) {
        Logger.warn(`Empty values array for metric '${key}', setting to 0`);
        aggregated.set(key, 0);
        continue;
      }
      
      this.validateNumericArray(values, `values for metric '${key}'`);
      
      const sum = values.reduce((a, b) => a + b, 0);
      aggregated.set(key, sum / values.length);
    }
    
    return aggregated;
  }

  /**
   * List of supported metric types.
   */
  public static readonly SUPPORTED_METRICS = [
    'accuracy',
    'precision',
    'recall',
    'f1',
    'auc',
    'mse',
    'mae'
  ];

  /**
   * Factory method to create a MetricComputer instance.
   * @param metricType - The type of metric to compute
   * @returns New MetricComputer instance
   * @throws {Error} If metricType is not supported
   */
  public static create(metricType: string): MetricComputer {
    if (!metricType || typeof metricType !== 'string') {
      throw new Error('Metric type must be a non-empty string');
    }
    
    if (!MetricComputer.SUPPORTED_METRICS.includes(metricType)) {
      throw new Error(`Unsupported metric type: ${metricType}. Supported types: ${MetricComputer.SUPPORTED_METRICS.join(', ')}`);
    }
    
    return new MetricComputer(metricType);
  }

  /**
   * Validates that two arrays have the same length.
   * @private
   */
  private validateInputArrays(arr1: number[], arr2: number[], name1: string, name2: string): void {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
      throw new Error(`${name1} and ${name2} must be arrays`);
    }
    
    if (arr1.length !== arr2.length) {
      throw new Error(`${name1} and ${name2} must have the same length`);
    }
  }

  /**
   * Validates that an array contains only binary values (0 or 1).
   * @private
   */
  private validateBinaryLabels(labels: number[]): void {
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] !== 0 && labels[i] !== 1) {
        throw new Error(`Labels must be binary (0 or 1), found ${labels[i]} at index ${i}`);
      }
    }
  }

  /**
   * Validates that an array contains only numeric values.
   * @private
   */
  private validateNumericArray(arr: number[], name: string): void {
    for (let i = 0; i < arr.length; i++) {
      if (!this.isValidNumber(arr[i])) {
        throw new Error(`${name} must contain only numbers, found ${arr[i]} at index ${i}`);
      }
    }
  }

  /**
   * Checks if a value is a valid finite number.
   * @private
   */
  private isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }
}
