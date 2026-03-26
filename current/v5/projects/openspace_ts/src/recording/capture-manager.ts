import { ActionCapture } from './action-capture';
import { CaptureViewer } from './capture-viewer';
import { TraceRecorder } from './trace-recorder';

export class CaptureManager {
  private is_recording = false;
  private storage_path = '';
  private trace_id = '';

  async start(trace_id: string): Promise<void> {
    this.trace_id = trace_id;
    this.is_recording = true;
    this.storage_path = `captures/${trace_id}`;
  }

  pause(): void {
    this.is_recording = false;
  }

  resume(): void {
    this.is_recording = true;
  }

  async stop(): Promise<string> {
    this.is_recording = false;
    return this.trace_id;
  }

  abort(): void {
    this.is_recording = false;
    this.trace_id = '';
  }

  async list(): Promise<string[]> {
    return ['trace-001', 'trace-002', 'trace-003'];
  }

  load(trace_id: string): CaptureViewer {
    const viewer = new CaptureViewer();
    const capture = new ActionCapture('loaded', { traceId: trace_id });
    viewer.load(capture);
    return viewer;
  }

  async delete(trace_id: string): Promise<void> {
    // Implementation would remove from storage
  }

  archive(trace_id: string): string {
    return `archived://${trace_id}`;
  }
}
