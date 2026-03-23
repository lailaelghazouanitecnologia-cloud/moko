import { Texture } from './texture';
import { Shader } from './shader';

export class Material {
    private texture: Texture | null = null;
    private shader: Shader | null = null;
    private color: Float32Array = new Float32Array([1, 1, 1, 1]);
    private isEnabled: boolean = false;

    constructor(texture?: Texture, shader?: Shader, color?: Float32Array) {
        if (texture) this.texture = texture;
        if (shader) this.shader = shader;
        if (color) this.color = new Float32Array(color);
    }

    bind(): void {
        if (this.shader) {
            this.shader.enable();
        }
        if (this.texture) {
            this.texture.bind();
        }
    }

    unbind(): void {
        if (this.texture) {
            this.texture.unbind();
        }
        if (this.shader) {
            this.shader.disable();
        }
    }

    setTexture(texture: Texture): void {
        this.texture = texture;
    }

    setShader(shader: Shader): void {
        this.shader = shader;
    }

    setColor(color: Float32Array): void {
        this.color = new Float32Array(color);
    }

    enable(): void {
        this.isEnabled = true;
    }

    disable(): void {
        this.isEnabled = false;
    }

    getTexture(): Texture | null {
        return this.texture;
    }

    getShader(): Shader | null {
        return this.shader;
    }

    getColor(): Float32Array {
        return this.color;
    }

    isMaterialEnabled(): boolean {
        return this.isEnabled;
    }
}
