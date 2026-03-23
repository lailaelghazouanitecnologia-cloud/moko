import { Color } from '../math/color';
import { Texture } from '../graphics/texture';
import { Shader } from '../graphics/shader';
import { GraphicsDevice } from '../graphics/graphics-device';

export enum CullMode {
    none = 'none',
    front = 'front',
    back = 'back'
}

export enum BlendMode {
    none = 'none',
    normal = 'normal',
    additive = 'additive',
    multiply = 'multiply'
}

export class Material {
    name: string = 'Material';
    shader: Shader;
    diffuse: Color = new Color(1, 1, 1);
    specular: Color = new Color(0.5, 0.5, 0.5);
    shininess: number = 32;
    emissive: Color = new Color(0, 0, 0);
    opacity: number = 1;
    textures: Map<string, Texture> = new Map();
    cull: CullMode = CullMode.back;
    blend: BlendMode = BlendMode.none;

    setTexture(name: string, texture: Texture): void {
        this.textures.set(name, texture);
    }

    getTexture(name: string): Texture | null {
        return this.textures.get(name) || null;
    }

    setShader(shader: Shader): void {
        this.shader = shader;
    }

    getShader(): Shader {
        return this.shader;
    }

    setDiffuse(color: Color): void {
        this.diffuse.copy(color);
    }

    setSpecular(color: Color): void {
        this.specular.copy(color);
    }

    setOpacity(value: number): void {
        this.opacity = value;
        this.blend = value < 1 ? BlendMode.normal : BlendMode.none;
    }

    isTransparent(): boolean {
        return this.opacity < 1;
    }

    bind(device: GraphicsDevice): void {
        const gl = device.gl;
        if (!gl) return;

        if (this.shader) {
            this.shader.enable();
        }

        if (this.cull === CullMode.none) {
            gl.disable(gl.CULL_FACE);
        } else {
            gl.enable(gl.CULL_FACE);
            gl.cullFace(this.cull === CullMode.front ? gl.FRONT : gl.BACK);
        }

        if (this.blend === BlendMode.none) {
            gl.disable(gl.BLEND);
        } else {
            gl.enable(gl.BLEND);
            switch (this.blend) {
                case BlendMode.normal:
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                    break;
                case BlendMode.additive:
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
                    break;
                case BlendMode.multiply:
                    gl.blendFunc(gl.DST_COLOR, gl.ZERO);
                    break;
            }
        }

        let unit = 0;
        this.textures.forEach((texture, name) => {
            texture.bind(unit);
            unit++;
        });
    }

    clone(): Material {
        const m = new Material();
        m.name = this.name;
        m.shader = this.shader;
        m.diffuse = this.diffuse.clone();
        m.specular = this.specular.clone();
        m.shininess = this.shininess;
        m.emissive = this.emissive.clone();
        m.opacity = this.opacity;
        m.cull = this.cull;
        m.blend = this.blend;
        this.textures.forEach((tex, key) => {
            m.textures.set(key, tex);
        });
        return m;
    }
}
