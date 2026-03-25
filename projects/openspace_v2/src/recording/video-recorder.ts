import { Path } from '../utils';
import { RecordingClient } from '../platform';

export class VideoRecorder {
  private readonly output_path: Path;
  private readonly base_url?: string;
  private recording_client: RecordingClient | null = null;

  constructor(output_path: string, base_url?: string) {
    if (base_url !== undefined && typeof base_url !== 'string') {
      throw new TypeError('base_url must be a string when provided');
    }
    this.output_path = new Path(output_path);
    this.base_url = base_url;
  }

  async start(): Promise<void> {
    if (this.recording_client) {
      info('Video recording already started');
      return;
    }

    this.recording_client = new RecordingClient(this.base_url);
    await this.recording_client.start_recording(this.output_path);
    info(`Started video recording to ${this.output_path}`);
  }

  async stop(): Promise<void> {
    if (!this.recording_client) {
      warning('No active video recording to stop');
      return;
    }

    await this.recording_client.end_recording();
    await this.recording_client.close();
    this.recording_client = null;
    info('Stopped video recording');
  }
}
