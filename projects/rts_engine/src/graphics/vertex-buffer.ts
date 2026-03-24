/**
 * Represents a GPU vertex data buffer.
 * Provides methods to upload vertex data and query vertex count.
 */
export interface IVertexBuffer {
  /**
   * Uploads new vertex data to the GPU buffer.
   * @param data - The raw vertex data to upload.
   * @throws {TypeError} If data is not a valid ArrayBufferView.
   * @throws {RangeError} If data.byteLength is zero.
   */
  setData(data: ArrayBufferView): void;

  /**
   * Returns the number of vertices currently stored in the buffer.
   * @returns The vertex count.
   */
  getCount(): number;
}

interface GPUBuffer {
  destroy(): void;
  unmap(): void;
  getMappedRange(): ArrayBuffer;
}

interface GPUDevice {
  createBuffer(descriptor: {
    size: number;
    usage: number;
    mappedAtCreation: boolean;
  }): GPUBuffer;
}

declare const GPUBufferUsage: {
  VERTEX: number;
};

/**
 * Concrete implementation of IVertexBuffer.
 * Manages a WebGL or WebGPU buffer internally.
 */
export class VertexBuffer implements IVertexBuffer {
  private buffer: GPUBuffer | WebGLBuffer | null = null;
  private vertexCount: number = 0;
  private device: GPUDevice | WebGLRenderingContext | WebGL2RenderingContext | null = null;

  constructor(device: GPUDevice | WebGLRenderingContext | WebGL2RenderingContext) {
  this.device = device;
  }

  /**
   * @inheritdoc
   */
  public setData(data: ArrayBufferView): void {
    if (!data || !(data.buffer instanceof ArrayBuffer)) {
      throw new TypeError('Invalid data: expected an ArrayBufferView');
    }
    if (data.byteLength === 0) {
      throw new RangeError('Cannot upload empty buffer');
    }

    // WebGPU path
    if (this.device && 'createBuffer' in this.device) {
      const gpuDevice = this.device as GPUDevice;
      if (this.buffer) {
        (this.buffer as GPUBuffer).destroy();
      }
      this.buffer = gpuDevice.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
      });
      new Uint8Array((this.buffer as GPUBuffer).getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      (this.buffer as GPUBuffer).unmap();
    }
    // WebGL path
    else if (this.device && 'ARRAY_BUFFER' in this.device) {
      const gl = this.device as WebGLRenderingContext | WebGL2RenderingContext;
      if (!this.buffer) {
        this.buffer = gl.createBuffer();
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer as WebGLBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    } else {
      throw new Error('Unsupported graphics context');
    }

    this.vertexCount = this.calculateVertexCount(data);
  }

  /**
   * @inheritdoc
   */
  public getCount(): number {
    return this.vertexCount;
  }

  /**
   * Calculates the number of vertices based on the byte length of the data.
   * Assumes a default stride of 32 bytes (e.g., position, normal, texcoord).
   * @param data - The uploaded buffer view.
   * @returns The number of vertices.
   */
  private calculateVertexCount(data: ArrayBufferView): number {
    const stride = 32; // bytes per vertex
    return Math.floor(data.byteLength / stride);
  }

  /**
   * Releases GPU resources.
   */
  public dispose(): void {
    if (this.buffer) {
      if ('destroy' in this.buffer) {
        (this.buffer as GPUBuffer).destroy();
      } else if (this.device && 'deleteBuffer' in this.device) {
        (this.device as WebGLRenderingContext).deleteBuffer(this.buffer as WebGLBuffer);
      }
      this.buffer = null;
    }
    this.device = null;
  }
}
