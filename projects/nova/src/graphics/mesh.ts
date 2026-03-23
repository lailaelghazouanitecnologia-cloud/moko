import { GraphicsDevice } from './graphics-device';
import { VertexBuffer } from './vertex-buffer';
import { IndexBuffer } from './index-buffer';
import { VertexFormat } from './vertex-format';
import { BoundingBox } from '../math';

export class Mesh {
    private _vertexBuffers: VertexBuffer[] = [];
    private _indexBuffer: IndexBuffer | null = null;
    private _vertexFormat: VertexFormat;
    private _boundingBox: BoundingBox;
    private _primitiveType: number;
    private _device: GraphicsDevice;

    constructor(device: GraphicsDevice, vertexFormat: VertexFormat, primitiveType: number = 4) {
        this._device = device;
        this._vertexFormat = vertexFormat;
        this._primitiveType = primitiveType;
        this._boundingBox = new BoundingBox();
    }

    get vertexBuffers(): VertexBuffer[] {
        return this._vertexBuffers;
    }

    get indexBuffer(): IndexBuffer | null {
        return this._indexBuffer;
    }

    get vertexFormat(): VertexFormat {
        return this._vertexFormat;
    }

    get boundingBox(): BoundingBox {
        return this._boundingBox;
    }

    get primitiveType(): number {
        return this._primitiveType;
    }

    setVertexBuffer(vertexBuffer: VertexBuffer, stream: number = 0): void {
        if (stream < 0 || stream >= this._vertexBuffers.length) {
            throw new Error('Invalid vertex buffer stream index');
        }
        this._vertexBuffers[stream] = vertexBuffer;
    }

    setIndexBuffer(indexBuffer: IndexBuffer): void {
        this._indexBuffer = indexBuffer;
    }

    updateBoundingBox(): void {
        this._boundingBox.center.set(0, 0, 0);
        this._boundingBox.halfExtents.set(0.5, 0.5, 0.5);
        
        if (this._vertexBuffers.length > 0 && this._vertexBuffers[0]) {
            const vb = this._vertexBuffers[0];
            const positions = vb.getData();
            const stride = this._vertexFormat.size / 4;
            const positionOffset = this._vertexFormat.elements.find(e => e.name === 'position')?.offset || 0;
            
            if (positions && positionOffset >= 0) {
                let minX = Number.MAX_VALUE;
                let minY = Number.MAX_VALUE;
                let minZ = Number.MAX_VALUE;
                let maxX = -Number.MAX_VALUE;
                let maxY = -Number.MAX_VALUE;
                let maxZ = -Number.MAX_VALUE;
                
                for (let i = 0; i < positions.length; i += stride) {
                    const x = positions[i + positionOffset / 4];
                    const y = positions[i + positionOffset / 4 + 1];
                    const z = positions[i + positionOffset / 4 + 2];
                    
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    minZ = Math.min(minZ, z);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                    maxZ = Math.max(maxZ, z);
                }
                
                this._boundingBox.center.set(
                    (minX + maxX) * 0.5,
                    (minY + maxY) * 0.5,
                    (minZ + maxZ) * 0.5
                );
                this._boundingBox.halfExtents.set(
                    (maxX - minX) * 0.5,
                    (maxY - minY) * 0.5,
                    (maxZ - minZ) * 0.5
                );
            }
        }
    }

    destroy(): void {
        for (const vb of this._vertexBuffers) {
            if (vb) {
                vb.destroy();
            }
        }
        this._vertexBuffers = [];
        
        if (this._indexBuffer) {
            this._indexBuffer.destroy();
            this._indexBuffer = null;
        }
    }

    prepareDraw(): void {
        const gl = (this._device as any).gl;
        
        for (let i = 0; i < this._vertexBuffers.length; i++) {
            const vb = this._vertexBuffers[i];
            if (vb) {
                vb.bind();
                
                const elements = this._vertexFormat.elements;
                let offset = 0;
                
                for (let j = 0; j < elements.length; j++) {
                    const element = elements[j];
                    gl.enableVertexAttribArray(element.stream);
                    gl.vertexAttribPointer(
                        element.stream,
                        element.numComponents,
                        element.dataType,
                        element.normalize,
                        this._vertexFormat.size,
                        offset
                    );
                    offset += element.size;
                }
            }
        }
        
        if (this._indexBuffer) {
            this._indexBuffer.bind();
        }
    }

    draw(): void {
        const gl = (this._device as any).gl;
        
        if (this._indexBuffer) {
            gl.drawElements(this._primitiveType, this._indexBuffer.numIndices, gl.UNSIGNED_SHORT, 0);
        } else if (this._vertexBuffers.length > 0 && this._vertexBuffers[0]) {
            const vb = this._vertexBuffers[0];
            gl.drawArrays(this._primitiveType, 0, vb.numVertices);
        }
    }
}
