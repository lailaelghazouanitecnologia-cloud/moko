/**
 * Outcome of a training experiment
 */
export class ExperimentResult {
  public experimentId: string;
  public status: 'completed' | 'failed' | 'timeout';
  public startTime: Date;
  public endTime: Date;
  public logs: string[];
  public checkpointPath: string;
  public metrics: Record<string, number>;

  constructor(
    experimentId: string,
    status: 'completed' | 'failed' | 'timeout',
    startTime: Date,
    endTime: Date,
    logs: string[] = [],
    checkpointPath: string = '',
    metrics: Record<string, number> = {}
  ) {
    this.experimentId = experimentId;
    this.status = status;
    this.startTime = startTime;
    this.endTime = endTime;
    this.logs = logs;
    this.checkpointPath = checkpointPath;
    this.metrics = metrics;
  }

  /**
   * Runtime in seconds
   */
  getDuration(): number {
    const durationMs = this.endTime.getTime() - this.startTime.getTime();
    if (durationMs < 0) {
      throw new Error('End time must be after start time');
    }
    return durationMs / 1000;
  }

  /**
   * Check completed
   */
  isSuccess(): boolean {
    return this.status === 'completed';
  }

  /**
   * Retrieve metric
   * @param key metric name
   */
  getMetric(key: string): number | undefined {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error('Metric key must be a non-empty string');
    }
    return this.metrics[key];
  }

  /**
   * Append log
   * @param line log entry
   */
  addLog(line: string): void {
    if (typeof line !== 'string') {
      throw new Error('Log line must be a string');
    }
    this.logs.push(line);
  }

  /**
   * Store path
   * @param path checkpoint file path
   */
  setCheckpoint(path: string): void {
    if (typeof path !== 'string') {
      throw new Error('Checkpoint path must be a string');
    }
    this.checkpointPath = path;
  }

  /**
   * Serialize result
   */
  toJSON(): object {
    return {
      experimentId: this.experimentId,
      status: this.status,
      startTime: this.startTime.toISOString(),
      endTime: this.endTime.toISOString(),
      logs: this.logs,
      checkpointPath: this.checkpointPath,
      metrics: this.metrics
    };
  }
}
