/**
 * Computes standardized metrics from logs and checkpoints
 */
export class MetricComputer {
  private baseline: Record<string, number>;
  private tolerance: number;
  private logs: any[];
  private checkpoints: Record<string, any>;

  constructor() {
    this.baseline = {};
    this.tolerance = 0.05;
    this.logs = [];
    this.checkpoints = {};
  }

  /**
   * Calculate accuracy score
   * @returns accuracy value between 0 and 1
   */
  computeAccuracy(): number {
    if (!this.checkpoints.accuracy) return 0;
    const value = this.checkpoints.accuracy;
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      this.logWarning('Invalid accuracy value', value);
      return 0;
    }
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Calculate loss value
   * @returns loss value (non-negative)
   */
  computeLoss(): number {
    if (!this.checkpoints.loss) return 0;
    const value = this.checkpoints.loss;
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      this.logWarning('Invalid loss value', value);
      return 0;
    }
    return Math.max(0, value);
  }

  /**
   * Calculate F1 score
   * @returns F1 score between 0 and 1
   */
  computeF1(): number {
    if (!this.checkpoints.f1) return 0;
    const value = this.checkpoints.f1;
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      this.logWarning('Invalid F1 value', value);
      return 0;
    }
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Calculate precision
   * @returns precision between 0 and 1
   */
  computePrecision(): number {
    if (!this.checkpoints.precision) return 0;
    const value = this.checkpoints.precision;
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      this.logWarning('Invalid precision value', value);
      return 0;
    }
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Calculate recall
   * @returns recall between 0 and 1
   */
  computeRecall(): number {
    if (!this.checkpoints.recall) return 0;
    const value = this.checkpoints.recall;
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      this.logWarning('Invalid recall value', value);
      return 0;
    }
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Check if a metric value is within tolerance of the baseline
   * @param metric metric name
   * @param value current value
   * @returns true if within tolerance
   */
  compareBaseline(metric: string, value: number): boolean {
    if (typeof metric !== 'string' || metric.trim() === '') {
      this.logWarning('Invalid metric name', metric);
      return false;
    }
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      this.logWarning('Invalid metric value for comparison', value);
      return false;
    }
    if (!this.baseline[metric]) return true;
    const baseline = this.baseline[metric];
    const diff = Math.abs(value - baseline) / baseline;
    return diff <= this.tolerance;
  }

  /**
   * Return all computed metrics
   * @returns object with all metric values
   */
  getAllMetrics(): Record<string, number> {
    return {
      accuracy: this.computeAccuracy(),
      loss: this.computeLoss(),
      f1: this.computeF1(),
      precision: this.computePrecision(),
      recall: this.computeRecall()
    };
  }

  /**
   * Update baseline values for comparison
   * @param baseline new baseline values
   */
  setBaseline(baseline: Record<string, number>): void {
    if (!baseline || typeof baseline !== 'object') {
      throw new Error('Baseline must be a non-null object');
    }
    for (const [key, value] of Object.entries(baseline)) {
      if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        throw new Error(`Baseline value for "${key}" must be a valid number`);
      }
    }
    this.baseline = baseline;
  }

  /**
   * Set tolerance for baseline comparison
   * @param tolerance tolerance value (0 to 1)
   */
  setTolerance(tolerance: number): void {
    if (typeof tolerance !== 'number' || isNaN(tolerance) || !isFinite(tolerance)) {
      throw new Error('Tolerance must be a valid number');
    }
    if (tolerance < 0 || tolerance > 1) {
      throw new Error('Tolerance must be between 0 and 1');
    }
    this.tolerance = tolerance;
  }

  /**
   * Update checkpoints data
   * @param checkpoints new checkpoints object
   */
  updateCheckpoints(checkpoints: Record<string, any>): void {
    if (!checkpoints || typeof checkpoints !== 'object') {
      throw new Error('Checkpoints must be a non-null object');
    }
    this.checkpoints = { ...checkpoints };
  }

  /**
   * Add log entry
   * @param log log entry
   */
  addLog(log: any): void {
    if (log === null || log === undefined) {
      this.logWarning('Attempted to add null or undefined log');
      return;
    }
    this.logs.push({
      timestamp: Date.now(),
      data: log
    });
  }

  /**
   * Get recent logs
   * @param count number of logs to return
   * @returns array of recent logs
   */
  getRecentLogs(count: number = 10): any[] {
    if (typeof count !== 'number' || count < 0) {
      this.logWarning('Invalid count for getRecentLogs', count);
      return [];
    }
    return this.logs.slice(-count);
  }

  /**
   * Reset all metrics and storage
   */
  reset(): void {
    this.baseline = {};
    this.tolerance = 0.05;
    this.logs = [];
    this.checkpoints = {};
  }

  /**
   * Log warning message
   * @param message warning message
   * @param data optional data to log
   */
  private logWarning(message: string, data?: any): void {
    console.warn(`[MetricComputer] ${message}`, data !== undefined ? data : '');
  }
}
