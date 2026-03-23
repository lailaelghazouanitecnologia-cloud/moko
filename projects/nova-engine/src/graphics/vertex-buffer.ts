import { GraphicsDevice } from './graphics-device';
import { VertexAttribute } from './vertex-attribute';

export class VertexBuffer {
  private buffer: WebGLBuffer;
  private vertexCount: number;
  private stride: number;
  private usage: number;
  private attributes: VertexAttribute[];
  private vao: WebGLVertexArrayObject;
  private device: GraphicsDevice;
  private gl: WebGL2RenderingContext;

  private constructor(device: GraphicsDevice, vertexCount: number, stride: number, usage: number = WebGL2RenderingContext.STATIC_DRAW) {
    this.device = device;
    this.gl = device.getGL();
    this.vertexCount = vertexCount;
    this.stride = stride;
    this.usage = usage;
    this.attributes = [];
    
    this.buffer = this.gl.createBuffer();
    if (!this.buffer) {
      throw new Error('Failed to create WebGL buffer');
    }
    
    this.vao = this.gl.createVertexArray();
    if (!this.vao) {
      throw new Error('Failed to create WebGL vertex array object');
    }
  }

  static create(vertexCount: number, stride: number, usage?: number): VertexBuffer {
    const device = GraphicsDevice.getInstance();
    return new VertexBuffer(device, vertexCount, stride, usage);
  }

  setData(data: ArrayBufferView): void {
    this.gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, data, this.usage);
    this.gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
  }

  update(data: ArrayBufferView, offset?: number): void {
    this.gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, this.buffer);
    if (offset !== undefined) {
      this.gl.bufferSubData(WebGL2RenderingContext.ARRAY_BUFFER, offset, data);
    } else {
      this.gl.bufferSubData(WebGL2RenderingContext.ARRAY_BUFFER, 0, data);
    }
    this.gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
  }

  bind(): void {
    this.gl.bindVertexArray(this.vao);
    this.gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, this.buffer);
    
    let offset = 0;
    for (let i = 0; i < this.attributes.length; i++) {
      const attr = this.attributes[i];
      this.gl.enableVertexAttribArray(i);
      this.gl.vertexAttribPointer(
        i,
        attr.size,
        attr.type || WebGL2RenderingContext.FLOAT,
        attr.normalized || false,
        this.stride,
        offset
      );
      offset += attr.size * this.getTypeSize(attr.type || WebGL2RenderingContext.FLOAT);
    }
  }

  unbind(): void {
    this.gl.bindVertexArray(null);
    this.gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
  }

  addAttribute(name: string, size: number, type?: number, normalized?: boolean): void {
    const attribute: VertexAttribute = {
      name,
      size,
      type: type || WebGL2RenderingContext.FLOAT,
      normalized: normalized || false
    };
    this.attributes.push(attribute);
  }

  getAttribute(name: string): VertexAttribute {
    const attr = this.attributes.find(a => a.name === name);
    if (!attr) {
      throw new Error(`Attribute '${name}' not found`);
    }
    return attr;
  }

  destroy(): void {
    if (this.buffer) {
      this.gl.deleteBuffer(this.buffer);
      this.buffer = null;
    }
    if (this.vao) {
      this.gl.deleteVertexArray(this.vao);
      this.vao = null;
    }
  }

  private getTypeSize(type: number): number {
    switch (type) {
      case WebGL2RenderingContext.BYTE:
      case WebGL2RenderingContext.UNSIGNED_BYTE:
        return 1;
      case WebGL2RenderingContext.SHORT:
      case WebGL2RenderingContext.UNSIGNED_SHORT:
      case WebGL2RenderingContext.HALF_FLOAT:
        return 2;
      case WebGL2RenderingContext.FLOAT:
      case WebGL2RenderingContext.INT:
      case WebGL2RenderingContext.UNSIGNED_INT:
        return 4;
      default:
        return 4;
    }
  }
}
