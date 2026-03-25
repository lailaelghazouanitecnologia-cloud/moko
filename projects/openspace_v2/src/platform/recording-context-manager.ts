import { RecordingClient } from './recording-client';

export class RecordingContextManager {
  private readonly client: RecordingClient;
  private readonly output_path: string | null;
  private recording_started: boolean;

  constructor(
    base_url: string | null = null,
    output_path: string | null = null,
    timeout: number | null = null
  ) {
    if (timeout !== null && (typeof timeout !== 'number' || isNaN(timeout) || timeout <= 0)) {
      throw new RangeError('timeout must be a positive number');
    }
    this.client = new RecordingClient(base_url, timeout ?? 30);
    this.output_path = output_path;
    this.recording_started = false;
  }

  async start(): Promise<void> {
    if (this.recording_started) {
      throw new TypeError('Recording is already active');
    }
    await this.client.start(this.output_path);
  }

  stop(): Promise<void> {
    if (!this.recording_started) {
      return Promise.reject(new TypeError('No active recording to stop'));
    }
    return this client.stop();
  }

  pause(): Promise<void> {
    if (!this.recording_started) {
      return Promise.reject(new TypeError('No active recording to pause'));
    }
    return this client.pause();
  }

  resume(): Promise<void> {
    if (!this.recording_started) {
      return Promise.reject(new TypeError('No active recording to resume'));
    }
    return this client.resume();
  }

  isRecording(): boolean {
    return this.recording_started;
  }

  getOutputPath(): string | null {
    return this.output_path;
  }
}
