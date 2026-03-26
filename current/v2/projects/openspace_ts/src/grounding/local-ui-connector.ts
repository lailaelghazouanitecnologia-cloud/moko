import { UIConnector } from './ui-connector';

/**
 * Local UI connector for desktop automation.
 * Simulates interaction with a desktop window for testing purposes.
 */
export class LocalUIConnector implements UIConnector {
  private windowHandle: number = 0;
  private processId: number = 0;
  private bounds: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };
  private scaleFactor: number = 1;

  async connect(target: string): Promise<boolean> {
    const handle = parseInt(target, 10);
    if (Number.isNaN(handle)) {
      throw new RangeError('target must be a valid integer string');
    }
    this.windowHandle = handle;
    this.processId = handle;
    this.bounds = { x: 0, y: 0, width: 1920, height: 1080 };
    this.scaleFactor = 1;
    return true;
  }

  async disconnect(): Promise<void> {
    this.windowHandle = 0;
    this.processId = 0;
  }

  async screenshot(): Promise<Buffer> {
    const width = this.bounds.width;
    const height = this.bounds.height;
    const size = width * height * 4;
    const buf = Buffer.alloc(size);
    for (let i = 0; i < size; i += 4) {
      buf[i] = 0x20;
      buf[i + 1] = 0x20;
      buf[i + 2] = 0x20;
      buf[i + 3] = 0xff;
    }
    return buf;
  }

  async click(x: number, y: number): Promise<void> {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new TypeError('x and y must be finite numbers');
    }
    const scaledX = x * this.scaleFactor;
    const scaledY = y * this.scaleFactor;
    // No-op for local simulation
  }

  async type(text: string): Promise<void> {
    for (const ch of text) {
      // No-op for local simulation
    }
  }

  async scroll(dx: number, dy: number): Promise<void> {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      throw new TypeError('dx and dy must be finite numbers');
    }
    const scaledDx = dx * this.scaleFactor;
    const scaledDy = dy * this.scaleFactor;
    // No-op for local simulation
  }

  async getElementBounds(selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
    return { x: 100, y: 100, width: 200, height: 50 };
  }
}
