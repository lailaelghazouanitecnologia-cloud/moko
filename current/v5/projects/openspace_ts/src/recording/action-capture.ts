import { createHash } from 'crypto';

export class ActionCapture {
  timestamp: number;
  type: string;
  payload: unknown;
  metadata: unknown;

  constructor(type: string, payload: unknown, metadata?: unknown) {
    this.timestamp = Date.now();
    this.type = type;
    this.payload = payload;
    this.metadata = metadata ?? null;
  }

  capture(type: string, payload: unknown): void {
    this.timestamp = Date.now();
    this.type = type;
    this.payload = payload;
  }

  toJSON(): string {
    return JSON.stringify({
      timestamp: this.timestamp,
      type: this.type,
      payload: this.payload,
      metadata: this.metadata
    });
  }

  async replay(): Promise<void> {
    // Simulate replay by logging the action
    console.log(`Replaying action: ${this.type}`, this.payload);
    return Promise.resolve();
  }

  validate(): boolean {
    return this.type.length > 0 && this.payload !== undefined;
  }

  clone(): ActionCapture {
    return new ActionCapture(this.type, this.payload, this.metadata);
  }

  diff(other: ActionCapture): unknown {
    if (this.type !== other.type) {
      return { typeChanged: { from: this.type, to: other.type } };
    }
    if (JSON.stringify(this.payload) !== JSON.stringify(other.payload)) {
      return { payloadChanged: { from: this.payload, to: other.payload } };
    }
    return null;
  }

  static seed(json: string): ActionCapture {
    const parsed = JSON.parse(json) as {
      timestamp?: number;
      type: string;
      payload: unknown;
      metadata?: unknown;
    };
    const action = new ActionCapture(parsed.type, parsed.payload, parsed.metadata);
    if (parsed.timestamp) {
      action.timestamp = parsed.timestamp;
    }
    return action;
  }

  static isValidType(type: string): boolean {
    return typeof type === 'string' && type.length > 0 && /^[a-zA-Z0-9_-]+$/.test(type);
  }

  hash(): string {
    const data = `${this.type}:${JSON.stringify(this.payload)}:${this.timestamp}`;
    return createHash('sha256').update(data).digest('hex');
  }
}
