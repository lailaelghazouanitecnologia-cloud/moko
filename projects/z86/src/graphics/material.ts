import { Texture } from './texture';
import { Shader } from './shader';
import { Color } from '../math';

export class Material {
    private _texture: Texture | null = null;
    private _shader: Shader | null = null;
    private _color: Color = new Color(1, 1, 1, 1);
    private _enabled: boolean = true;

    constructor(texture?: Texture, shader?: Shader, color?: Color) {
        if (texture) this._texture = texture;
        if (shader) this._shader = shader;
        if (color) this._color.copy(color);
    }

    get texture(): Texture | null {
        return this._texture;
    }

    get shader(): Shader | null {
        return this._shader;
    }

    get color(): Color {
        return this._color;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    bind(): void {
        if (this._shader) {
            this._shader.enable();
        }
        if (this._texture) {
            this._texture.bind();
        }
    }

    unbind(): void {
        if (this._texture) {
            this._texture.unbind();
        }
        if (this._shader) {
            this._shader.disable();
        }
    }

    setTexture(texture: Texture | null): void {
        this._texture = texture;
    }

    setShader(shader: Shader | null): void {
        this._shader = shader;
    }

    setColor(color: Color): void {
        this._color.copy(color);
    }

    enable(): void {
        this._enabled = true;
    }

    disable(): void {
        this._enabled = false;
    }
}
