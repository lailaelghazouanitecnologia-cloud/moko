import { Element } from './element';
import { Texture } from '../graphics';
import { Color, Vec4 } from '../math';

export class Image extends Element {
    texture: Texture | null = null;
    sprite: any | null = null;
    color: Color = new Color(1, 1, 1, 1);
    opacity: number = 1;
    fillMode: string = 'stretch';
    preserveAspect: boolean = false;
    slice: Vec4 = new Vec4(0, 0, 1, 1);
    pixelsPerUnit: number = 100;

    setTexture(texture: Texture): void {
        this.texture = texture;
        this.updateMesh();
    }

    setSprite(sprite: any): void {
        this.sprite = sprite;
        this.updateMesh();
    }

    setColor(color: Color): void {
        this.color = color;
        this.updateMesh();
    }

    setOpacity(opacity: number): void {
        this.opacity = Math.max(0, Math.min(1, opacity));
        this.updateMesh();
    }

    setFillMode(mode: string): void {
        this.fillMode = mode;
        this.updateMesh();
    }

    setPreserveAspect(preserve: boolean): void {
        this.preserveAspect = preserve;
        this.updateMesh();
    }

    setSlice(left: number, bottom: number, right: number, top: number): void {
        this.slice.set(left, bottom, right, top);
        this.updateMesh();
    }

    setPixelsPerUnit(ppu: number): void {
        this.pixelsPerUnit = Math.max(0.01, ppu);
        this.updateMesh();
    }

    getAspectRatio(): number {
        if (this.texture) {
            return this.texture.width / this.texture.height;
        }
        if (this.sprite && this.sprite.texture) {
            return this.sprite.texture.width / this.sprite.texture.height;
        }
        return 1;
    }

    updateMesh(): void {
        // Implementation depends on UI rendering system
        // This would regenerate the mesh based on current properties
    }
}
