import { WebGLDevice } from './web-gl-device';

export interface VertexAttribute {
    name: string;
    type: number;
    numComponents: number;
    normalize: boolean;
    offset: number;
    bufferIndex: number;
}

export interface VertexElement {
    attributes: VertexAttribute[];
    stride: number;
    bufferIndex: number;
}

export class VertexFormat {
    private _device: WebGLDevice;
    private _elements: VertexElement[];
    private _attributes: Map<string, VertexAttribute>;
    private _stride: number;
    private _hasColor: boolean;
    private _hasUv: boolean;
    private _hasNormal: boolean;
    private _hasTangent: boolean;

    constructor(device: WebGLDevice, elements: VertexElement[]) {
        this._device = device;
        this._elements = elements;
        this._attributes = new Map<string, VertexAttribute>();
        this._stride = 0;
        this._hasColor = false;
        this._hasUv = false;
        this._hasNormal = false;
        this._hasTangent = false;

        this._parseElements();
    }

    private _parseElements(): void {
        for (const element of this._elements) {
            for (const attribute of element.attributes) {
                this._attributes.set(attribute.name, attribute);
                
                switch (attribute.name) {
                    case 'vertex_color':
                        this._hasColor = true;
                        break;
                    case 'vertex_texCoord0':
                    case 'vertex_texCoord1':
                        this._hasUv = true;
                        break;
                    case 'vertex_normal':
                        this._hasNormal = true;
                        break;
                    case 'vertex_tangent':
                        this._hasTangent = true;
                        break;
                }
            }
            
            if (element.stride > this._stride) {
                this._stride = element.stride;
            }
        }
    }

    get elements(): VertexElement[] {
        return this._elements;
    }

    get attributes(): Map<string, VertexAttribute> {
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

    get hasNormal(): boolean {
        return this._hasNormal;
    }

    get hasTangent(): boolean {
        return this._hasTangent;
    }

    static getAttributeTypeSize(type: number): number {
        switch (type) {
            case 0x1400: // BYTE
            case 0x1401: // UNSIGNED_BYTE
                return 1;
            case 0x1402: // SHORT
            case 0x1403: // UNSIGNED_SHORT
            case 0x1406: // HALF_FLOAT
                return 2;
            case 0x1404: // INT
            case 0x1405: // UNSIGNED_INT
            case 0x1406: // FLOAT
                return 4;
            default:
                return 4;
        }
    }

    static getAttributeTypeName(type: number): string {
        switch (type) {
            case 0x1400: return 'BYTE';
            case 0x1401: return 'UNSIGNED_BYTE';
            case 0x1402: return 'SHORT';
            case 0x1403: return 'UNSIGNED_SHORT';
            case 0x1404: return 'INT';
            case 0x1405: return 'UNSIGNED_INT';
            case 0x1406: return 'FLOAT';
            default: return 'UNKNOWN';
        }
    }
}
