import { GraphicsDevice } from './graphics-device';

export class IndexBuffer {
  private buffer: WebGLBuffer;
  private indexCount: number;
  private format: number;
  private usage: number;
  private device: GraphicsDevice;

  private constructor(device: GraphicsDevice, indexCount: number, format: number, usage: number) {
    this.device = device;
    this.indexCount = indexCount;
    this.format = format;
    this.usage = usage;
    
    const gl = device.getGL();
    this.buffer = gl.createBuffer()!;
    if (!this.buffer) {
      throw new Error('Failed to create index buffer');
    }
  }

  static create(indexCount: number, format: number = WebGL2RenderingContext.UNSIGNED_SHORT, usage: number = WebGL2RenderingContext.STATIC_DRAW): IndexBuffer {
    const device = GraphicsDevice.getInstance();
    return new IndexBuffer(device, indexCount, format, usage);
  }

  setData(data: Uint16Array | Uint32Array): void {
    const gl = this.device.getGL();
    gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, this.buffer);
    gl.bufferData(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, data, this.usage);
    gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, null);
  }

  update(data: Uint16Array | Uint32Array, offset: number = 0): void {
    const gl = this.device.getGL();
    gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, offset, data);
    gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, null);
  }

  bind(): void {
    const gl = this.device.getGL();
    gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, this.buffer);
  }

  unbind(): void {
    const gl = this.device.getGL();
    gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, null);
  }

  destroy(): void {
    if (this.buffer) {
      const gl = this.device.getGL();
      gl.deleteBuffer(this.buffer);
      this.buffer = null!;
    }
  }
}
