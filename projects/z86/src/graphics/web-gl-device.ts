import { GraphicsDevice } from './graphics-device';
import { VertexFormat } from './vertex-format';
import { VertexBuffer } from './vertex-buffer';
import { IndexBuffer } from './index-buffer';
import { Shader } from './shader';
import { Texture } from './texture';
import { RenderTarget } from './render-target';
import { Material } from './material';
import { Mesh } from './mesh';
import { MeshInstance } from './mesh-instance';
import { ScopeSpace } from './scope-space';
import { EventEmitter } from '../core';

export class WebGLDevice extends GraphicsDevice {
    private _gl: WebGLRenderingContext | WebGL2RenderingContext;
    private _canvas: HTMLCanvasElement;
    private _contextAttributes: WebGLContextAttributes;
    private _extensions: Map<string, WebGLExtension> = new Map();
    private _programs: Map<string, WebGLProgram> = new Map();
    private _shaders: Map<string, WebGLShader> = new Map();
    private _buffers: Map<string, WebGLBuffer> = new Map();
    private _textures: Map<string, WebGLTexture> = new Map();
    private _framebuffers: Map<string, WebGLFramebuffer> = new Map();
    private _renderbuffers: Map<string, WebGLRenderbuffer> = new Map();
    private _uniformLocations: Map<string, WebGLUniformLocation> = new Map();
    private _activeInfo: Map<string, WebGLActiveInfo> = new Map();
    private _shaderPrecisionFormat: Map<string, WebGLShaderPrecisionFormat> = new Map();
    private _vertexArrayObjects: Map<string, WebGLVertexArrayObject> = new Map();
    private _queries: Map<string, WebGLQuery> = new Map();
    private _samplers: Map<string, WebGLSampler> = new Map();
    private _sync: Map<string, WebGLSync> = new Map();
    private _transformFeedback: Map<string, WebGLTransformFeedback> = new Map();

    constructor(canvas: HTMLCanvasElement, options?: WebGLContextAttributes) {
        super();
        this._canvas = canvas;
        this._contextAttributes = options || {};
        const gl = canvas.getContext('webgl2', this._contextAttributes) || canvas.getContext('webgl', this._contextAttributes);
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        this._gl = gl as WebGLRenderingContext | WebGL2RenderingContext;
        this.initializeExtensions();
    }

    private initializeExtensions(): void {
        const extNames = [
            'OES_texture_float',
            'OES_texture_half_float',
            'WEBGL_depth_texture',
            'OES_standard_derivatives',
            'EXT_shader_texture_lod',
            'WEBGL_draw_buffers',
            'EXT_texture_filter_anisotropic',
            'OES_vertex_array_object',
            'EXT_disjoint_timer_query',
            'EXT_disjoint_timer_query_webgl2',
            'WEBGL_lose_context',
            'WEBGL_debug_renderer_info',
            'WEBGL_debug_shaders',
            'WEBGL_compressed_texture_s3tc',
            'WEBGL_compressed_texture_etc1',
            'WEBGL_compressed_texture_etc',
            'WEBGL_compressed_texture_astc',
            'WEBGL_compressed_texture_pvrtc',
            'WEBGL_compressed_texture_etc2',
            'WEBGL_compressed_texture_eac',
            'EXT_color_buffer_float',
            'WEBGL_color_buffer_float',
            'EXT_color_buffer_half_float',
            'WEBGL_color_buffer_half_float',
            'EXT_sRGB',
            'WEBGL_compressed_texture_s3tc_srgb',
            'EXT_disjoint_timer_query_webgl2',
            'KHR_parallel_shader_compile',
            'WEBGL_multi_draw',
            'WEBGL_blend_func_extended',
            'WEBGL_multi_draw_instanced',
            'WEBGL_multi_draw_instanced_base_vertex_base_instance',
            'WEBGL_provoking_vertex',
            'WEBGL_render_shared_exponent',
            'WEBGL_request_video_frame_callback',
            'WEBGL_shader_pixel_local_storage',
            'WEBGL_stencil_texturing',
            'EXT_clip_cull_distance',
            'EXT_conservative_depth',
            'EXT_depth_clamp',
            'EXT_float_blend',
            'EXT_frag_depth',
            'EXT_shader_texture_lod',
            'EXT_texture_compression_bptc',
            'EXT_texture_compression_rgtc',
            'EXT_texture_filter_anisotropic',
            'EXT_texture_mirror_clamp_to_edge',
            'EXT_texture_norm16',
            'KHR_parallel_shader_compile',
            'NV_shader_noperspective_interpolation',
            'OES_draw_buffers_indexed',
            'OES_fbo_render_mipmap',
            'OES_standard_derivatives',
            'OES_texture_float',
            'OES_texture_float_linear',
            'OES_texture_half_float',
            'OES_texture_half_float_linear',
            'OES_texture_npot',
            'OES_vertex_array_object',
            'WEBGL_color_buffer_float',
            'WEBGL_color_buffer_half_float',
            'WEBGL_compressed_texture_astc',
            'WEBGL_compressed_texture_etc',
            'WEBGL_compressed_texture_etc1',
            'WEBGL_compressed_texture_pvrtc',
            'WEBGL_compressed_texture_s3tc',
            'WEBGL_compressed_texture_s3tc_srgb',
            'WEBGL_debug_renderer_info',
            'WEBGL_debug_shaders',
            'WEBGL_depth_texture',
            'WEBGL_draw_buffers',
            'WEBGL_lose_context',
            'WEBGL_multi_draw',
            'WEBGL_multi_draw_instanced',
            'WEBGL_multi_draw_instanced_base_vertex_base_instance',
            'WEBGL_provoking_vertex',
            'WEBGL_render_shared_exponent',
            'WEBGL_request_video_frame_callback',
            'WEBGL_shader_pixel_local_storage',
            'WEBGL_stencil_texturing'
        ];

        extNames.forEach(name => {
            const ext = this._gl.getExtension(name);
            if (ext) {
                this._extensions.set(name, ext);
            }
        });
    }

    public get gl(): WebGLRenderingContext | WebGL2RenderingContext {
        return this._gl;
    }

    public get canvas(): HTMLCanvasElement {
        return this._canvas;
    }

    public get contextAttributes(): WebGLContextAttributes {
        return this._contextAttributes;
    }

    public getExtension(name: string): WebGLExtension | null {
        return this._extensions.get(name) || null;
    }

    public createProgram(): WebGLProgram {
        const program = this._gl.createProgram();
        if (!program) {
            throw new Error('Failed to create WebGL program');
        }
        const id = `program-${Date.now()}-${Math.random()}`;
        this._programs.set(id, program);
        return program;
    }

    public deleteProgram(program: WebGLProgram): void {
        this._gl.deleteProgram(program);
        for (const [id, p] of this._programs.entries()) {
            if (p === program) {
                this._programs.delete(id);
                break;
            }
        }
    }

    public createShader(type: number): WebGLShader {
        const shader = this._gl.createShader(type);
        if (!shader) {
            throw new Error('Failed to create WebGL shader');
        }
        const id = `shader-${Date.now()}-${Math.random()}`;
        this._shaders.set(id, shader);
        return shader;
    }

    public deleteShader(shader: WebGLShader): void {
        this._gl.deleteShader(shader);
        for (const [id, s] of this._shaders.entries()) {
            if (s === shader) {
                this._shaders.delete(id);
                break;
            }
        }
    }

    public createBuffer(): WebGLBuffer {
        const buffer = this._gl.createBuffer();
        if (!buffer) {
            throw new Error('Failed to create WebGL buffer');
        }
        const id = `buffer-${Date.now()}-${Math.random()}`;
        this._buffers.set(id, buffer);
        return buffer;
    }

    public deleteBuffer(buffer: WebGLBuffer): void {
        this._gl.deleteBuffer(buffer);
        for (const [id, b] of this._buffers.entries()) {
            if (b === buffer) {
                this._buffers.delete(id);
                break;
            }
        }
    }

    public createTexture(): WebGLTexture {
        const texture = this._gl.createTexture();
        if (!texture) {
            throw new Error('Failed to create WebGL texture');
        }
        const id = `texture-${Date.now()}-${Math.random()}`;
        this._textures.set(id, texture);
        return texture;
    }

    public deleteTexture(texture: WebGLTexture): void {
        this._gl.deleteTexture(texture);
        for (const [id, t] of this._textures.entries()) {
            if (t === texture) {
                this._textures.delete(id);
                break;
            }
        }
    }

    public createFramebuffer(): WebGLFramebuffer {
        const framebuffer = this._gl.createFramebuffer();
        if (!framebuffer) {
            throw new Error('Failed to create WebGL framebuffer');
        }
        const id = `framebuffer-${Date.now()}-${Math.random()}`;
        this._framebuffers.set(id, framebuffer);
        return framebuffer;
    }

    public deleteFramebuffer(framebuffer: WebGLFramebuffer): void {
        this._gl.deleteFramebuffer(framebuffer);
        for (const [id, f] of this._framebuffers.entries()) {
            if (f === framebuffer) {
                this._framebuffers.delete(id);
                break;
            }
        }
    }

    public createRenderbuffer(): WebGLRenderbuffer {
        const renderbuffer = this._gl.createRenderbuffer();
        if (!renderbuffer) {
            throw new Error('Failed to create WebGL renderbuffer');
        }
        const id = `renderbuffer-${Date.now()}-${Math.random()}`;
        this._renderbuffers.set(id, renderbuffer);
        return renderbuffer;
    }

    public deleteRenderbuffer(renderbuffer: WebGLRenderbuffer): void {
        this._gl.deleteRenderbuffer(renderbuffer);
        for (const [id, r] of this._renderbuffers.entries()) {
            if (r === renderbuffer) {
                this._renderbuffers.delete(id);
                break;
            }
        }
    }

    public getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation | null {
        const location = this._gl.getUniformLocation(program, name);
        if (location) {
            const id = `uniform-${Date.now()}-${Math.random()}`;
            this._uniformLocations.set(id, location);
        }
        return location;
    }

    public getActiveAttrib(program: WebGLProgram, index: number): WebGLActiveInfo | null {
        const info = this._gl.getActiveAttrib(program, index);
        if (info) {
            const id = `active-attrib-${Date.now()}-${Math.random()}`;
            this._activeInfo.set(id, info);
        }
        return info;
    }

    public getActiveUniform(program: WebGLProgram, index: number): WebGLActiveInfo | null {
        const info = this._gl.getActiveUniform(program, index);
        if (info) {
            const id = `active-uniform-${Date.now()}-${Math.random()}`;
            this._activeInfo.set(id, info);
        }
        return info;
    }

    public getShaderPrecisionFormat(shaderType: number, precisionType: number): WebGLShaderPrecisionFormat | null {
        const format = this._gl.getShaderPrecisionFormat(shaderType, precisionType);
        if (format) {
            const id = `precision-format-${Date.now()}-${Math.random()}`;
            this._shaderPrecisionFormat.set(id, format);
        }
        return format;
    }

    public createVertexArray(): WebGLVertexArrayObject | null {
        const vao = this._gl.createVertexArray ? this._gl.createVertexArray() : null;
        if (vao) {
            const id = `vao-${Date.now()}-${Math.random()}`;
            this._vertexArrayObjects.set(id, vao);
        }
        return vao;
    }

    public deleteVertexArray(vao: WebGLVertexArrayObject): void {
        if (this._gl.deleteVertexArray) {
            this._gl.deleteVertexArray(vao);
            for (const [id, v] of this._vertexArrayObjects.entries()) {
                if (v === vao) {
                    this._vertexArrayObjects.delete(id);
                    break;
                }
            }
        }
    }

    public createQuery(): WebGLQuery | null {
        const query = this._gl.createQuery ? this._gl.createQuery() : null;
        if (query) {
            const id = `query-${Date.now()}-${Math.random()}`;
            this._queries.set(id, query);
        }
        return query;
    }

    public deleteQuery(query: WebGLQuery): void {
        if (this._gl.deleteQuery) {
            this._gl.deleteQuery(query);
            for (const [id, q] of this._queries.entries()) {
                if (q === query) {
                    this._queries.delete(id);
                    break;
                }
            }
        }
    }

    public createSampler(): WebGLSampler | null {
        const sampler = this._gl.createSampler ? this._gl.createSampler() : null;
        if (sampler) {
            const id = `sampler-${Date.now()}-${Math.random()}`;
            this._samplers.set(id, sampler);
        }
        return sampler;
    }

    public deleteSampler(sampler: WebGLSampler): void {
        if (this._gl.deleteSampler) {
            this._gl.deleteSampler(sampler);
            for (const [id, s] of this._samplers.entries()) {
                if (s === sampler) {
                    this._samplers.delete(id);
                    break;
                }
            }
        }
    }

    public fenceSync(condition: number, flags: number): WebGLSync | null {
        const sync = this._gl.fenceSync ? this._gl.fenceSync(condition, flags) : null;
        if (sync) {
            const id = `sync-${Date.now()}-${Math.random()}`;
            this._sync.set(id, sync);
        }
        return sync;
    }

    public deleteSync(sync: WebGLSync): void {
        if (this._gl.deleteSync) {
            this._gl.deleteSync(sync);
            for (const [id, s] of this._sync.entries()) {
                if (s === sync) {
                    this._sync.delete(id);
                    break;
                }
            }
        }
    }

    public createTransformFeedback(): WebGLTransformFeedback | null {
        const tf = this._gl.createTransformFeedback ? this._gl.createTransformFeedback() : null;
        if (tf) {
            const id = `transform-feedback-${Date.now()}-${Math.random()}`;
            this._transformFeedback.set(id, tf);
        }
        return tf;
    }

    public deleteTransformFeedback(tf: WebGLTransformFeedback): void {
        if (this._gl.deleteTransformFeedback) {
            this._gl.deleteTransformFeedback(tf);
            for (const [id, t] of this._transformFeedback.entries()) {
                if (t === tf) {
                    this._transformFeedback.delete(id);
                    break;
                }
            }
        }
    }

    public clear(color?: boolean, depth?: boolean, stencil?: boolean): void {
        let mask = 0;
        if (color) mask |= this._gl.COLOR_BUFFER_BIT;
        if (depth) mask |= this._gl.DEPTH_BUFFER_BIT;
        if (stencil) mask |= this._gl.STENCIL_BUFFER_BIT;
        this._gl.clear(mask);
    }

    public viewport(x: number, y: number, width: number, height: number): void {
        this._gl.viewport(x, y, width, height);
    }

    public scissor(x: number, y: number, width: number, height: number): void {
        this._gl.scissor(x, y, width, height);
    }

    public enable(cap: number): void {
        this._gl.enable(cap);
    }

    public disable(cap: number): void {
        this._gl.disable(cap);
    }

    public bindBuffer(target: number, buffer: WebGLBuffer | null): void {
        this._gl.bindBuffer(target, buffer);
    }

    public bindTexture(target: number, texture: WebGLTexture | null): void {
        this._gl.bindTexture(target, texture);
    }

    public bindFramebuffer(target: number, framebuffer: WebGLFramebuffer | null): void {
        this._gl.bindFramebuffer(target, framebuffer);
    }

    public bindRenderbuffer(target: number, renderbuffer: WebGLRenderbuffer | null): void {
        this._gl.bindRenderbuffer(target, renderbuffer);
    }

    public bindVertexArray(vao: WebGLVertexArrayObject | null): void {
        if (this._gl.bindVertexArray) {
            this._gl.bindVertexArray(vao);
        }
    }

    public useProgram(program: WebGLProgram | null): void {
        this._gl.useProgram(program);
    }

    public drawArrays(mode: number, first: number, count: number): void {
        this._gl.drawArrays(mode, first, count);
    }

    public drawElements(mode: number, count: number, type: number, offset: number): void {
        this._gl.drawElements(mode, count, type, offset);
    }

    public drawArraysInstanced(mode: number, first: number, count: number, instanceCount: number): void {
        if (this._gl.drawArraysInstanced) {
            this._gl.drawArraysInstanced(mode, first, count, instanceCount);
        }
    }

    public drawElementsInstanced(mode: number, count: number, type: number, offset: number, instanceCount: number): void {
        if (this._gl.drawElementsInstanced) {
            this._gl.drawElementsInstanced(mode, count, type, offset, instanceCount);
        }
    }

    public flush(): void {
        this._gl.flush();
    }

    public finish(): void {
        this._gl.finish();
    }

    public getError(): number {
        return this._gl.getError();
    }

    public getParameter(pname: number): any {
        return this._gl.getParameter(pname);
    }

    public getBufferParameter(target: number, pname: number): any {
        return this._gl.getBufferParameter(target, pname);
    }

    public getFramebufferAttachmentParameter(target: number, attachment: number, pname: number): any {
        return this._gl.getFramebufferAttachmentParameter(target, attachment, pname);
    }

    public getProgramParameter(program: WebGLProgram, pname: number): any {
        return this._gl.getProgramParameter(program, pname);
    }

    public getRenderbufferParameter(target: number, pname: number): any {
        return this._gl.getRenderbufferParameter(target, pname);
    }

    public getShaderParameter(shader: WebGLShader, pname: number): any {
        return this._gl.getShaderParameter(shader, pname);
    }

    public getTexParameter(target: number, pname: number): any {
        return this._gl.getTexParameter(target, pname);
    }

    public getUniform(program: WebGLProgram, location: WebGLUniformLocation): any {
        return this._gl.getUniform(program, location);
    }

    public getVertexAttrib(index: number, pname: number): any {
        return this._gl.getVertexAttrib(index, pname);
    }

    public isBuffer(buffer: WebGLBuffer): boolean {
        return this._gl.isBuffer(buffer);
    }

    public isEnabled(cap: number): boolean {
        return this._gl.isEnabled(cap);
    }

    public isFramebuffer(framebuffer: WebGLFramebuffer): boolean {
        return this._gl.isFramebuffer(framebuffer);
    }

    public isProgram(program: WebGLProgram): boolean {
        return this._gl.isProgram(program);
    }

    public isRenderbuffer(renderbuffer: WebGLRenderbuffer): boolean {
        return this._gl.isRenderbuffer(renderbuffer);
    }

    public isShader(shader: WebGLShader): boolean {
        return this._gl.isShader(shader);
    }

    public isTexture(texture: WebGLTexture): boolean {
        return this._gl.isTexture(texture);
    }

    public pixelStorei(pname: number, param: number): void {
        this._gl.pixelStorei(pname, param);
    }

    public readPixels(x: number, y: number, width: number, height: number, format: number, type: number, pixels: ArrayBufferView | null): void {
        this._gl.readPixels(x, y, width, height, format, type, pixels);
    }

    public renderbufferStorage(target: number, internalformat: number, width: number, height: number): void {
        this._gl.renderbufferStorage(target, internalformat, width, height);
    }

    public renderbufferStorageMultisample(target: number, samples: number, internalformat: number, width: number, height: number): void {
        if (this._gl.renderbufferStorageMultisample) {
            this._gl.renderbufferStorageMultisample(target, samples, internalformat, width, height);
        }
    }

    public sampleCoverage(value: number, invert: boolean): void {
        this._gl.sampleCoverage(value, invert);
    }

    public stencilFunc(func: number, ref: number, mask: number): void {
        this._gl.stencilFunc(func, ref, mask);
    }

    public stencilFuncSeparate(face: number, func: number, ref: number, mask: number): void {
        this._gl.stencilFuncSeparate(face, func, ref, mask);
    }

    public stencilMask(mask: number): void {
        this._gl.stencilMask(mask);
    }

    public stencilMaskSeparate(face: number, mask: number): void {
        this._gl.stencilMaskSeparate(face, mask);
    }

    public stencilOp(fail: number, zfail: number, zpass: number): void {
        this._gl.stencilOp(fail, zfail, zpass);
    }

    public stencilOpSeparate(face: number, fail: number, zfail: number, zpass: number): void {
        this._gl.stencilOpSeparate(face, fail, zfail, zpass);
    }

    public texImage2D(target: number, level: number, internalformat: number, width: number, height: number, border: number, format: number, type: number, pixels: ArrayBufferView | null): void;
    public texImage2D(target: number, level: number, internalformat: number, format: number, type: number, source: TexImageSource): void;
    public texImage2D(target: number, level: number, internalformat: number, widthOrFormat: number, heightOrType: number, borderOrSource: number | TexImageSource, format?: number, type?: number, pixels?: ArrayBufferView | null): void {
        if (arguments.length === 9) {
            this._gl.texImage2D(target, level, internalformat, widthOrFormat as number, heightOrType as number, borderOrSource as number, format!, type!, pixels);
        } else {
            this._gl.texImage2D(target, level, internalformat, widthOrFormat as number, heightOrType as number, borderOrSource as any);
        }
    }

    public texParameterf(target: number, pname: number, param: number): void {
        this._gl.texParameterf(target, pname, param);
    }

    public texParameteri(target: number, pname: number, param: number): void {
        this._gl.texParameteri(target, pname, param);
    }

    public texSubImage2D(target: number, level: number, xoffset: number, yoffset: number, width: number, height: number, format: number, type: number, pixels: ArrayBufferView | null): void;
    public texSubImage2D(target: number, level: number, xoffset: number, yoffset: number, format: number, type: number, source: TexImageSource): void;
    public texSubImage2D(target: number, level: number, xoffset: number, yoffset: number, widthOrFormat: number, heightOrType: number, formatOrSource: number | TexImageSource, type?: number, pixels?: ArrayBufferView | null): void {
        if (arguments.length === 9) {
            this._gl.texSubImage2D(target, level, xoffset, yoffset, widthOrFormat as number, heightOrType as number, formatOrSource as number, type!, pixels);
        } else {
            this._gl.texSubImage2D(target, level, xoffset, yoffset, widthOrFormat as number, heightOrType as number, formatOrSource as any);
        }
    }

    public uniform1f(location: WebGLUniformLocation, x: number): void {
        this._gl.uniform1f(location, x);
    }

    public uniform1fv(location: WebGLUniformLocation, v: Float32Array): void {
        this._gl.uniform1fv(location, v);
    }

    public uniform1i(location: WebGLUniformLocation, x: number): void {
        this._gl.uniform1i(location, x);
    }

    public uniform1iv(location: WebGLUniformLocation, v: Int32Array): void {
        this._gl.uniform1iv(location, v);
    }

    public uniform2f(location: WebGLUniformLocation, x: number, y: number): void {
        this._gl.uniform2f(location, x, y);
    }

    public uniform2fv(location: WebGLUniformLocation, v: Float32Array): void {
        this._gl.uniform2fv(location, v);
    }

    public uniform2i(location: WebGLUniformLocation, x: number, y: number): void {
        this._gl.uniform2i(location, x, y);
    }

    public uniform2iv(location: WebGLUniformLocation, v: Int32Array): void {
        this._gl.uniform2iv(location, v);
    }

    public uniform3f(location: WebGLUniformLocation, x: number, y: number, z: number): void {
        this._gl.uniform3f(location, x, y, z);
    }

    public uniform3fv(location: WebGLUniformLocation, v: Float32Array): void {
        this._gl.uniform3fv(location, v);
    }

    public uniform3i(location: WebGLUniformLocation, x: number, y: number, z: number): void {
        this._gl.uniform3i(location, x, y, z);
    }

    public uniform3iv(location: WebGLUniformLocation, v: Int32Array): void {
        this._gl.uniform3iv(location, v);
    }

    public uniform4f(location: WebGLUniformLocation, x: number, y: number, z: number, w: number): void {
        this._gl.uniform4f(location, x, y, z, w);
    }

    public uniform4fv(location: WebGLUniformLocation, v: Float32Array): void {
        this._gl.uniform4fv(location, v);
    }

    public uniform4i(location: WebGLUniformLocation, x: number, y: number, z: number, w: number): void {
        this._gl.uniform4i(location, x, y, z, w);
    }

    public uniform4iv(location: WebGLUniformLocation, v: Int32Array): void {
        this._gl.uniform4iv(location, v);
    }

    public uniformMatrix2fv(location: WebGLUniformLocation, transpose: boolean, value: Float32Array): void {
        this._gl.uniformMatrix2fv(location, transpose, value);
    }

    public uniformMatrix3fv(location: WebGLUniformLocation, transpose: boolean, value: Float32Array): void {
        this._gl.uniformMatrix3fv(location, transpose, value);
    }

    public uniformMatrix4fv(location: WebGLUniformLocation, transpose: boolean, value: Float32Array): void {
        this._gl.uniformMatrix4fv(location, transpose, value);
    }

    public vertexAttrib1f(index: number, x: number): void {
        this._gl.vertexAttrib1f(index, x);
    }

    public vertexAttrib1fv
