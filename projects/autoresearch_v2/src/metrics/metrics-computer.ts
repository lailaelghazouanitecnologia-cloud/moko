import { MetricRegistry } from './metric-registry';

/**
 * Computes standardized metrics from training logs and model outputs.
 * Supports classification metrics (accuracy, precision, recall, F1, confusion matrix)
 * and regression metrics (MSE loss).
 */
export class MetricsComputer {
  private registry: MetricRegistry;

  /**
   * Creates a new MetricsComputer instance.
   * @param registry - The metric registry to use for tracking computed metrics.
   * @throws {Error} If registry is not provided.
   */
  constructor(registry: MetricRegistry) {
    if (!registry) {
      throw new Error('MetricRegistry is required');
    }
    this.registry = registry;
  }

  /**
   * Computes classification accuracy as the ratio of correct predictions.
   * @param predictions - Array of predicted class indices.
   * @param labels - Array of true class indices.
   * @returns Accuracy score between 0 and 1.
   * @throws {Error} If inputs are not arrays, have different lengths, or are empty.
   */
  computeAccuracy(predictions: number[], labels: number[]): number {
    this.validateClassificationInputs(predictions, labels);
    if (predictions.length === 0) {
      return 0;
    }
    let correct = 0;
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i] === labels[i]) {
        correct++;
      }
    }
    const accuracy = correct / predictions.length;
    (this.registry as any).record('accuracy', accuracy);
    return accuracy;
  }

  /**
   * Computes precision for a specific class.
   * @param predictions - Array of predicted class indices.
   * @param labels - Array of true class indices.
   * @param classId - The class index to compute precision for.
   * @returns Precision score between 0 and 1.
   * @throws {Error} If inputs are invalid or classId is not a non-negative integer.
   */
  computePrecision(predictions: number[], labels: number[], classId: number): number {
    this.validateClassificationInputs(predictions, labels);
    this.validateClassId(classId);
    let tp = 0;
    let fp = 0;
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i] === classId) {
        if (labels[i] === classId) {
          tp++;
        } else {
          fp++;
        }
      }
    }
    const denom = tp + fp;
    const precision = denom === 0 ? 0 : tp / denom;
    (this.registry as any).record(`precision_class_${classId}`, precision);
    return precision;
  }

  /**
   * Computes recall for a specific class.
   * @param predictions - Array of predicted class indices.
   * @param labels - Array of true class indices.
   * @param classId - The class index to compute recall for.
   * @returns Recall score between 0 and 1.
   * @throws {Error} If inputs are invalid or classId is not a non-negative integer.
   */
  computeRecall(predictions: number[], labels: number[], classId: number): number {
    this.validateClassificationInputs(predictions, labels);
    this.validateClassId(classId);
    let tp = 0;
    let fn = 0;
    for (let i = 0; i < predictions.length; i++) {
      if (labels[i] === classId) {
        if (predictions[i] === classId) {
          tp++;
        } else {
          fn++;
        }
      }
    }
    const denom = tp + fn;
    const recall = denom === 0 ? 0 : tp / denom;
    (this.registry as any).record(`recall_class_${classId}`, recall);
    return recall;
  }

  /**
   * Computes F1 score as the harmonic mean of precision and recall.
   * @param precision - Precision score.
   * @param recall - Recall score.
   * @returns F1 score between 0 and 1.
   * @throws {Error} If precision or recall are not numbers or outside [0,1].
   */
  computeF1Score(precision: number, recall: number): number {
    if (typeof precision !== 'number' || typeof recall !== 'number') {
      throw new Error('Precision and recall must be numbers');
    }
    if (precision < 0 || precision > 1 || recall < 0 || recall > 1) {
      throw new Error('Precision and recall must be between 0 and 1');
    }
    const denom = precision + recall;
    const f1 = denom === 0 ? 0 : (2 * precision * recall) / denom;
    (this.registry as any).record('f1_score', f1);
    return f1;
  }

  /**
   * Builds a confusion matrix where rows represent true labels and columns represent predictions.
   * @param predictions - Array of predicted class indices.
   * @param labels - Array of true class indices.
   * @returns Square confusion matrix as a 2D array.
   * @throws {Error} If inputs are invalid or contain negative indices.
   */
  computeConfusionMatrix(predictions: number[], labels: number[]): number[][] {
    this.validateClassificationInputs(predictions, labels);
    const maxLabel = Math.max(...labels, ...predictions);
    if (maxLabel < 0) {
      throw new Error('Class indices must be non-negative integers');
    }
    const size = maxLabel + 1;
    const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i];
      const label = labels[i];
      if (pred < 0 || label < 0) {
        throw new Error('Class indices must be non-negative integers');
      }
      matrix[label][pred]++;
    }
    (this.registry as any).record('confusion_matrix', matrix);
    return matrix;
  }

  /**
   * Computes mean squared error loss between predictions and labels.
   * @param predictions - Array of predicted numeric values.
   * @param labels - Array of true numeric values.
   * @returns MSE loss as a non-negative number.
   * @throws {Error} If inputs are not arrays or have different lengths.
   */
  computeLoss(predictions: number[], labels: number[]): number {
    this.validateRegressionInputs(predictions, labels);
    let sum = 0;
    for (let i = 0; i < predictions.length; i++) {
      const diff = predictions[i] - labels[i];
      sum += diff * diff;
    }
    const loss = sum / predictions.length;
    (this.registry as any).record('loss', loss);
    return loss;
  }

  /**
   * Computes macro-averaged precision across all classes.
   * @param predictions - Array of predicted class indices.
   * @param labels - Array of true class indices.
   * @returns Macro-averaged precision between 0 and 1.
   */
  computeMacroPrecision(predictions: number[], labels: number[]): number {
    this.validateClassificationInputs(predictions, labels);
    const uniqueLabels = new Set(labels);
    if (uniqueLabels.size === 0) return 0;
    let total = 0;
    uniqueLabels.forEach(classId => {
      total += this.computePrecision(predictions, labels, classId);
    });
    const macroPrecision = total / uniqueLabels.size;
    (this.registry as any).record('macro_precision', macroPrecision);
    return macroPrecision;
  }

  /**
   * Computes macro-averaged recall across all classes.
   * @param predictions - Array of predicted class indices.
   * @param labels - Array of true class indices.
   * @returns Macro-averaged recall between 0 and 1.
   */
  computeMacroRecall(predictions: number[], labels: number[]): number {
    this.validateClassificationInputs(predictions, labels);
    const uniqueLabels = new Set(labels);
    if (uniqueLabels.size === 0) return 0;
    let total = 0;
    uniqueLabels.forEach(classId => {
      total += this.computeRecall(predictions, labels, classId);
    });
    const macroRecall = total / uniqueLabels.size;
    (this.registry as any).record('macro_recall', macroRecall);
    return macroRecall;
  }

  /**
   * Computes macro-averaged F1 score across all classes.
   * @param predictions - Array of predicted class indices.
   * @param labels - Array of true class indices.
   * @returns Macro-averaged F1 score between 0 and 1.
   */
  computeMacroF1Score(predictions: number[], labels: number[]): number {
    const macroPrecision = this.computeMacroPrecision(predictions, labels);
    const macroRecall = this.computeMacroRecall(predictions, labels);
    const macroF1 = this.computeF1Score(macroPrecision, macroRecall);
    (this.registry as any).record('macro_f1_score', macroF1);
    return macroF1;
  }

  /**
   * Validates inputs for classification metrics.
   * @param predictions - Predicted class indices.
   * @param labels - True class indices.
   * @throws {Error} If inputs are invalid.
   */
  private validateClassificationInputs(predictions: number[], labels: number[]): void {
    if (!Array.isArray(predictions) || !Array.isArray(labels)) {
      throw new Error('Predictions and labels must be arrays');
    }
    if (predictions.length !== labels.length) {
      throw new Error('Predictions and labels must have the same length');
    }
    if (!predictions.every(p => Number.isInteger(p))) {
      throw new Error('All predictions must be integers');
    }
    if (!labels.every(l => Number.isInteger(l))) {
      throw new Error('All labels must be integers');
    }
  }

  /**
   Validates inputs for regression metrics.
   * @param predictions - Predicted numeric values.
   * @param labels - True numeric values.
   * @throws {Error} If inputs are invalid.
   */
  private validateRegressionInputs(predictions: number[], labels: number[]): void {
    if (!Array.isArray(predictions) || !Array.isArray(labels)) {
      throw new Error('Predictions and labels must be arrays');
    }
    if (predictions.length !== labels.length) {
      throw new Error('Predictions and labels must have the same length');
    }
    if (predictions.some(p => typeof p !== 'number' || isNaN(p))) {
      throw new Error('All predictions must be valid numbers');
    }
    if (labels.some(l => typeof l !== 'number' || isNaN(l))) {
      throw new Error('All labels must be valid numbers');
    }
  }

  /**
   * Validates a class identifier.
   * @param classId - The class index to validate.
   * @throws {Error} If classId is not a non-negative integer.
   */
  private validateClassId(classId: number): void {
    if (!Number.isInteger(classId) || classId < 0) {
      throw new Error('classId must be a non-negative integer');
    }
  }
}
