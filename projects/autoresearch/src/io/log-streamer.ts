import { EventEmitter } from 'node:events';
import { createReadStream, ReadStream } from 'node:fs';
import { createInterface, Interface } from 'node:readline';

export interface Metric {
  name: string;
  value: number;
  variant: string;
  timestamp: Date;
  tags: Record<string, string | number | boolean>;
}

export interface LogStreamerOptions {
  path: string;
  encoding?: BufferEncoding;
  highWaterMark?: number;
  tail?: boolean;
}

/**
 * Emits:
 * - 'metric'  (metric: Metric)  – individual parsed metric
 * - 'metrics' (metrics: Metric[]) – flushed batch
 * - 'error'   (err: Error)
 * - 'end'
 */
export class LogStreamer extends EventEmitter {
  private path: string;
  private encoding: BufferEncoding;
  private highWaterMark: number;
  private tail: boolean;
  private stream: ReadStream | null = null;
  private rl: Interface | null = null;
  private isRunning = false;
  private metricsBuffer: Metric[] = [];
  private bufferSize = 1000;
  private flushInterval = 5000;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(options: LogStreamerOptions) {
    super();
    this.validateOptions(options);
    this.path = options.path;
    this.encoding = options.encoding || 'utf8';
this.highWaterMark = options.highWaterMark || 64 * 1024;
    this.tail = options.tail ?? true;
  }

  /**
   * Start reading and parsing the log file.
   * @throws {Error} If the file cannot be opened.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      this.stream = createReadStream(this.path, {
        encoding: this.encoding,
        highWaterMark: this.highWaterMark,
        flags: this.tail ? 'r' : 'r',
        autoClose: true
      });
    } catch (err) {
      this.isRunning = false;
      this.emit('error', new Error(`Failed to open file "${this.path}": ${err}`));
      return;
    }

    this.rl = createInterface({
      input: this.stream,
      crlfDelay: Infinity
    });

    this.rl.on('line', (line: string) => this.processLine(line));

    this.rl.once('close', () => {
      this.flushMetrics();
      this.emit('end');
      this.stop();
    });

    this.rl.on('error', (err: Error) => {
      this.emit('error', err);
      this.stop();
    });

    this.stream.on('error', (err: Error) => {
      this.emit('error', err);
      this.stop();
    });

    this.flushTimer = setInterval(() => this.flushMetrics(), this.flushInterval);
  }

  /**
   * Stop reading and clean up resources.
   */
  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    if (this.stream) {
      this.stream.destroy();
      this.stream = null;
    }

    this.flushMetrics();
  }

  /**
   * Pause the underlying stream.
   */
  public pause(): void {
    if (this.stream && this.isRunning) {
      this.stream.pause();
    }
  }

  /**
   * Resume the underlying stream.
   */
  public resume(): void {
    if (this.stream && this.isRunning) {
      this.stream.resume();
    }
  }

  /**
   * Check whether the streamer is active.
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get a shallow copy of the current metrics buffer.
   */
  public getMetrics(): Metric[] {
    return [...this.metricsBuffer];
  }

  /**
   * Clear the metrics buffer (does not emit).
   */
  public clearMetrics(): void {
    this.metricsBuffer = [];
  }

  /**
   * Update the buffer size used for automatic flushing.
   * @param size Positive integer.
   */
  public setBufferSize(size: number): void {
    if (!Number.isInteger(size) || size <= 0) {
      throw new Error('Buffer size must be a positive integer');
    }
    this.bufferSize = size;
  }

  /**
   * Update the flush interval for batched metrics.
   * @param ms Positive integer in milliseconds.
   */
  public setFlushInterval(ms: number): void {
    if (!Number.isInteger(ms) || ms <= 0) {
      throw new Error('Flush interval must be a positive integer');
    }
    this.flushInterval = ms;
    if (this.isRunning && this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = setInterval(() => this.flushMetrics(), this.flushInterval);
    }
  }

  /* -------------------------------------------------- *
   * Private helpers                                    *
   * -------------------------------------------------- */

  private validateOptions(opts: LogStreamerOptions): void {
    if (!opts.path || typeof opts.path !== 'string') {
      throw new Error('"path" is required and must be a non-empty string');
    }
    if (opts.encoding && !Buffer.isEncoding(opts.encoding)) {
      throw new Error(`"encoding" must be a valid Node.js encoding, got: ${opts.encoding}`);
    }
    if (
      opts.highWaterMark !== undefined &&
      (!Number.isInteger(opts.highWaterMark) || opts.highWaterMark <= 0)
    ) {
      throw new Error('"highWaterMark" must be a positive integer');
    }
  }

  private processLine(line: string): void {
    const metric = this.parseMetric(line);
    if (metric) {
      this.metricsBuffer.push(metric);
      this.emit('metric', metric);
      if (this.metricsBuffer.length >= this.bufferSize) {
        this.flushMetrics();
      }
    }
  }

  private parseMetric(line: string): Metric | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    try {
      const parsed = JSON.parse(trimmed);
      if (this.isValidMetric(parsed)) {
        return {
          name: parsed.name,
          value: Number(parsed.value),
          variant: String(parsed.variant),
          timestamp: new Date(parsed.timestamp),
          tags: typeof parsed.tags === 'object' && parsed.tags !== null ? parsed.tags : {}
        };
      }
    } catch {
      // ignore non-JSON or malformed lines
    }
    return null;
  }

  private isValidMetric(obj: any): obj is Metric {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.name === 'string' &&
      obj.name.length > 0 &&
      typeof obj.value === 'number' &&
      !isNaN(obj.value) &&
      isFinite(obj.value) &&
      typeof obj.variant === 'string' &&
      obj.variant.length > 0 &&
      (typeof obj.timestamp === 'string' || typeof obj.timestamp === 'number') &&
      !isNaN(Date.parse(String(obj.timestamp)))
    );
  }

  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) return;
    this.emit('metrics', [...this.metricsBuffer]);
    this.metricsBuffer = [];
  }
}
