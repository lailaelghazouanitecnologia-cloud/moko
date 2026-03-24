import { Display } from './display';

export class SpriteRenderer {
    private display: Display;

    constructor(display: Display) {
        this.display = display;
    }

    drawSprite(x: number, y: number, bytes: Uint8Array, height: number): boolean {
        let collision = false;
        
        for (let row = 0; row < height; row++) {
            const byte = bytes[row];
            if (this.drawByte(x, y + row, byte)) {
                collision = true;
            }
        }
        
        return collision;
    }

    drawByte(x: number, y: number, byte: number): boolean {
        const pixels = this.extractBits(byte);
        return this.drawPixelRow(x, y, pixels);
    }

    drawPixelRow(x: number, y: number, pixels: boolean[]): boolean {
        let collision = false;
        
        for (let i = 0; i < 8; i++) {
            if (pixels[i]) {
                const wrappedX = this.wrapX(x + i);
                const wrappedY = this.wrapY(y);
                
                if (wrappedX >= 0 && wrappedX < 64 && wrappedY >= 0 && wrappedY < 32) {
                    const currentPixel = this.display.getPixel(wrappedX, wrappedY);
                    this.display.setPixel(wrappedX, wrappedY, currentPixel !== pixels[i]);
                    
                    if (currentPixel && pixels[i]) {
                        collision = true;
                    }
                }
            }
        }
        
        return collision;
    }

    calculateCollision(x: number, y: number, byte: number): boolean {
        const pixels = this.extractBits(byte);
        
        for (let i = 0; i < 8; i++) {
            if (pixels[i]) {
                const wrappedX = this.wrapX(x + i);
                const wrappedY = this.wrapY(y);
                
                if (wrappedX >= 0 && wrappedX < 64 && wrappedY >= 0 && wrappedY < 32) {
                    if (this.display.getPixel(wrappedX, wrappedY)) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    extractBits(byte: number): boolean[] {
        const bits: boolean[] = [];
        
        for (let i = 0; i < 8; i++) {
            bits.push((byte & (0x80 >> i)) !== 0);
        }
        
        return bits;
    }

    wrapX(x: number): number {
        return x % 64;
    }

    wrapY(y: number): number {
        return y % 32;
    }

    drawExtendedSprite(x: number, y: number, bytes: Uint8Array): boolean {
        let collision = false;
        
        for (let row = 0; row < 16; row++) {
            const byte1 = bytes[row * 2];
            const byte2 = bytes[row * 2 + 1];
            const combinedByte = (byte1 << 8) | byte2;
            
            const pixels: boolean[] = [];
            for (let i = 0; i < 16; i++) {
                pixels.push((combinedByte & (0x8000 >> i)) !== 0);
            }
            
            for (let i = 0; i < 16; i++) {
                if (pixels[i]) {
                    const wrappedX = this.wrapX(x + i);
                    const wrappedY = this.wrapY(y + row);
                    
                    if (wrappedX >= 0 && wrappedX < 64 && wrappedY >= 0 && wrappedY < 32) {
                        const currentPixel = this.display.getPixel(wrappedX, wrappedY);
                        this.display.setPixel(wrappedX, wrappedY, currentPixel !== pixels[i]);
                        
                        if (currentPixel && pixels[i]) {
                            collision = true;
                        }
                    }
                }
            }
        }
        
        return collision;
    }

    drawQuirkSprite(x: number, y: number, bytes: Uint8Array, height: number): boolean {
        let collision = false;
        
        for (let row = 0; row < height; row++) {
            const byte = bytes[row];
            const pixels = this.extractBits(byte);
            
            for (let i = 0; i < 8; i++) {
                if (pixels[i]) {
                    const spriteX = x + i;
                    const spriteY = y + row;
                    
                    if (spriteX < 64 && spriteY < 32) {
                        const wrappedX = this.wrapX(spriteX);
                        const wrappedY = this.wrapY(spriteY);
                        
                        const currentPixel = this.display.getPixel(wrappedX, wrappedY);
                        this.display.setPixel(wrappedX, wrappedY, currentPixel !== pixels[i]);
                        
                        if (currentPixel && pixels[i]) {
                            collision = true;
                        }
                    }
                }
            }
        }
        
        return collision;
    }

    getSpriteBounds(x: number, y: number, width: number, height: number): {minX: number, maxX: number, minY: number, maxY: number} {
        return {
            minX: Math.max(0, x),
            maxX: Math.min(63, x + width - 1),
            minY: Math.max(0, y),
            maxY: Math.min(31, y + height - 1)
        };
    }

    optimizeDraw(x: number, y: number, bytes: Uint8Array): boolean {
        let collision = false;
        
        for (let row = 0; row < bytes.length; row++) {
            const byte = bytes[row];
            if (byte !== 0) {
                if (this.drawByte(x, y + row, byte)) {
                    collision = true;
                }
            }
        }
        
        return collision;
    }

    validateCoordinates(x: number, y: number): boolean {
        const wrappedX = this.wrapX(x);
        const wrappedY = this.wrapY(y);
        
        return wrappedX >= 0 && wrappedX < 64 && wrappedY >= 0 && wrappedY < 32;
    }
}
