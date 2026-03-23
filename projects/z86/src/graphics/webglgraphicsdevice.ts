import { GraphicsDevice } from './graphicsdevice';
import { Shader } from './shader';
import { Texture } from './texture';
import { RenderTarget } from './rendertarget';

export class WebglGraphicsDevice implements GraphicsDevice {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private shaderCache = new Map<string, WebGLShader>();
  private programCache = new Map<string, WebGLProgram>();
  private bufferCache = new Map<string, WebGLBuffer>();
  private currentProgram: WebGLProgram | null = null;
  private currentFramebuffer: WebGLFramebuffer | null = null;
  private viewport: { x: number; y: number; width: number; height: number } = { x: 0, y: 0, width: 0, height: 0 };
  private scissor: { x: number; y: number; width: number; height: number } | null = null;
  private blendEnabled = false;
  private depthTestEnabled = false;
  private cullFaceEnabled = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    this.gl = gl;
    this.viewport.width = canvas.width;
    this.viewport.height = canvas.height;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  createShader(source: string, type: 'vertex' | 'fragment'): Shader {
    if (!this.gl) throw new Error('WebGL context lost');
    const glType = type === 'vertex' ? this.gl.VERTEX_SHADER : this.gl.FRAGMENT_SHADER;
    const shader = this.gl.createShader(glType);
    if (!shader) throw new Error('Failed to create shader');
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${info}`);
    }
    const key = `${type}:${source}`;
    this.shaderCache.set(key, shader);
    return { handle: shader, type };
  }

  createProgram(vertexShader: Shader, fragmentShader: Shader): WebGLProgram {
    if (!this.gl) throw new Error('WebGL context lost');
    const key = `${vertexShader.handle}:${fragmentShader.handle}`;
    if (this.programCache.has(key)) {
      return this.programCache.get(key)!;
    }
    const program = this.gl.createProgram();
    if (!program) throw new Error('Failed to create program');
    this.gl.attachShader(program, vertexShader.handle as WebGLShader);
    this.gl.attachShader(program, fragmentShader.handle as WebGLShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Program linking error: ${info}`);
    }
    this.programCache.set(key, program);
    return program;
  }

  createBuffer(data: BufferSource, target: 'vertex' | 'index' | 'uniform'): WebGLBuffer {
    if (!this.gl) throw new Error('WebGL context lost');
    const glTarget = target === 'vertex' ? this.gl.ARRAY_BUFFER : target === 'index' ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.UNIFORM_BUFFER;
    const buffer = this.gl.createBuffer();
    if (!buffer) throw new Error('Failed to create buffer');
    this.gl.bindBuffer(glTarget, buffer);
    this.gl.bufferData(glTarget, data, this.gl.STATIC_DRAW);
    const key = `${target}:${data.byteLength}:${Math.random()}`;
    this.bufferCache.set(key, buffer);
    return buffer;
  }

  setViewport(x: number, y: number, width: number, height: number): void {
    if (!this.gl) return;
    this.viewport = { x, y, width, height };
    this.gl.viewport(x, y, width, height);
  }

  setScissor(x: number, y: number, width: number, height: number): void {
    if (!this.gl) return;
    this.scissor = { x, y, width, height };
    this.gl.scissor(x, y, width, height);
    this.gl.enable(this.gl.SCISSOR_TEST);
  }

  disableScissor(): void {
    if (!this.gl) return;
    this.scissor = null;
    this.gl.disable(this.gl.SCISSOR_TEST);
  }

  setBlendEnabled(enabled: boolean): void {
    if (!this.gl) return;
    this.blendEnabled = enabled;
    if (enabled) {
      this.gl.enable(this.gl.BLEND);
    } else {
      this.gl.disable(this.gl.BLEND);
    }
  }

  setBlendFunc(src: number, dst: number): void {
    if (!this.gl) return;
    this.gl.blendFunc(src, dst);
  }

  setDepthTestEnabled(enabled: boolean): void {
    if (!this.gl) return;
    this.depthTestEnabled = enabled;
    if (enabled) {
      this.gl.enable(this.gl.DEPTH_TEST);
    } else {
      this.gl.disable(this.gl.DEPTH_TEST);
    }
  }

  setDepthFunc(func: number): void {
    if (!this.gl) return;
    this.gl.depthFunc(func);
  }

  setCullFaceEnabled(enabled: boolean): void {
    if (!this.gl) return;
    this.cullFaceEnabled = enabled;
    if (enabled) {
      this.gl.enable(this.gl.CULL_FACE);
    } else {
      this.gl.disable(this.gl.CULL_FACE);
    }
  }

  setCullFace(mode: number): void {
    if (!this.gl) return;
    this.gl.cullFace(mode);
  }

  useProgram(program: WebGLProgram): void {
    if (!this.gl) return;
    this.currentProgram = program;
    this.gl.useProgram(program);
  }

  bindBuffer(buffer: WebGLBuffer, target: 'vertex' | 'index' | 'uniform'): void {
    if (!this.gl) return;
    const glTarget = target === 'vertex' ? this.gl.ARRAY_BUFFER : target === 'index' ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.UNIFORM_BUFFER;
    this.gl.bindBuffer(glTarget, buffer);
  }

  bindTexture(texture: Texture, unit: number): void {
    if (!this.gl) return;
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture.handle as WebGLTexture);
  }

  bindRenderTarget(target: RenderTarget | null): void {
    if (!this.gl) return;
    if (target) {
      this.currentFramebuffer = target.handle as WebGLFramebuffer;
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.currentFramebuffer);
      this.setViewport(0, 0, target.width, target.height);
    } else {
      this.currentFramebuffer = null;
      this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      this.setViewport(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  drawArrays(mode: number, first: number, count: number): void {
    if (!this.gl) return;
    this.gl.drawArrays(mode, first, count);
  }

  drawElements(mode: number, count: number, type: number, offset: number): void {
    if (!this.gl) return;
    this.gl.drawElements(mode, count, type, offset);
  }

  clear(mask: number): void {
    if (!this.gl) return;
    this.gl.clear(mask);
  }

  clearColor(r: number, g: number, b: number, a: number): void {
    if (!this.gl) return;
    this.gl.clearColor(r, g, b, a);
  }

  clearDepth(depth: number): void {
    if (!this.gl) return;
    this.gl.clearDepth(depth);
  }

  clearStencil(stencil: number): void {
    if (!this.gl) return;
    this.gl.clearStencil(stencil);
  }

  flush(): void {
    if (!this.gl) return;
    this.gl.flush();
  }

  finish(): void {
    if (!this.gl) return;
    this.gl.finish();
  }

  getPixelData(x: number, y: number, width: number, height: number): Uint8Array {
    if (!this.gl) throw new Error('WebGL context lost');
    const data = new Uint8Array(width * height * 4);
    this.gl.readPixels(x, y, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
    return data;
  }

  destroy(): void {
    if (!this.gl) return;
    const gl = this.gl;
    this.shaderCache.forEach(shader => gl.deleteShader(shader));
    this.programCache.forEach(program => gl.deleteProgram(program));
    this.bufferCache.forEach(buffer => gl.deleteBuffer(buffer));
    this.shaderCache.clear();
    this.programCache.clear();
    this.bufferCache.clear();
    this.gl = null;
  }

  get isContextLost(): boolean {
    return !this.gl || this.gl.isContextLost();
  }
}
