import { FrameBuffer } from './frame-buffer';

export class Display {
    private width: number = 64;
    private height: number = 32;
    private frameBuffer: FrameBuffer;
    private needsRedraw: boolean = false;

    constructor() {
        this.frameBuffer = new FrameBuffer(this.width, this.height);
    }

    clear(): void {
        this.frameBuffer.clear();
        this.needsRedraw = true;
    }

    drawSprite(x: number, y: number, spriteData: Uint8Array): boolean {
        let collision = false;
        
        for (let row = 0; row < spriteData.length; row++) {
            const spriteRow = spriteData[row];
            
            for (let col = 0; col < 8; col++) {
                const pixel = (spriteRow >> (7 - col)) & 1;
                
                if (pixel === 1) {
                    const screenX = (x + col) % this.width;
                    const screenY = (y + row) % this.height;
                    
                    const currentPixel = this.frameBuffer.getPixel(screenX, screenY);
                    this.frameBuffer.setPixel(screenX, screenY, currentPixel ^ 1);
                    
                    if (currentPixel === 1) {
                        collision = true;
                    }
                }
            }
        }
        
        this.needsRedraw = true;
        return collision;
    }

    getPixel(x: number, y: number): boolean {
        return this.frameBuffer.getPixel(x, y) === 1;
    }

    setPixel(x: number, y: number, value: boolean): void {
        this.frameBuffer.setPixel(x, y, value ? 1 : 0);
        this.needsRedraw = true;
    }

    togglePixel(x: number, y: number): boolean {
        const current = this.frameBuffer.getPixel(x, y);
        const newValue = current ^ 1;
        this.frameBuffer.setPixel(x, y, newValue);
        this.needsRedraw = true;
        return current === 1;
    }

    render(): void {
        this.frameBuffer.render();
        this.needsRedraw = false;
    }

    isDirty(): boolean {
        return this.needsRedraw;
    }

    markClean(): void {
        this.needsRedraw = false;
    }

    getDimensions(): { width: number; height: number } {
        return { width: this.width, height: this.height };
    }

    scrollUp(lines: number): void {
        const linesToScroll = Math.min(lines, this.height);
        
        for (let y = 0; y < this.height - linesToScroll; y++) {
            for (let x = 0; x < this.width; x++) {
                const sourceY = y + linesToScroll;
                const pixel = this.frameBuffer.getPixel(x, sourceY);
                this.frameBuffer.setPixel(x, y, pixel);
            }
        }
        
        for (let y = this.height - linesToScroll; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.frameBuffer.setPixel(x, y, 0);
            }
        }
        
        this.needsRedraw = true;
    }

    scrollDown(lines: number): void {
        const linesToScroll = Math.min(lines, this.height);
        
        for (let y = this.height - 1; y >= linesToScroll; y--) {
            for (let x = 0; x < this.width; x++) {
                const sourceY = y - linesToScroll;
                const pixel = this.frameBuffer.getPixel(x, sourceY);
                this.frameBuffer.setPixel(x, y, pixel);
            }
        }
        
        for (let y = 0; y < linesToScroll; y++) {
            for (let x = 0; x < this.width; x++) {
                this.frameBuffer.setPixel(x, y, 0);
            }
        }
        
        this.needsRedraw = true;
    }

    scrollLeft(cols: number): void {
        const colsToScroll = Math.min(cols, this.width);
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width - colsToScroll; x++) {
                const sourceX = x + colsToScroll;
                const pixel = this.frameBuffer.getPixel(sourceX, y);
                this.frameBuffer.setPixel(x, y, pixel);
            }
            
            for (let x = this.width - colsToScroll; x < this.width; x++) {
                this.frameBuffer.setPixel(x, y, 0);
            }
        }
        
        this.needsRedraw = true;
    }

    scrollRight(cols: number): void {
        const colsToScroll = Math.min(cols, this.width);
        
        for (let y = 0; y < this.height; y++) {
            for (let x = this.width - 1; x >= colsToScroll; x--) {
                const sourceX = x - colsToScroll;
                const pixel = this.frameBuffer.getPixel(sourceX, y);
                this.frameBuffer.setPixel(x, y, pixel);
            }
            
            for (let x = 0; x < colsToScroll; x++) {
                this.frameBuffer.setPixel(x, y, 0);
            }
        }
        
        this.needsRedraw = true;
    }

    saveScreenshot(): ImageData {
        const imageData = new ImageData(this.width, this.height);
        const data = imageData.data;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const pixel = this.frameBuffer.getPixel(x, y);
                const index = (y * this.width + x) * 4;
                
                data[index] = pixel * 255;     // R
                data[index + 1] = pixel * 255; // G
                data[index + 2] = pixel * 255; // B
                data[index + 3] = 255;         // A
            }
        }
        
        return imageData;
    }

    loadScreen(imageData: ImageData): void {
        const data = imageData.data;
        
        for (let y = 0; y < this.height && y < imageData.height; y++) {
            for (let x = 0; x < this.width && x < imageData.width; x++) {
                const index = (y * imageData.width + x) * 4;
                const brightness = (data[index] + data[index + 1] + data[index + 2]) / 3;
                const pixel = brightness > 127 ? 1 : 0;
                
                this.frameBuffer.setPixel(x, y, pixel);
            }
        }
        
        this.needsRedraw = true;
    }
}
