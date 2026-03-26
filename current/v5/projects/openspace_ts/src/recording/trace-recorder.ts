import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

type TraceEvent = {
  readonly timestamp: number;
  readonly type: string;
  readonly payload: unknown;
  readonly metadata?: unknown;
};

type TraceSummary = {
  readonly traceId: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly eventCount: number;
  readonly durationMs: number;
};

export class TraceRecorder {
  private traceId: string = '';
  private startTime: Date = new Date();
  private isRecording: boolean = false;
  private readonly events: TraceEvent[] = [];

  start(): void {
    if (this.isRecording) {
      throw new Error('Already recording');
    }
    this.traceId = randomUUID();
    this.startTime = new Date();
    this.isRecording = true;
    this.events.length = 0;
  }

  stop(): TraceSummary {
    if (!this.isRecording) {
      throw new Error('Not recording');
    }
    const endTime = new Date();
    this.isRecording = false;
    return {
      traceId: this.traceId,
      startTime: this.startTime,
      endTime,
      eventCount: this.events.length,
      durationMs: endTime.getTime() - this.startTime.getTime()
    };
  }

  recordEvent(event: TraceEvent): void {
    if (!this.isRecording) {
      throw new Error('Not recording');
    }
    if (typeof event.timestamp !== 'number' || event.timestamp < 0) {
      throw new TypeError('event.timestamp must be a non-negative number');
    }
    if (typeof event.type !== 'string' || event.type.length === 0) {
      throw new TypeError('event.type must be a non-empty string');
    }
    this.events.push(event);
  }

  async save(path: string): Promise<void> {
    const data = {
      traceId: this.traceId,
      startTime: this.startTime.toISOString(),
      isRecording: this.isRecording,
      events: this.events
    };
    await fs.writeFile(path, JSON.stringify(data, null, 2), 'utf8');
  }

  static async load(path: string): Promise<TraceRecorder> {
    const content = await fs.readFile(path, 'utf8');
    const data = JSON.parse(content) as {
      traceId: string;
      startTime: string;
      isRecording: boolean;
      events: TraceEvent[];
    };
    const recorder = new TraceRecorder();
    recorder.traceId = data.traceId;
    recorder.startTime = new Date(data.startTime);
    recorder.isRecording = data.isRecording;
    recorder.events.push(...data.events);
    return recorder;
  }

  /**
   * Stream events back in chronological order.
   * @yields Each recorded event.
   */
  async* replay(): AsyncIterable<TraceEvent> {
    for (const event of this.events) {
      yield event;
    }
  }
}
