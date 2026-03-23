import { EventEmitter } from '../core';
import { Vec2, Vec3, Vec4, Mat4 } from '../math';
import { GraphicsDevice } from './graphics-device';
import { Shader } from './shader';
import { Texture } from './texture';

export class ScopeSpace {
  private _device: GraphicsDevice;
  private _id: string;
  private _uniforms: Map<string, any> = new Map();
  private _textures: Map<string, Texture> = new Map();
  private _events: EventEmitter = new EventEmitter();

  constructor(device: GraphicsDevice, id: string) {
    this._device = device;
    this._id = id;
  }

  get id(): string {
    return this._id;
  }

  get device(): GraphicsDevice {
    return this._device;
  }

  set(name: string, value: any): void {
    if (value instanceof Texture) {
      this._textures.set(name, value);
    } else {
      this._uniforms.set(name, value);
    }
  }

  get(name: string): any {
    if (this._textures.has(name)) {
      return this._textures.get(name);
    }
    return this._uniforms.get(name);
  }

  has(name: string): boolean {
    return this._uniforms.has(name) || this._textures.has(name);
  }

  delete(name: string): boolean {
    const hadUniform = this._uniforms.delete(name);
    const hadTexture = this._textures.delete(name);
    return hadUniform || hadTexture;
  }

  clear(): void {
    this._uniforms.clear();
    this._textures.clear();
  }

  apply(shader: Shader): void {
    for (const [name, value] of this._uniforms) {
      const location = shader.getUniform(name);
      if (location !== null) {
        this._setUniform(location, value);
      }
    }

    let textureUnit = 0;
    for (const [name, texture] of this._textures) {
      const location = shader.getUniform(name);
      if (location !== null && textureUnit < this._device.maxTextureUnits) {
        this._device.activeTexture(this._device.TEXTURE0 + textureUnit);
        this._device.bindTexture(this._device.TEXTURE_2D, texture);
        this._device.uniform1i(location, textureUnit);
        textureUnit++;
      }
    }
  }

  private _setUniform(location: WebGLUniformLocation, value: any): void {
    const gl = this._device as any;
    if (Array.isArray(value)) {
      switch (value.length) {
        case 1: gl.uniform1f(location, value[0]); break;
        case 2: gl.uniform2fv(location, value); break;
        case 3: gl.uniform3fv(location, value); break;
        case 4: gl.uniform4fv(location, value); break;
        case 9: gl.uniformMatrix3fv(location, false, value); break;
        case 16: gl.uniformMatrix4fv(location, false, value); break;
      }
    } else if (typeof value === 'number') {
      gl.uniform1f(location, value);
    } else if (value instanceof Vec2) {
      gl.uniform2fv(location, [value.x, value.y]);
    } else if (value instanceof Vec3) {
      gl.uniform3fv(location, [value.x, value.y, value.z]);
    } else if (value instanceof Vec4) {
      gl.uniform4fv(location, [value.x, value.y, value.z, value.w]);
    } else if (value instanceof Mat4) {
      gl.uniformMatrix4fv(location, false, value.data);
    }
  }

  clone(): ScopeSpace {
    const cloned = new ScopeSpace(this._device, this._id);
    for (const [k, v] of this._uniforms) cloned._uniforms.set(k, v);
    for (const [k, v] of this._textures) cloned._textures.set(k, v);
    return cloned;
  }

  on(event: string, handler: (...args: any[]) => void): void {
    this._events.on(event, handler);
  }

  off(event: string, handler?: (...args: any[]) => void): void {
    this._events.off(event, handler);
  }

  emit(event: string, ...args: any[]): void {
    this._events.emit(event, ...args);
  }

  render(): void {
    // No-op for ScopeSpace; rendering is handled by higher-level objects
  }

  update(deltaTime: number): void {
    this.emit('update', deltaTime);
  }
}
