import { EventEmitter } from 'events';

/**
 * Represents a single feedback entry in the system.
 */
interface FeedbackEntry {
  /** Unique identifier for the entry */
  id: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Severity or category of the feedback */
  type: 'success' | 'warning' | 'error' | 'info';
  /** Human-readable message describing the feedback */
  message: string;
  /** Source or origin of the feedback (e.g., component name) */
  source: string;
  /** Additional structured data associated with the feedback */
  metadata: Record<string, unknown>;
}

/**
 * Aggregated summary of all feedback stored in the system.
 */
interface FeedbackSummary {
  /** Total number of feedback entries recorded */
  total: number;
  /** Count of entries grouped by type */
  byType: Record<string, number>;
  /** Trend indicators over the last 7 days */
  trends: Record<string, number>;
  /** Array of high-severity error entries */
  critical: FeedbackEntry[];
  /** Actionable advice based on current feedback state */
  recommendations: string[];
}

/**
 * Collects, analyzes, and applies feedback entries to improve system performance.
 * Emits events for critical issues and recommendations.
 */
export class FeedbackLoop extends EventEmitter {
  private history: FeedbackEntry[] = [];
  private threshold: number = 0.5;
  private pending: FeedbackEntry[] = [];

  constructor(threshold: number = 0.5) {
    super();
    this.validateThreshold(threshold);
    this.threshold = threshold;
  }

  /**
   * Store a new feedback entry and emit a 'recorded' event.
   * @param entry - The feedback entry to record
   * @throws {TypeError} If the entry is invalid
   */
  record(entry: FeedbackEntry): void {
    this.validateEntry(entry);
    this.history.push(entry);
    this.pending.push(entry);
    this.emit('recorded', entry);
  }

  /**
   * Compute trends and summarize the current state of all feedback.
   * @returns A summary of feedback statistics and recommendations
   */
  analyze(): FeedbackSummary {
    if (this.history.length === 0) {
      return this.createEmptySummary();
    }

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const byType: Record<string, number> = {
      success: 0,
      warning: 0,
      error: 0,
      type: 0
    };

    const trends: Record<string, number> = {
      increasing: 0,
      decreasing: 0,
      stable: 0
    };

    const critical: FeedbackEntry[] = [];
    const recommendations: string[] = [];

    this.history.forEach(entry => {
      byType[entry.type]++;

      const age = (now - entry.timestamp) / dayMs;
      if (age <= 7) {
        if (entry.type === 'error') {
          trends.increasing++;
          if (
            entry.metadata.severity === 'high' ||
            entry.metadata.severity === 'critical'
          ) {
            critical.push(entry);
          }
        } else if (entry.type === 'success') {
          trends.decreasing++;
        } else {
          trends.stable++;
        }
      }
    });

    if (critical.length > 0) {
      recommendations.push('Address critical errors immediately');
    }

    if (byType.error > byType.success * 2) {
      recommendations.push('Investigate underlying issues causing high error rate');
    }

    return {
      total: this.history.length,
      byType,
      trends,
      critical,
      recommendations
    };
  }

  /**
   * Apply a summary to update agents and emit relevant events.
   * @param summary - The feedback summary to apply
   * @throws {TypeError} If the summary is invalid
   */
  apply(summary: FeedbackSummary): void {
    this.validateSummary(summary);

    if (summary.critical.length > 0) {
      this.emit('critical', summary.critical);
    }

    if (summary.recommendations.length > 0) {
      summary.recommendations.forEach(rec => this.emit('recommendation', rec));
    }

    this.pending = [];
    this.emit('applied', summary);
  }

  /**
   * Clear all stored feedback history and pending entries.
   */
  reset(): void {
    this.history = [];
    this.pending = [];
    this.emit('reset');
  }

  /**
   * Check whether any pending feedback exceeds the critical threshold.
   * @returns True if there are critical pending entries
   */
  hasCritical(): boolean {
    return this.pending.some(
      entry =>
        (entry.type === 'error' || entry.type === 'warning') &&
        (entry.metadata.severity === 'high' || entry.metadata.severity === 'critical')
    );
  }

  /**
   * Serialize the current state to a JSON string.
   * @returns JSON string containing history, threshold, and pending arrays
   */
  export(): string {
    return JSON.stringify({
      history: this.history,
      threshold: this.threshold,
      pending: this.pending
    });
  }

  /**
   * Load a previously exported state from a JSON string.
   * @param data - JSON string returned by export()
   * @throws {SyntaxError} If data is not valid JSON
   * @throws {TypeError} If data structure is invalid
   */
  import(data: string): void {
    if (typeof data !== 'string') {
      throw new TypeError('Import data must be a string');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(data);
    } catch (err) {
      throw new SyntaxError('Invalid JSON string provided');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new TypeError('Invalid import structure');
    }

    this.history = Array.isArray(parsed.history) ? parsed.history : [];
    this.validateThreshold(parsed.threshold);
    this.threshold = parsed.threshold ?? 0.5;
    this.pending = Array.isArray(parsed.pending) ? parsed.pending : [];

    this.emit('imported', {
      history: this.history.length,
      pending: this.pending.length
    });
  }

  /**
   * Remove feedback entries older than the specified number of days.
   * @param age - Maximum age in days for entries to keep
   * @throws {TypeError} If age is not a positive number
   */
  prune(age: number): void {
    if (typeof age !== 'number' || age <= 0 || !isFinite(age)) {
      throw new TypeError('Age must be a positive number');
    }

    const cutoff = Date.now() - age * 24 * 60 * 60 * 1000;
    const originalLength = this.history.length;
    this.history = this.history.filter(entry => entry.timestamp > cutoff);

    if (this.history.length < originalLength) {
      this.emit('pruned', { removed: originalLength - this.history.length });
    }
  }

  /* ------------------------------------------------------------------ */
  /*                            Private helpers                           */
  /* ------------------------------------------------------------------ */

  /**
   * Validate a feedback entry.
   */
  private validateEntry(entry: FeedbackEntry): void {
    if (!entry || typeof entry !== 'object') {
      throw new TypeError('Entry must be an object');
    }
    if (typeof entry.id !== 'string' || !entry.id.trim()) {
      throw new TypeError('Entry.id must be a non-empty string');
    }
    if (typeof entry.timestamp !== 'number' || entry.timestamp <= 0) {
      throw new TypeError('Entry.timestamp must be a positive number');
    }
    if (!['success', 'warning', 'error', 'info'].includes(entry.type)) {
      throw new TypeError("Entry.type must be one of: 'success', 'warning', 'error', 'info'");
    }
    if (typeof entry.message !== 'string') {
      throw new TypeError('Entry.message must be a string');
    }
    if (typeof entry.source !== 'string') {
      throw new TypeError('Entry.source must be a string');
    }
    if (!entry.metadata || typeof entry.metadata !== 'object') {
      throw new TypeError('Entry.metadata must be an object');
    }
  }

  /**
   * Validate a feedback summary.
   */
  private validateSummary(summary: FeedbackSummary): void {
    if (!summary || typeof summary !== 'object') {
      throw new TypeError('Summary must be an object');
    }
    if (typeof summary.total !== 'number' || summary.total < 0) {
      throw new TypeError('Summary.total must be a non-negative number');
    }
    if (!summary.byType || typeof summary.byType !== 'object') {
      throw new TypeError('Summary.byType must be an object');
    }
    if (!summary.trends || typeof summary.trends !== 'object') {
      throw new TypeError('Summary.trends must be an object');
    }
    if (!Array.isArray(summary.critical)) {
      throw new TypeError('Summary.critical must be an array');
    }
    if (!Array.isArray(summary.recommendations)) {
      throw new TypeError('Summary.recommendations must be an array');
    }
  }

  /**
   * Validate the threshold value.
   */
  private validateThreshold(threshold: number): void {
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 1) {
      throw new TypeError('Threshold must be a number between 0 and 1');
    }
  }

  /**
   * Create an empty summary for the case when no history exists.
   */
  private createEmptySummary(): FeedbackSummary {
    return {
      total: 0,
      byType: { success: 0, warning: 0, error: 0, info: 0 },
      trends: { increasing: 0, decreasing: 0, stable: 0 },
      critical: [],
      recommendations: []
    };
  }
}
