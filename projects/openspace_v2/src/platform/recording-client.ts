import { Logger } from '../utils';

type RecordingResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: Error;
};

/**
 * Client for screen recording via HTTP API.
 * This client directly calls the local server's recording endpoints:
 * - POST /start_recording
 * - POST /end_recording
 */
export class RecordingClient {
  private readonly base_url: string;
  private readonly timeout: number;

  constructor(base_url: string | null = null, timeout: number = 30) {

    this.base_url = (base_url ?? 'http://localhost:8080').replace(/\/$/, '');
    this.timeout = timeout;
  }

  async start_recording(auto_cleanup: boolean = true): Promise<boolean> {

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout * 1000);

    try {
      const response = await fetch(`${this.base_url}/start_recording`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_cleanup }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to start recording: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as { success?: unknown };
      return result.success === true;
    } catch (error) {
      Logger.instance?.error('RecordingClient.start_recording failed', error);
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async end_recording(dest: string | null = null): Promise<Uint8Array> {
    if (dest !== null && typeof dest !== 'string') {
      throw new TypeError('dest must be a string or null');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout * 1000);

    try {
      const url = new URL(`${this.base_url}/end_recording`);
      if (dest) url.searchParams.set('dest', dest);

      const response = await fetch(url.toString(), {
        method: 'POST',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to end recording: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      return new Uint8Array(buffer);
    } catch (error) {
      Logger.instance?.error('RecordingClient.end_recording failed', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async close(): Promise<void> {
    // No persistent resources to clean up in this implementation
  }
}
