import { GraphicsDevice } from './graphics-device';
import { WebGLDevice } from './web-gl-device';
import { VertexFormat } from './vertex-format';
import { VertexBuffer } from './vertex-buffer';
import { IndexBuffer } from './index-buffer';
import { Shader } from './shader';
import { Texture } from './texture';
import { RenderTarget } from './render-target';
import { Material } from './material';
import { Mesh } from './mesh';
import { MeshInstance } from './mesh-instance';
import { ResourceLoader, Platform } from '../core';
import { Mat3, Mat4, BoundingBox } from '../math';

export class ScopeSpace {
    private scopes: Map<string, any>;
    private device: GraphicsDevice;

    constructor(device: GraphicsDevice) {
        this.device = device;
        this.scopes = new Map<string, any>();
    }

    addScope(name: string, value: any): void {
        this.scopes.set(name, value);
    }

    removeScope(name: string): boolean {
        return this.scopes.delete(name);
    }

    render(): void {
        for (const [name, value] of this.scopes) {
            if (this.device instanceof WebGLDevice) {
                const gl = (this.device as WebGLDevice).gl;
                const location = gl.getUniformLocation((this.device as any).currentProgram, name);
                if (location !== null) {
                    if (typeof value === 'number') {
                        gl.uniform1f(location, value);
                    } else if (value instanceof Mat4) {
                        gl.uniformMatrix4fv(location, false, value.data);
                    } else if (value instanceof Mat3) {
                        gl.uniformMatrix3fv(location, false, value.data);
                    } else if (Array.isArray(value)) {
                        if (value.length === 2) gl.uniform2fv(location, value);
                        else if (value.length === 3) gl.uniform3fv(location, value);
                        else if (value.length === 4) gl.uniform4fv(location, value);
                    } else if (value instanceof Texture) {
                        const unit = (this.device as any).activeTextureUnit++;
                        gl.activeTexture(gl.TEXTURE0 + unit);
                        gl.bindTexture(gl.TEXTURE_2D, (value as Texture).id);
                        gl.uniform1i(location, unit);
                    }
                }
            }
        }
    }
}
