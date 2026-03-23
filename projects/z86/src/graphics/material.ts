import { Texture } from './Texture';
import { Shader } from './Shader';
import { Color } from '../math/Color';
import { WebGLDevice } from './WebGLDevice';

export class Material {
    private _texture: Texture | null = null;
    private _shader: Shader | null = null;
    private _color: Color = new Color(1, 1, 1, 1);
    private _gl: WebGLRenderingContext;

    constructor(gl: WebGLRenderingContext) {
        this._gl = gl;
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

    bind(): void {
        if (this._shader) {
            this._shader.enable();
        }
        if (this._texture) {
            this._texture.bind(0);
        }
    }

    enable(): void {
        const gl = this._gl;
        gl.enable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    disable(): void {
        const gl = this._gl;
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
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
}
