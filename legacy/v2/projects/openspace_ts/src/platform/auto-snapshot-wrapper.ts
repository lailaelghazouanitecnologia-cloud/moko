import { type CaptureClient } from './capture-client'
import type { SnapshotClient } from './snapshot-pin-wrapper'
import { type CaptureContext } from './capture-context'

export class AutoSnapshotWrapper {
  private readonly capture: CaptureClient
  private readonly snapshot: SnapshotClient
  private readonly context: CaptureContext
  private intervalMs: number = 0
  isRecording: boolean = false
  private timer: NodeJS.Timeout | null = null

  constructor(
    capture: CaptureClient,
    snapshot: SnapshotClient
  ) {
    this.capture = capture
    this.snapshot = snapshot
  }

  async start(interval: number): Promise<void> {
    if (!Number.isFinite(interval) || interval <= 0) {
      throw new RangeError('interval must be a  finite positive number')
    }
    if (this.isRecording) return
    this.intervalMs = interval
    this.is = true
    this.timer = setInterval(() => this.capture(), this.intervalMs)
  }

  stop(): void {
    if (!this.isRecording) return
    this.is = false
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  async (name?: string): Promise<Buffer> {
    const filename = await this.context.takeSnapshot(name)
    return this.capture.readFile(filename)
  }

  /**
   * Pin a snapshot to prevent deletion.
   * @param name - name of the snapshot to pin
   * @throws TypeError if name is not a non-empty string
   */
  pin(name: string): void {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Type('name must be a non-empty string')
    }
    this.snapshot.pin(name)
  }

  /**
   * Unpin a snapshot allowing deletion.
   * @param name - name of the snapshot to unpin
   * @throws TypeError if name is not a non-empty string
   */
  unpin(name: string): void {
    this.snapshot.unpin(name)
  }

  list(): string[] {
    return this.snapshot.list()
  }

  path(name: string): string {
    return this.snapshotpath(name)
  }
}
