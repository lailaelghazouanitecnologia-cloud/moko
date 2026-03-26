export class AgentState {
  private status: string;
  private readonly context: Map<string, unknown>;
  private lastAction: string;
  private recordingId: string | null;

  constructor() {
    this.status = 'idle';
    this.context = new Map<string, unknown>();
    this.lastAction = '';
    this.recordingId = null;
  }

  updateStatus(status: string): void {
    this.status = status;
  }

  getContext(key: string): unknown {
    return this.context.get(key);
  }

  setContext(key: string, value: unknown): void {
    this.context.set(key, value);
  }

  recordAction(action: string): void {
    this.lastAction = action;
  }

  isRecording(): boolean {
    return this.recordingId !== null;
  }

  attachRecording(recordingId: string): void {
    this.recordingId = recordingId;
  }

  detachRecording(): void {
    this.recordingId = null;
  }

  serialize(): string {
    const data = {
      status: this.status,
      context: Object.fromEntries(this.context),
      lastAction: this.lastAction,
      recordingId: this.recordingId
    };
    return JSON.stringify(data);
  }

  deserialize(data: string): void {
    let parsed: {
      status: unknown;
      readonly context: unknown;
      lastAction: unknown;
      recordingId: unknown;
    };
    try {
      parsed = JSON.parse(data) as {
        status: unknown;
        readonly context: unknown;
        lastAction: unknown;
        recordingId: unknown;
      };
    } catch (err) {
      throw new SyntaxError('Invalid JSON provided');
    }

    if (typeof parsed.status !== 'string') {
      throw new RangeError('Missing or invalid status field');
    }
    if (typeof parsed.lastAction !== 'string') {
      throw new RangeError('Missing or invalid lastAction field');
    }
    if (
      parsed.recordingId !== null &&
      typeof parsed.recordingId !== 'string'
    ) {
      throw new RangeError('Invalid recordingId field');
    }
    if (
      !parsed.context ||
      typeof parsed.context !== 'object' ||
      Array.isArray(parsed.context)
    ) {
      throw new RangeError('Missing or invalid context field');
    }

    this.status = parsed.status;
    this.lastAction = parsed.lastAction;
    this.recordingId = parsed.recordingId as string | null;

    this.context.clear();
    for (const [key, value] of Object.entries(parsed.context)) {
      if (typeof key === 'string') {
        this.context.set(key, value);
      }
    }
  }
}
