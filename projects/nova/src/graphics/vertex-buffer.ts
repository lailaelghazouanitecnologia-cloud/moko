import { GraphicsDevice } from './graphics-device';
import { VertexFormat } from './vertex-format';

export class VertexBuffer {
  private _device: GraphicsDevice;
  private _gl: WebGLRenderingContext;
  private _buffer: WebGLBuffer | null = null;
  private _vertexFormat: VertexFormat;
  private _numVertices: number;
  private _usage: number;
  private _bytesPerVertex: number;
  private _numBytes: number;
  private _mappedData: ArrayBuffer | null = null;

  constructor(
    device: GraphicsDevice,
    vertexFormat: VertexFormat,
    numVertices: number,
    usage: number = 0x88E4 // GL_STATIC_DRAW
  ) {
    this._device = device;
    this._gl = (device as any).gl;
    this._vertexFormat = vertexFormat;
    this._numVertices = numVertices;
    this._usage = usage;
    this._bytesPerVertex = vertexFormat.size;
    this._numBytes = this._bytesPerVertex * numVertices;
    this._buffer = this._gl.createBuffer();
    if (!this._buffer) {
      throw new Error('Failed to create WebGL buffer');
    }
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._buffer);
    this._gl.bufferData(this._gl.ARRAY_BUFFER, this._numBytes, usage);
  }

  get vertexFormat(): VertexFormat {
    return this._vertexFormat;
  }

  get numVertices(): number {
    return this._numVertices;
  }

  get usage(): number {
    return this._usage;
  }

  get id(): WebGLBuffer | null {
    return this._buffer;
  }

  destroy(): void {
    if (this._buffer) {
      this._gl.deleteBuffer(this._buffer);
      this._buffer = null;
    }
  }

  lock(): ArrayBuffer {
    if (this._mappedData) {
      throw new Error('Buffer already locked');
    }
    this._mappedData = new ArrayBuffer(this._numBytes);
    return this._mappedData;
  }

  unlock(): void {
    if (!this._mappedData) {
      throw new Error('Buffer not locked');
    }
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._buffer);
    this._gl.bufferSubData(this._gl.ARRAY_BUFFER, 0, new Uint8Array(this._mappedData));
    this._mappedData = null;
  }

  setData(data: ArrayBuffer): void {
    if (data.byteLength !== this._numBytes) {
      throw new Error('Data size mismatch');
    }
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._buffer);
    this._gl.bufferSubData(this._gl.ARRAY_BUFFER, 0, new Uint8Array(data));
  }

  getData(): ArrayBuffer {
    const data = new ArrayBuffer(this._numBytes);
    const view = new Uint8Array(data);
    this._gl.bindBuffer(this._gl.ARRAY_BUFFER, this._buffer);
    this._gl.getBufferSubData(this._gl.ARRAY_BUFFER, 0, view);
    return data;
  }
}
