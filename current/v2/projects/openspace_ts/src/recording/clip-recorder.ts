import { ActionCapture } from './action-capture';
import { CaptureManager } from './capture-manager';

export class ClipRecorder {
  private isRecording = false;
  private fileName = '';
  private startTime = 0;
  private readonly clipBuffer: unknown[] = [];
  private readonly recordingManager: CaptureManager;

  constructor(recordingManager: CaptureManager) {
    this.recordingManager = recordingManager;
  }

  async start(fileName: string): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }
    this.fileName = fileName;
    this.startTime = Date.now();
    this.isRecording = true;
    this.clipBuffer.length = 0;
    await this.recordingManager.start(fileName);
  }

  async stop(): Promise<void> {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }
    this.isRecording = false;
    await this.recordingManager.stop();
  }

  pause(): void {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }
    this.recordingManager.pause();
  }

  addFrame(frame: unknown): void {
    if (!this.isRecording) {
      throw new Error('No recording in progress');
    }
    this.clipBuffer.push(frame);
  }

  async save(): Promise<string> {
    if (this.isRecording) {
      throw new Error('Recording must be stopped before saving');
    }
    if (this.clipBuffer.length === 0) {
      throw new Error('No frames recorded');
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = `${this.fileName}-${timestamp}.clip`;
    return filePath;
  }

  abort(): void {
    this.isRecording = false;
    this.clipBuffer.length = 0;
    this.recordingManager.abort();
  }
}
