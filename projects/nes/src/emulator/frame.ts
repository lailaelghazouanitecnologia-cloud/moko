import { createWriteStream } from 'fs';
import { PNG } from 'pngjs';

export class Frame {
    private width: number = 256;
    private height: number = 240;
    private buffer: Uint8Array;
    private pixelIndex: number = 0;
    private isComplete: boolean = false;

    constructor() {
        this.buffer = new Uint8Array(this.width * this.height);
    }

    setPixel(x: number, y: number, color: number): void {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return;
        }
        const index = this.getPixelIndex(x, y);
        this.buffer[index] = color;
    }

    getPixel(x: number, y: number): number {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return 0;
        }
        const index = this.getPixelIndex(x, y);
        return this.buffer[index];
    }

    clear(): void {
        this.buffer.fill(0);
        this.pixelIndex = 0;
        this.isComplete = false;
    }

    isComplete(): boolean {
        return this.isComplete;
    }

    markComplete(): void {
        this.isComplete = true;
    }

    getBuffer(): Uint8Array {
        return this.buffer;
    }

    copy(source: Frame): void {
        this.width = source.width;
        this.height = source.height;
        this.buffer = new Uint8Array(source.buffer);
        this.pixelIndex = source.pixelIndex;
        this.isComplete = source.isComplete;
    }

    save(filename: string): void {
        const png = new PNG({ width: this.width, height: this.height });
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = (y * this.width + x) * 4;
                const color = this.getPixel(x, y);
                png.data[idx] = color;
                png.data[idx + 1] = color;
                png.data[idx + 2] = color;
                png.data[idx + 3] = 255;
            }
        }
        const buffer = PNG.sync.write(png);
        const stream = createWriteStream(filename);
        stream.write(buffer);
        stream.end();
    }

    getWidth(): number {
        return this.width;
    }

    getHeight(): number {
        return this.height;
    }

    getPixelIndex(x: number, y: number): number {
        return y * this.width + x;
    }

    setComplete(complete: boolean): void {
        this.isComplete = complete;
    }
}
