import { GraphicsDevice } from './graphics-device';

export class Shader {
    program: WebGLProgram | null = null;
    uniforms: Map<string, WebGLUniformLocation> = new Map();
    attributes: Map<string, number> = new Map();

    compile(gl: WebGL2RenderingContext, vsSrc: string, fsSrc: string): boolean {
        const vs = gl.createShader(gl.VERTEX_SHADER);
        if (!vs) return false;
        gl.shaderSource(vs, vsSrc);
        gl.compileShader(vs);
        if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
            console.error('VS compile error:', gl.getShaderInfoLog(vs));
            gl.deleteShader(vs);
            return false;
        }

        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (!fs) {
            gl.deleteShader(vs);
            return false;
        }
        gl.shaderSource(fs, fsSrc);
        gl.compileShader(fs);
        if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
            console.error('FS compile error:', gl.getShaderInfoLog(fs));
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            return false;
        }

        const prog = gl.createProgram();
        if (!prog) {
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            return false;
        }
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(prog));
            gl.deleteShader(vs);
            gl.deleteShader(fs);
            gl.deleteProgram(prog);
            return false;
        }

        gl.deleteShader(vs);
        gl.deleteShader(fs);

        this.program = prog;

        const numUniforms = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(prog, i);
            if (info) {
                const loc = gl.getUniformLocation(prog, info.name);
                if (loc) this.uniforms.set(info.name, loc);
            }
        }

        const numAttribs = gl.getProgramParameter(prog, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttribs; i++) {
            const info = gl.getActiveAttrib(prog, i);
            if (info) {
                const loc = gl.getAttribLocation(prog, info.name);
                this.attributes.set(info.name, loc);
            }
        }

        return true;
    }

    bind(gl: WebGL2RenderingContext): void {
        if (this.program) gl.useProgram(this.program);
    }

    getUniform(name: string): WebGLUniformLocation | null {
        return this.uniforms.get(name) ?? null;
    }

    getAttrib(name: string): number {
        return this.attributes.get(name) ?? -1;
    }

    setUniform1f(loc: WebGLUniformLocation, v: number): void {
        const gl = (GraphicsDevice as any).gl as WebGL2RenderingContext;
        gl.uniform1f(loc, v);
    }

    setUniform2fv(loc: WebGLUniformLocation, v: Float32Array): void {
        const gl = (GraphicsDevice as any).gl as WebGL2RenderingContext;
        gl.uniform2fv(loc, v);
    }

    setUniform3fv(loc: WebGLUniformLocation, v: Float32Array): void {
        const gl = (GraphicsDevice as any).gl as WebGL2RenderingContext;
        gl.uniform3fv(loc, v);
    }

    setUniform4fv(loc: WebGLUniformLocation, v: Float32Array): void {
        const gl = (GraphicsDevice as any).gl as WebGL2RenderingContext;
        gl.uniform4fv(loc, v);
    }

    setUniformMatrix4fv(loc: WebGLUniformLocation, m: Float32Array): void {
        const gl = (GraphicsDevice as any).gl as WebGL2RenderingContext;
        gl.uniformMatrix4fv(loc, false, m);
    }

    setTexture(loc: WebGLUniformLocation, unit: number): void {
        const gl = (GraphicsDevice as any).gl as WebGL2RenderingContext;
        gl.uniform1i(loc, unit);
    }

    destroy(gl: WebGL2RenderingContext): void {
        if (this.program) {
            gl.deleteProgram(this.program);
            this.program = null;
        }
        this.uniforms.clear();
        this.attributes.clear();
    }

    static fromSources(gl: WebGL2RenderingContext, vs: string, fs: string): Shader | null {
        const shader = new Shader();
        if (!shader.compile(gl, vs, fs)) {
            return null;
        }
        return shader;
    }
}
