import { GraphicsDevice } from './graphicsdevice';

export interface VertexAttribute {
    name: string;
    offset: number;
    format: string;
    numComponents: number;
    normalize: boolean;
}

export class VertexFormat {
    attributes: VertexAttribute[];
    stride: number;
    private _device: GraphicsDevice;

    constructor(device: GraphicsDevice, attributes: VertexAttribute[]) {
        this._device = device;
        this.attributes = attributes;
        this.stride = this._calculateStride();
    }

    private _calculateStride(): number {
        let stride = 0;
        for (const attr of this.attributes) {
            const componentSize = this._getComponentSize(attr.format);
            stride += componentSize * attr.numComponents;
        }
        return stride;
    }

    private _getComponentSize(format: string): number {
        switch (format) {
            case 'byte':
            case 'ubyte':
                return 1;
            case 'short':
            case 'ushort':
            case 'half':
                return 2;
            case 'float':
            case 'int':
            case 'uint':
                return 4;
            default:
                throw new Error(`Unsupported vertex format: ${format}`);
        }
    }

    getAttribute(name: string): VertexAttribute | null {
        for (const attr of this.attributes) {
            if (attr.name === name) {
                return attr;
            }
        }
        return null;
    }

    hasAttribute(name: string): boolean {
        return this.getAttribute(name) !== null;
    }
}
