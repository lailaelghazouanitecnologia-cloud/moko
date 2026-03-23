import { EventEmitter } from '../core';
import { Vec2, Vec3, Vec4, Mat3, Mat4, Quat, Color } from '../math';
import { GraphicsDevice } from './graphics-device';
import { VertexFormat } from './vertex-format';

export class VertexBuffer {
  private _device: GraphicsDevice;
  private _gl: WebGLRenderingContext;
  private _buffer: WebGLBuffer | null = null;
  private _format: VertexFormat;
  private _numVertices: number;
  private _usage: number;
  private _bytesPerVertex: number;
  private _numBytes: number;
  private _dirty: boolean = true;

  constructor(device: GraphicsDevice, format: VertexFormat, numVertices: number, usage: number = WebGLRenderingContext.STATIC_DRAW) {
    this._device = device;
    this._gl = (device as any).gl;
    this._format = format;
    this._numVertices = numVertices;
    this._usage = usage;
    this._bytesPerVertex = format.size;
    this._numBytes = this._bytesPerVertex * numVertices;
    this._buffer = this._gl.createBuffer();
    if (!this._buffer) {
      throw new Error('Failed to create WebGL buffer');
    }
  }

  get format(): VertexFormat {
    return this._format;
  }

  get numVertices(): number {
    return this._numVertices;
  }

  get usage(): number {
    return this._usage;
  }

  get bytesPerVertex(): number {
    return this._bytesPerVertex;
  }

  get numBytes(): number {
    return this._numBytes;
  }

  bind(): void {
    if (!this._buffer) {
      throw new Error('VertexBuffer has been disposed');
    }
    this._gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, this._buffer);
  }

  unbind(): void {
    this._gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, null);
  }

  upload(data: ArrayBufferView): void {
    if (!this._buffer) {
      throw new Error('VertexBuffer has been disposed');
    }
    if (data.byteLength !== this._numBytes) {
      throw new Error(`Data size ${data.byteLength} does not match buffer size ${this._numBytes}`);
    }
    this.bind();
    this._gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, data, this._usage);
    this._dirty = false;
  }

  dispose(): void {
    if (this._buffer) {
      this._gl.deleteBuffer(this._buffer);
      this._buffer = null;
    }
  }

  get dirty(): boolean {
    return this._dirty;
  }

  setDirty(): void {
    this._dirty = true;
  }
}
