export class GraphicsDevice {
  gl: WebGL2RenderingContext;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  shaderCache = new Map<string, WebGLProgram>();
  currentProgram: WebGLProgram | null = null;
  currentTextureUnit = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: true });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    this.width = canvas.width;
    this.height = canvas.height;
    this.gl.getExtension('EXT_color_buffer_float');
  }

  setViewport(x: number, y: number, w: number, h: number) {
    this.gl.viewport(x, y, w, h);
  }

  clear(r: number, g: number, b: number, a: number) {
    const gl = this.gl;
    gl.clearColor(r, g, b, a);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  createShader(vsSrc: string, fsSrc: string, defines = ''): WebGLProgram {
    const key = `${defines}${vsSrc}${fsSrc}`;
    if (this.shaderCache.has(key)) return this.shaderCache.get(key)!;

    const gl = this.gl;
    const vs = this.compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSrc);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Shader link: ' + gl.getProgramInfoLog(prog));
    }
    this.shaderCache.set(key, prog);
    return prog;
  }

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile: ' + gl.getShaderInfoLog(s));
    }
    return s;
  }

  useProgram(p: WebGLProgram) {
    if (this.currentProgram !== p) {
      this.gl.useProgram(p);
      this.currentProgram = p;
    }
  }

  setUniform(name: string, v: number | Float32Array) {
    const p = this.currentProgram;
    if (!p) return;
    const loc = this.gl.getUniformLocation(p, name);
    if (loc === null) return;
    if (typeof v === 'number') {
      this.gl.uniform1f(loc, v);
    } else {
      switch (v.length) {
        case 2: this.gl.uniform2fv(loc, v); break;
        case 3: this.gl.uniform3fv(loc, v); break;
        case 4: this.gl.uniform4fv(loc, v); break;
        case 16: this.gl.uniformMatrix4fv(loc, false, v); break;
      }
    }
  }

  setTexture(name: string, texture: WebGLTexture) {
    const p = this.currentProgram;
    if (!p) return;
    const loc = this.gl.getUniformLocation(p, name);
    if (loc === null) return;
    const unit = this.currentTextureUnit++;
    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.uniform1i(loc, unit);
  }

  draw(mesh: Mesh) {
    const gl = this.gl;
    gl.bindVertexArray(mesh.vao);
    if (mesh.indexCount) {
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
    }
    this.currentTextureUnit = 0;
  }
}

export interface Mesh {
  vao: WebGLVertexArrayObject;
  vertexCount: number;
  indexCount?: number;
}

export async function createGraphicsDevice(canvas: HTMLCanvasElement): Promise<GraphicsDevice> {
  return new GraphicsDevice(canvas);
}
