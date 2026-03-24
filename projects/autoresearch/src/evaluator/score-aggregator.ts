import { Aggregation } from './index';

/**
 * Aggregates scores across multiple runs and experiments.
 * Supports various aggregation methods, outlier handling, and weighted calculations.
 */
export class ScoreAggregator {
  public aggregationMethod: string;
  public weightingScheme: string;
  public outlierHandling: string;

  /**
   * Creates a new ScoreAggregator instance.
   * @param aggregationMethod - The method to use for aggregation (default: 'mean')
   * @param weightingScheme - The weighting scheme to apply (default: 'uniform')
   * @param outlierHandling - How to handle outliers (default: 'none')
   * @throws {Error} If any parameter is invalid
   */
  constructor(
    aggregationMethod: string = 'mean',
    weightingScheme: string = 'uniform',
    outlierHandling: string = 'none'
  ) {
    this.validateConstructorParams(aggregationMethod, weightingScheme, outlierHandling);
    this.aggregationMethod = aggregationMethod;
    this.weightingScheme = weightingScheme;
    this.outlierHandling = outlierHandling;
  }

  /**
   * Aggregates an array of scores using the configured aggregation method.
   * @param scores - Array of numeric scores to aggregate
   * @returns The aggregated score
   * @throws {Error} If scores is empty or invalid
   */
  public aggregate(scores: number[]): number {
    this.validateScoresArray(scores);
    const cleanedScores = this.handleOutliers(scores);
    return this.performAggregation(cleanedScores);
  }

  /**
   * Performs weighted aggregation of scores.
   * @param scores - Array of numeric scores
   * @param weights - Array of weights corresponding to each score
   * @returns The weighted aggregated score
   * @throws {Error} If inputs are invalid or arrays have different lengths
   */
  public aggregateWeighted(scores: number[], weights: number[]): number {
    this.validateWeightedInputs(scores, weights);
    const cleanedScores = this.handleOutliers(scores);
    return this.performWeightedAggregation(cleanedScores, weights);
  }

  /**
   * Aggregates scores grouped by key.
   * @param groups - Map of group names to arrays of scores
   * @returns Map of group names to aggregated scores
   * @throws {Error} If groups is invalid or any group is empty
   */
  public aggregateByGroup(groups: Map<string, number[]>): Map<string, number> {
    if (!groups || !(groups instanceof Map)) {
      throw new Error('Groups must be a valid Map instance');
    }
    if (groups.size === 0) {
      throw new Error('Groups map cannot be empty');
    }

    const result = new Map<string, number>();
    for (const [key, scores] of groups.entries()) {
      if (typeof key !== 'string' || key.trim() === '') {
        throw new Error('Group key must be a non-empty string');
      }
      result.set(key, this.aggregate(scores));
    }
    return result;
  }

  /**
   * Computes statistical measures for a set of scores.
   * @param scores - Array of numeric scores
   * @returns Statistics object containing mean, std, min, max, and median
   * @throws {Error} If scores is empty or invalid
   */
  public computeStatistics(scores: number[]): Statistics {
    this.validateScoresArray(scores);
    const cleanedScores = this.handleOutliers(scores);
    return this.calculateStatistics(cleanedScores);
  }

  /**
   * Handles outliers in the data based on the configured method.
   * @param scores - Array of numeric scores
   * @returns Array with outliers removed or modified
   */
  public handleOutliers(scores: number[]): number[] {
    if (!Array.isArray(scores)) {
      throw new Error('Scores must be an array');
    }
    if (this.outlierHandling === 'none' || scores.length < 3) {
      return [...scores];
    }
    return this.filterOutliersByIQR(scores);
  }

  /**
   * Merges two aggregation results.
   * @param agg1 - First aggregation result
   * @param agg2 - Second aggregation result
   * @returns Merged aggregation result
   * @throws {Error} If either aggregation is invalid
   */
  public mergeAggregations(agg1: Aggregation, agg2: Aggregation): Aggregation {
    this.validateAggregationInputs(agg1, agg2);
    return this.performMerge(agg1, agg2);
  }

  /**
   * Computes confidence interval for a set of scores.
   * @param scores - Array of numeric scores
   * @param confidence - Confidence level (0 < confidence < 1)
   * @returns Range object with lower and upper bounds
   * @throws {Error} If inputs are invalid
   */
  public getConfidenceInterval(scores: number[], confidence: number): Range {
    this.validateConfidenceIntervalInputs(scores, confidence);
    const cleanedScores = this.handleOutliers(scores);
    return this.calculateConfidenceInterval(cleanedScores, confidence);
  }

  /**
   * Aggregates time series data points.
   * @param timeSeries - Array of time series points
   * @returns Aggregated time series point
   * @throws {Error} If time series is empty or invalid
   */
  public aggregateOverTime(timeSeries: TimeSeriesPoint[]): TimeSeriesPoint {
    this.validateTimeSeries(timeSeries);
    const values = timeSeries.map(point => point.value);
    const aggregatedValue = this.aggregate(values);
    const latestTimestamp = this.getLatestTimestamp(timeSeries);
    return { timestamp: latestTimestamp, value: aggregatedValue };
  }

  /**
   * Aggregates cross-validation fold scores.
   * @param folds - Array of fold scores
   * @returns Aggregated CV score
   * @throws {Error} If folds array is empty
   */
  public aggregateCrossValidation(folds: number[]): number {
    this.validateScoresArray(folds);
    return this.aggregate(folds);
  }

  /**
   * Aggregates ensemble model scores.
   * @param modelScores - Map of model names to their scores
   * @returns Aggregated ensemble score
   * @throws {Error} If model scores is empty
   */
  public aggregateEnsemble(modelScores: Map<string, number>): number {
    if (!modelScores || !(modelScores instanceof Map)) {
      throw new Error('Model scores must be a valid Map instance');
    }
    if (modelScores.size === 0) {
      throw new Error('Model scores cannot be empty');
    }
    const scores = Array.from(modelScores.values());
    return this.aggregate(scores);
  }

  /**
   * Available aggregation methods.
   */
  public static readonly METHODS = ['mean', 'median', 'min', 'max', 'sum'];

  /**
   * Factory method to create a ScoreAggregator instance.
   * @param method - The aggregation method to use
   * @returns New ScoreAggregator instance
   * @throws {Error} If method is not supported
   */
  public static create(method: string): ScoreAggregator {
    if (!ScoreAggregator.METHODS.includes(method)) {
      throw new Error(`Unsupported aggregation method: ${method}. Supported methods: ${ScoreAggregator.METHODS.join(', ')}`);
    }
    return new ScoreAggregator(method);
  }

  // Private helper methods

  private validateConstructorParams(aggregationMethod: string, weightingScheme: string, outlierHandling: string): void {
    if (typeof aggregationMethod !== 'string' || aggregationMethod.trim() === '') {
      throw new Error('Aggregation method must be a non-empty string');
    }
    if (typeof weightingScheme !== 'string' || weightingScheme.trim() === '') {
      throw new Error('Weighting scheme must be a non-empty string');
    }
    if (typeof outlierHandling !== 'string' || outlierHandling.trim() === '') {
      throw new Error('Outlier handling must be a non-empty string');
    }
  }

  private validateScoresArray(scores: number[]): void {
    if (!Array.isArray(scores)) {
      throw new Error('Scores must be an array');
    }
    if (scores.length === 0) {
      throw new Error('Scores array cannot be empty');
    }
    if (!scores.every(score => typeof score === 'number' && !isNaN(score))) {
      throw new Error('All scores must be valid numbers');
    }
  }

  private validateWeightedInputs(scores: number[], weights: number[]): void {
    if (!Array.isArray(scores) || !Array.isArray(weights)) {
      throw new Error('Scores and weights must be arrays');
    }
    if (scores.length !== weights.length) {
      throw new Error(`Scores and weights arrays must have the same length. Got scores: ${scores.length}, weights: ${weights.length}`);
    }
    if (scores.length === 0) {
      throw new Error('Scores array cannot be empty');
    }
    if (!weights.every(weight => typeof weight === 'number' && weight >= 0)) {
      throw new Error('All weights must be non-negative numbers');
    }
  }

  private validateAggregationInputs(agg1: Aggregation, agg2: Aggregation): void {
    if (!agg1 || !agg2) {
      throw new Error('Both aggregations must be provided');
    }
    if (typeof agg1.value !== 'number' || isNaN(agg1.value)) {
      throw new Error('First aggregation value must be a valid number');
    }
    if (typeof agg2.value !== 'number' || isNaN(agg2.value)) {
      throw new Error('Second aggregation value must be a valid number');
    }
  }

  private validateConfidenceIntervalInputs(scores: number[], confidence: number): void {
    this.validateScoresArray(scores);
    if (typeof confidence !== 'number' || confidence <= 0 || confidence >= 1) {
      throw new Error('Confidence level must be a number between 0 and 1 (exclusive)');
    }
  }

  private validateTimeSeries(timeSeries: TimeSeriesPoint[]): void {
    if (!Array.isArray(timeSeries)) {
      throw new Error('Time series must be an array');
    }
    if (timeSeries.length === 0) {
      throw new Error('Time series cannot be empty');
    }
    if (!timeSeries.every(point => point && point.timestamp instanceof Date && typeof point.value === 'number')) {
      throw new Error('All time series points must have valid Date timestamp and numeric value');
    }
  }

  private performAggregation(scores: number[]): number {
    switch (this.aggregationMethod) {
      case 'mean':
        return scores.reduce((sum, score) => sum + score, 0) / scores.length;
      case 'median':
        return this.calculateMedian(scores);
      case 'min':
        return Math.min(...scores);
      case 'max':
        return Math.max(...scores);
      case 'sum':
        return scores.reduce((sum, score) => sum + score, 0);
      default:
        throw new Error(`Unsupported aggregation method: ${this.aggregationMethod}`);
    }
  }

  private performWeightedAggregation(scores: number[], weights: number[]): number {
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) {
      throw new Error('Total weight cannot be zero');
    }
    let weightedSum = 0;
    for (let i = 0; i < scores.length; i++) {
      weightedSum += scores[i] * weights[i];
    }
    return weightedSum / totalWeight;
  }

  private calculateMedian(scores: number[]): number {
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private calculateStatistics(scores: number[]): Statistics {
    const n = scores.length;
    const sorted = [...scores].sort((a, b) => a - b);
    const mean = scores.reduce((sum, score) => sum + score, 0) / n;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / n;
    const median = this.calculateMedian(scores);
    return {
      mean,
      std: Math.sqrt(variance),
      min: sorted[0],
      max: sorted[n - 1],
      median
    };
  }

  private filterOutliersByIQR(scores: number[]): number[] {
    const sorted = [...scores].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const filtered = scores.filter(score => score >= lowerBound && score <= upperBound);
    return filtered.length > 0 ? filtered : [...scores];
  }

  private performMerge(agg1: Aggregation, agg2: Aggregation): Aggregation {
    const mergedValue = (agg1.value + agg2.value) / 2;
    const mergedMetadata = {
      ...agg1.metadata,
      ...agg2.metadata,
      mergedFrom: [agg1.method, agg2.method],
      mergeTimestamp: new Date().toISOString()
    };
    return {
      value: mergedValue,
      method: 'merged',
      metadata: mergedMetadata
    };
  }

  private calculateConfidenceInterval(scores: number[], confidence: number): Range {
    const stats = this.computeStatistics(scores);
    const n = scores.length;
    const alpha = 1 - confidence;
    const tValue = this.getTValue(alpha / 2, n - 1);
    const margin = tValue * (stats.std / Math.sqrt(n));
    return {
      lower: stats.mean - margin,
      upper: stats.mean + margin
    };
  }

  private getLatestTimestamp(timeSeries: TimeSeriesPoint[]): Date {
    const timestamps = timeSeries.map(point => point.timestamp.getTime());
    const maxTime = Math.max(...timestamps);
    return new Date(maxTime);
  }

  private getTValue(alpha: number, degrees: number): number {
    if (degrees < 1) return 1.96;
    if (degrees < 30) {
      const tTable: { [key: number]: number } = {
        1: 12.71, 2: 4.30, 3: 3.18, 4: 2.78, 5: 2.57,
        6: 2.45, 7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23,
        11: 2.20, 12: 2.18, 13: 2.16, 14: 2.14, 15: 2.13,
        16: 2.12, 17: 2.11, 18: 2.10, 19: 2.09, 20: 2.09,
        21: 2.08, 22: 2.07, 23: 2.07, 24: 2.06, 25: 2.06,
        26: 2.06, 27: 2.05, 28: 2.05, 29: 2.05
      };
      return tTable[degrees] || 2.04;
    }
    return 1.96;
  }
}