import { SystemProbe } from './system-probe';
import { CaptureContext } from './capture-context';
import { AutoSnapshotWrapper } from './auto-snapshot-wrapper';
import { CaptureClient } from './capture-client';

export class SnapshotClient {
  private readonly probe: SystemProbe;
  private readonly context: CaptureContext;
  readonly wrapper: AutoSnapshotWrapper;
  private readonly session: string;
  private readonly outputDir: string;
  private isStarted: boolean = false;

  constructor(
    probe: SystemProbe,
    session: string,
    outputDir: string
  ) {
    this.probe = probe;
    this.session = session;
    this.outputDir = outputDir;
    this.context = new CaptureContext(probe, session, outputDir);
    this.wrapper = new AutoSnapshotWrapper(this.context);
  }

  async start(): Promise<void> {
    if (this.isStarted) throw new Error('SnapshotClient is already started');
    await this.context.start();
    this.isStarted = true;
  }

  stop(): void {
    this.isStarted = false;
  }

  capture(name?: string): Promise<Buffer> {
    if (!this.isStarted) throw new Error('Snapshot not started; call start() first');
    return this.wrapper.capture(name);
  }

  pin(name: string): void {
    this.context.pinSnapshot(name);
  }

  unpin(name: string): void {
    this.context.unpinSnapshot(name);
  }

  list(): string[] {
    return this.context.listSnapshots();
  }

  path(name: string): string {
    return this.context.getSnapshotPath(name);
  }
}
