import { Shader } from '../graphics/shader';
import { Color } from '../math/color';
import { GraphicsDevice } from '../graphics/graphics-device';
import { CullMode } from '../graphics/cull-mode';
import { BlendMode } from '../graphics/blend-mode';

export class Material {
    private _shader: Shader | null = null;
    private _color: Color = Color.WHITE;
    private _emissive: Color = Color.BLACK;
    private _metallic: number = 0;
    private _roughness: number = 1;
    private _opacity: number = 1;
    private _cullMode: CullMode = CullMode.BACK;
    private _depthTest: boolean = true;
    private _depthWrite: boolean = true;
    private _blendMode: BlendMode = BlendMode.NONE;

    get shader(): Shader | null {
        return this._shader;
    }

    get color(): Color {
        return this._color;
    }

    get emissive(): Color {
        return this._emissive;
    }

    get metallic(): number {
        return this._metallic;
    }

    get roughness(): number {
        return this._roughness;
    }

    get opacity(): number {
        return this._opacity;
    }

    get cullMode(): CullMode {
        return this._cullMode;
    }

    get depthTest(): boolean {
        return this._depthTest;
    }

    get depthWrite(): boolean {
        return this._depthWrite;
    }

    get blendMode(): BlendMode {
        return this._blendMode;
    }

    setShader(shader: Shader): void {
        this._shader = shader;
    }

    setColor(color: Color): void {
        this._color = color;
    }

    setMetallic(metallic: number): void {
        this._metallic = metallic;
    }

    setRoughness(roughness: number): void {
        this._roughness = roughness;
    }

    setOpacity(opacity: number): void {
        this._opacity = opacity;
    }

    setCullMode(mode: CullMode): void {
        this._cullMode = mode;
    }

    setDepthTest(enable: boolean): void {
        this._depthTest = enable;
    }

    setDepthWrite(enable: boolean): void {
        this._depthWrite = enable;
    }

    setBlendMode(mode: BlendMode): void {
        this._blendMode = mode;
    }

    setEmissive(emissive: Color): void {
        this._emissive = emissive;
    }

    bind(device: GraphicsDevice): void {
        if (this._shader) {
            this._shader.bind(device);
        }
    }

    clone(): Material {
        const material = new Material();
        material._shader = this._shader;
        material._color = this._color.clone();
        material._emissive = this._emissive.clone();
        material._metallic = this._metallic;
        material._roughness = this._roughness;
        material._opacity = this._opacity;
        material._cullMode = this._cullMode;
        material._depthTest = this._depthTest;
        material._depthWrite = this._depthWrite;
        material._blendMode = this._blendMode;
        return material;
    }
}
