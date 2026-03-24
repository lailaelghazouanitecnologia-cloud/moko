import { Display } from './display';
import { SpriteRenderer } from './sprite-renderer';

export class FrameBuffer {
    pixels: boolean[];
    width: number;
    height: number;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.pixels = new Array<boolean>(width * height).fill(false);
    }

    clear(): void {
        this.pixels.fill(false);
    }

    getPixel(x: number, y: number): boolean {
        const wrapped = this.wrapCoordinates(x, y);
        const index = wrapped.y * this.width + wrapped.x;
        return this.pixels[index];
    }

    setPixel(x: number, y: number, value: boolean): void {
        if (!this.isInBounds(x, y)) return;
        const wrapped = this.wrapCoordinates(x, y);
        const index = wrapped.y * this.width + wrapped.x;
        this.pixels[index] = value;
    }

    togglePixel(x: number, y: number): boolean {
        const wrapped = this.wrapCoordinates(x, y);
        const index = wrapped.y * this.width + wrapped.x;
        const oldValue = this.pixels[index];
        this.pixels[index] = !oldValue;
        return oldValue;
    }

    copy(): FrameBuffer {
        const buffer = new FrameBuffer(this.width, this.height);
        buffer.pixels = [...this.pixels];
        return buffer;
    }

    scrollUp(lines: number): void {
        const linesToScroll = Math.min(lines, this.height);
        for (let y = 0; y < this.height - linesToScroll; y++) {
            for (let x = 0; x < this.width; x++) {
                const srcIndex = (y + linesToScroll) * this.width + x;
                const dstIndex = y * this.width + x;
                this.pixels[dstIndex] = this.pixels[srcIndex];
            }
        }
        for (let y = this.height - linesToScroll; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const index = y * this.width + x;
                this.pixels[index] = false;
            }
        }
    }

    scrollDown(lines: number): void {
        const linesToScroll = Math.min(lines, this.height);
        for (let y = this.height - 1; y >= linesToScroll; y--) {
            for (let x = 0; x < this.width; x++) {
                const srcIndex = (y - linesToScroll) * this.width + x;
                const dstIndex = y * this.width + x;
                this.pixels[dstIndex] = this.pixels[srcIndex];
            }
        }
        for (let y = 0; y < linesToScroll; y++) {
            for (let x = 0; x < this.width; x++) {
                const index = y * this.width + x;
                this.pixels[index] = false;
            }
        }
    }

    scrollLeft(cols: number): void {
        const colsToScroll = Math.min(cols, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - colsToScroll; x++) {
                const srcIndex = y * this.width + x + colsToScroll;
                const dstIndex = y * this.width + x;
                this.pixels[dstIndex] = this.pixels[srcIndex];
            }
            for (let x = this.width - colsToScroll; x < this.width; x++) {
                const index = y * this.width + x;
                this.pixels[index] = false;
            }
        }
    }

    scrollRight(cols: number): void {
        const colsToScroll = Math.min(cols, this.width);
        for (let y = 0; y < this.height; y++) {
            for (let x = this.width - 1; x >= colsToScroll; x--) {
                const srcIndex = y * this.width + x - colsToScroll;
                const dstIndex = y * this.width + x;
                this.pixels[dstIndex] = this.pixels[srcIndex];
            }
            for (let x = 0; x < colsToScroll; x++) {
                const index = y * this.width + x;
                this.pixels[index] = false;
            }
        }
    }

    getRow(y: number): boolean[] {
        const row = new Array<boolean>(this.width);
        for (let x = 0; x < this.width; x++) {
            const index = y * this.width + x;
            row[x] = this.pixels[index];
        }
        return row;
    }

    setRow(y: number, row: boolean[]): void {
        for (let x = 0; x < this.width && x < row.length; x++) {
            const index = y * this.width + x;
            this.pixels[index] = row[x];
        }
    }

    getColumn(x: number): boolean[] {
        const col = new Array<boolean>(this.height);
        for (let y = 0; y < this.height; y++) {
            const index = y * this.width + x;
            col[y] = this.pixels[index];
        }
        return col;
    }

    setColumn(x: number, col: boolean[]): void {
        for (let y = 0; y < this.height && y < col.length; y++) {
            const index = y * this.width + x;
            this.pixels[index] = col[y];
        }
    }

    isInBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    wrapCoordinates(x: number, y: number): {x: number, y: number} {
        return {
            x: x & (this.width - 1),
            y: y & (this.height - 1)
        };
    }

    toImageData(): ImageData {
        const imageData = new ImageData(this.width, this.height);
        for (let i = 0; i < this.pixels.length; i++) {
            const pixelIndex = i * 4;
            const value = this.pixels[i] ? 255 : 0;
            imageData.data[pixelIndex] = value;
            imageData.data[pixelIndex + 1] = value;
            imageData.data[pixelIndex + 2] = value;
            imageData.data[pixelIndex + 3] = 255;
        }
        return imageData;
    }

    fromImageData(imageData: ImageData): void {
        if (imageData.width !== this.width || imageData.height !== this.height) {
            throw new Error('ImageData dimensions do not match FrameBuffer dimensions');
        }
        for (let i = 0; i < this.pixels.length; i++) {
            const pixelIndex = i * 4;
            const r = imageData.data[pixelIndex];
            const g = imageData.data[pixelIndex + 1];
            const b = imageData.data[pixelIndex + 2];
            this.pixels[i] = (r + g + b) > 382;
        }
    }
}
