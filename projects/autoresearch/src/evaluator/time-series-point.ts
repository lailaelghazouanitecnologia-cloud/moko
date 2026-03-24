/**
 * Represents a single data point in a time‐series.
 */
export interface TimeSeriesPoint {
  /**
   * The moment in time when the observation was recorded.
   * Must be a valid `Date` object.
   */
  timestamp: Date;

  /**
   * The numeric value observed at the given `timestamp`.
   * Must be a finite number.
   */
  value: number;
}
