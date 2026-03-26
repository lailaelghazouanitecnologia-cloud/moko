import { SystemProbe } from './system-probe';
import { CaptureClient } from './capture-client';

export class CaptureContext {
  private readonly probe: SystemProbe;
  private client: CaptureClient | null = null;
  private readonly sessionId: string;
  private readonly outputDir: string;
  private isActive: boolean = false;
  private readonly snapshots: string[] = [];
  private startTime: number = 0;

  constructor(probe: SystemProbe, sessionId: string, outputDir: string) {
      if (!sessionId || typeof sessionId !== 'string') throw new TypeError('sessionId must be a non-empty string');
      if (!outputDir || typeof outputDir !== 'string') throw new TypeError('outputDir must be a non-empty string');

    this.probe = probe;
    this.sessionId = sessionId;
    this.outputDir = outputDir;
  }

  async start(): Promise<void> {
    if (this.isActive) return;
    this.isActive = true;
    this.startTime = Date.now();
  }

  async stop(): Promise<void> {
    if (!this.isActive) return;
    this.isActive = false;
  }

  async takeSnapshot(name?: string): Promise<string> {
    if (!this.isActive) throw new Error('Capture not active');
    const snapshotName = name ?? `snapshot-${Date.now()}`;
    const snapshotPath = `${this.outputDir}/${snapshotName}.png`;
    this.snapshots.push(snapshotPath);
    return snapshotPath;
  }

  recordAction(action: Record<string, unknown>): void {
    if (!this.isActive) return;
    // Action logging implementation
  }

  getStatus(): { recording: boolean; snapshots: number; startTime: number } {
    return {
      recording: this.isActive,
      snapshots: this.snapshots.length,
      startTime: this.startTime
    };
  }

  attachClient(client: CaptureClient): void {
    this.client = client;
  }

  detachClient(): void {
    this.client = null;
  }

  listSnapshots(): string[] {
    return [...this.snapshots];
  }
}
