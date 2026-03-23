import { Texture } from './texture';
import { Shader } from './shader';
import { Color } from '../math';

export class Material {
    texture: Texture | null = null;
    shader: Shader | null = null;
    color: Color = new Color(1, 1, 1, 1);

    bind(): void {
        if (this.shader) {
            this.shader.enable();
        }
        if (this.texture) {
            this.texture.bind();
        }
    }

    setTexture(texture: Texture | null): void {
        this.texture = texture;
    }

    setShader(shader: Shader | null): void {
        this.shader = shader;
    }

    setColor(color: Color): void {
        this.color.copy(color);
    }

    enable(): void {
        if (this.shader) {
            this.shader.enable();
        }
    }

    disable(): void {
        if (this.shader) {
            this.shader.disable();
        }
    }
}
