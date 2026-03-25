import { Logger } from '../utils';

type ScreenSizeResponse = { width: number; height: number };

/**
 * Screenshot client for capturing screens via HTTP API.
 * This module provides a screenshot client that captures
 * screenshots by calling the local_server's /screenshot endpoint.
 * Always uses HTTP API.
 */
export class ScreenshotClient {
  private readonly base_url: string;
  private readonly timeout: number;

  constructor(base_url: string | null = null, timeout: number = 10) {
    this.base_url = (base_url ?? this.getClientBaseUrl()).replace(/\/$/, '');
    this.timeout = timeout;
    Logger.debug(`ScreenshotClient initialized with base_url: ${this.base_url}`);
  }

  private getClientBaseUrl(): string {
    return 'http://localhost:8080';
  }

  private timeoutSignal(): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), this.timeout * 1000);
    return controller.signal;
  }

  async capture(): Promise<Uint8Array> {
    Logger.debug('Capturing screenshot via HTTP API');
    try {
      const response = await fetch(`${this.base_url}/screenshot`, {
        signal: this.timeoutSignal(),
      });
      if (!response.ok) {
        throw new Error(`Screenshot capture failed: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      Logger.debug(`Screenshot captured, size: ${buffer.byteLength} bytes`);
      return new Uint8Array(buffer);
    } catch (err) {
      Logger.error('Screenshot capture error', err);
      throw err;
    }
  }

  async captureToFile(output_path: string): Promise<boolean> {
    Logger.info(`Capturing screenshot to file: ${output_path}`);
    try {
      const data = await this.capture();
      const dir = output_path.split('/').slice(0, -1).join('/');
      if (dir) {
        await fetch(`${this.base_url}/makedirs`, {
          method: 'POST',
          body: JSON.stringify({ path: dir }),
          headers: { 'Content-Type': 'application/json' },
          signal: this.timeoutSignal(),
        });
      }
      const file = await fetch(`${this.base_url}/write`, {
        method: 'POST',
        body: JSON.stringify({ path: output_path, data: Array.from(data) }),
        headers: { 'Content-Type': 'application/json' },
        signal: this.timeoutSignal(),
      });
      if (!file.ok) {
        throw new Error(`File write failed: ${file.statusText}`);
      }
      Logger.info(`Screenshot saved to ${output_path}`);
      return true;
    } catch (err) {
      Logger.error('Screenshot file capture error', err);
      return false;
    }
  }

  async getScreenSize(): Promise<[number, number]> {
    Logger.debug('Getting screen size');
    try {
      const response = await fetch(`${this.base_url}/screen_size`, {
        signal: this.timeoutSignal(),
      });
      if (!response.ok) {
        Logger.warning(`Screen size request failed: ${response.statusText}`);
        throw new Error(`Screen size request failed: ${response.statusText}`);
      }
      const json = (await response.json()) as ScreenSizeResponse;
      if (
        typeof json.width !== 'number' ||
        typeof json.height !== 'number' ||
        json.width <= 0 ||
        json.height <= 0
      ) {
        throw new Error('Invalid screen size response');
      }
      Logger.debug(`Screen size: ${json.width}x${json.height}`);
      return [json.width, json.height];
    } catch (err) {
      Logger.error('Screen size request error', err);
      throw err;
    }
  }

  async close(): Promise<void> {
    Logger.debug('Closing ScreenshotClient');
  }
}
