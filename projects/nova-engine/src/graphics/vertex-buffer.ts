import { VertexAttribute } from './vertex-attribute';

export class VertexBuffer {
    gl: WebGL2RenderingContext;
    buffer: WebGLBuffer;
    numVertices: number;
    stride: number;
    usage: number;
    attributes: VertexAttribute[];

    constructor(gl: WebGL2RenderingContext, buffer: WebGLBuffer, numVertices: number, stride: number, usage: number, attributes: VertexAttribute[]) {
        this.gl = gl;
        this.buffer = buffer;
        this.numVertices = numVertices;
        this.stride = stride;
        this.usage = usage;
        this.attributes = attributes;
    }

    bind(): void {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    }

    upload(data: ArrayBuffer): void {
        this.bind();
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.usage);
    }

    update(data: ArrayBuffer, offset: number = 0): void {
        this.bind();
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset, data);
    }

    setAttributes(): void {
        this.bind();
        for (let i = 0; i < this.attributes.length; i++) {
            const attr = this.attributes[i];
            this.gl.enableVertexAttribArray(attr.location);
            this.gl.vertexAttribPointer(
                attr.location,
                attr.size,
                attr.type,
                attr.normalized,
                this.stride,
                attr.offset
            );
        }
    }

    destroy(): void {
        this.gl.deleteBuffer(this.buffer);
    }

    static createDynamic(gl: WebGL2RenderingContext, size: number): VertexBuffer {
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error('Failed to create WebGL buffer');
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, size, gl.DYNAMIC_DRAW);
        return new VertexBuffer(gl, buffer, 0, 0, gl.DYNAMIC_DRAW, []);
    }

    static createStatic(gl: WebGL2RenderingContext, data: ArrayBuffer): VertexBuffer {
        const buffer = gl.createBuffer();
        if (!buffer) throw new Error('Failed to create WebGL buffer');
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        return new VertexBuffer(gl, buffer, data.byteLength, 0, gl.STATIC_DRAW, []);
    }
}
