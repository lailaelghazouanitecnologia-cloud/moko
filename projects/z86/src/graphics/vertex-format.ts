import { GraphicsDevice } from './graphics-device';

export interface VertexAttribute {
    name: string;
    offset: number;
    format: VertexFormat;
    bufferIndex: number;
}

export enum VertexElementType {
    INT8,
    UINT8,
    INT16,
    UINT16,
    INT32,
    UINT32,
    FLOAT32
}

export interface VertexElement {
    type: VertexElementType;
    numComponents: number;
    normalize: boolean;
}

export class VertexFormat {
    private _device: GraphicsDevice;
    private _elements: VertexElement[];
    private _attributes: VertexAttribute[];
    private _stride: number;
    private _hasColor: boolean;
    private _hasUv: boolean;
    private _hasTangent: boolean;
    private _hasNormal: boolean;

    constructor(device: GraphicsDevice, elements: VertexElement[], attributes: VertexAttribute[]) {
        this._device = device;
        this._elements = elements;
        this._attributes = attributes;
        this._stride = this._calculateStride();
        this._hasColor = this._checkHasColor();
        this._hasUv = this._checkHasUv();
        this._hasTangent = this._checkHasTangent();
        this._hasNormal = this._checkHasNormal();
    }

    get device(): GraphicsDevice {
        return this._device;
    }

    get elements(): VertexElement[] {
        return this._elements;
    }

    get attributes(): VertexAttribute[] {
        return this._attributes;
    }

    get stride(): number {
        return this._stride;
    }

    get hasColor(): boolean {
        return this._hasColor;
    }

    get hasUv(): boolean {
        return this._hasUv;
    }

    get hasTangent(): boolean {
        return this._hasTangent;
    }

    get hasNormal(): boolean {
        return this._hasNormal;
    }

    private _calculateStride(): number {
        let stride = 0;
        for (const element of this._elements) {
            stride += this._getElementSize(element);
        }
        return stride;
    }

    private _getElementSize(element: VertexElement): number {
        const typeSize = this._getTypeSize(element.type);
        return typeSize * element.numComponents;
    }

    private _getTypeSize(type: VertexElementType): number {
        switch (type) {
            case VertexElementType.INT8:
            case VertexElementType.UINT8:
                return 1;
            case VertexElementType.INT16:
            case VertexElementType.UINT16:
                return 2;
            case VertexElementType.INT32:
            case VertexElementType.UINT32:
            case VertexElementType.FLOAT32:
                return 4;
            default:
                throw new Error(`Unknown vertex element type: ${type}`);
        }
    }

    private _checkHasColor(): boolean {
        return this._attributes.some(attr => attr.name === 'color');
    }

    private _checkHasUv(): boolean {
        return this._attributes.some(attr => attr.name.startsWith('uv'));
    }

    private _checkHasTangent(): boolean {
        return this._attributes.some(attr => attr.name === 'tangent');
    }

    private _checkHasNormal(): boolean {
        return this._attributes.some(attr => attr.name === 'normal');
    }

    static createDefaultFormat(device: GraphicsDevice): VertexFormat {
        const elements: VertexElement[] = [
            { type: VertexElementType.FLOAT32, numComponents: 3, normalize: false }, // position
            { type: VertexElementType.FLOAT32, numComponents: 3, normalize: false }, // normal
            { type: VertexElementType.FLOAT32, numComponents: 2, normalize: false }  // uv
        ];

        const attributes: VertexAttribute[] = [
            { name: 'position', offset: 0, format: null as any, bufferIndex: 0 },
            { name: 'normal', offset: 12, format: null as any, bufferIndex: 0 },
            { name: 'uv', offset: 24, format: null as any, bufferIndex: 0 }
        ];

        const format = new VertexFormat(device, elements, attributes);
        
        // Set format references in attributes
        attributes[0].format = format;
        attributes[1].format = format;
        attributes[2].format = format;

        return format;
    }

    static createPosColorFormat(device: GraphicsDevice): VertexFormat {
        const elements: VertexElement[] = [
            { type: VertexElementType.FLOAT32, numComponents: 3, normalize: false }, // position
            { type: VertexElementType.FLOAT32, numComponents: 4, normalize: false }  // color
        ];

        const attributes: VertexAttribute[] = [
            { name: 'position', offset: 0, format: null as any, bufferIndex: 0 },
            { name: 'color', offset: 12, format: null as any, bufferIndex: 0 }
        ];

        const format = new VertexFormat(device, elements, attributes);
        
        attributes[0].format = format;
        attributes[1].format = format;

        return format;
    }

    static createPosUvFormat(device: GraphicsDevice): VertexFormat {
        const elements: VertexElement[] = [
            { type: VertexElementType.FLOAT32, numComponents: 3, normalize: false }, // position
            { type: VertexElementType.FLOAT32, numComponents: 2, normalize: false }  // uv
        ];

        const attributes: VertexAttribute[] = [
            { name: 'position', offset: 0, format: null as any, bufferIndex: 0 },
            { name: 'uv', offset: 12, format: null as any, bufferIndex: 0 }
        ];

        const format = new VertexFormat(device, elements, attributes);
        
        attributes[0].format = format;
        attributes[1].format = format;

        return format;
    }

    static createPosNormalUvFormat(device: GraphicsDevice): VertexFormat {
        return VertexFormat.createDefaultFormat(device);
    }

    static createPosNormalUvTangentFormat(device: GraphicsDevice): VertexFormat {
        const elements: VertexElement[] = [
            { type: VertexElementType.FLOAT32, numComponents: 3, normalize: false }, // position
            { type: VertexElementType.FLOAT32, numComponents: 3, normalize: false }, // normal
            { type: VertexElementType.FLOAT32, numComponents: 4, normalize: false }, // tangent
            { type: VertexElementType.FLOAT32, numComponents: 2, normalize: false }  // uv
        ];

        const attributes: VertexAttribute[] = [
            { name: 'position', offset: 0, format: null as any, bufferIndex: 0 },
            { name: 'normal', offset: 12, format: null as any, bufferIndex: 0 },
            { name: 'tangent', offset: 24, format: null as any, bufferIndex: 0 },
            { name: 'uv', offset: 40, format: null as any, bufferIndex: 0 }
        ];

        const format = new VertexFormat(device, elements, attributes);
        
        for (const attr of attributes) {
            attr.format = format;
        }

        return format;
    }

    static createSkinnedFormat(device: GraphicsDevice): VertexFormat {
        const elements: VertexElement[] = [
            { type: VertexElementType.FLOAT32, numComponents: 3, normalize: false }, // position
            { type: VertexElementType.FLOAT32, numComponents: 3, normalize: false }, // normal
            { type: VertexElementType.FLOAT32, numComponents: 4, normalize: false }, // tangent
            { type: VertexElementType.FLOAT32, numComponents: 2, normalize: false }, // uv
            { type: VertexElementType.UINT8, numComponents: 4, normalize: false }, // bone indices
            { type: VertexElementType.FLOAT32, numComponents: 4, normalize: false }  // bone weights
        ];

        const attributes: VertexAttribute[] = [
            { name: 'position', offset: 0, format: null as any, bufferIndex: 0 },
            { name: 'normal', offset: 12, format: null as any, bufferIndex: 0 },
            { name: 'tangent', offset: 24, format: null as any, bufferIndex: 0 },
            { name: 'uv', offset: 40, format: null as any, bufferIndex: 0 },
            { name: 'boneIndices', offset: 48, format: null as any, bufferIndex: 0 },
            { name: 'boneWeights', offset: 52, format: null as any, bufferIndex: 0 }
        ];

        const format = new VertexFormat(device, elements, attributes);
        
        for (const attr of attributes) {
            attr.format = format;
        }

        return format;
    }

    destroy(): void {
        this._device = null as any;
        this._elements = [];
        this._attributes = [];
    }
}
