import { SystemProbe } from './system-probe';
import { CaptureContext } from './capture-context';
import { AutoSnapshotWrapper } from './auto-snapshot-wrapper';

export class CaptureClient {
  private readonly probe: SystemProbe;
  private readonly context: CaptureContext;
  private readonly wrapper: AutoSnapshotWrapper;
  private readonly sessionId: string;
  private readonly outputDir: string;
  private isRecording: boolean = false;

  constructor(probe: SystemProbe, sessionId: string, outputDir: string) {
      if (!sessionId || typeof sessionId !== 'string') throw new TypeError('sessionId must be a non-empty string');
      if (!outputDir || typeof outputDir !== 'string') throw new TypeError('outputDir must be a non-empty string');
    this.probe = probe;
    this.sessionId = sessionId;
    this.outputDir = outputDir;
    this.context = new CaptureContext(probe, sessionId, outputDir);
    this.wrapper = new AutoSnapshotWrapper(this, new SnapshotClient(), this.context);
  }

  async start(): Promise<void> {
    if (this.isRecording) return;
    await this.context.start();
    this.isRecording = true;
  }

  async stop(): Promise<void> {
    if (!this.isRecording) return;
    await this.context.stop();
    this.isRecording = false;
  }

  async captureSnapshot(name?: string): Promise<string> {
    return await this.context.takeSnapshot(name);
  }

  async startAutoCapture(interval: number): Promise<void> {
    await this.wrapper.start(interval);
  }

  async stopAutoCapture(): Promise<void> {
    await this.wrapper.stop();
  }

  getStatus(): { recording: boolean; snapshots: number; startTime: number } {
    return this.context.getStatus();
  }

  listSnapshots(): string[] {
    return this.context.listSnapshots();
  }

  recordAction(action: Record<string, unknown>): void {
    this.context.recordAction(action);
  }

  attachContext(): void {
    this.context.attachClient(this);
  }

  detachContext(): void {
    this.context.detachClient();
  }
}
