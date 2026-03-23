import { Element } from './element';
import { EventEmitter } from '../core';
import { Vec2, Vec3, Vec4 } from '../math';
import { GraphicsDevice, Texture } from '../graphics';

export class Image extends Element {
    private _src: string = '';
    private _alt: string = '';
    private _texture: Texture | null = null;
    private _resourceLoader: EventEmitter;

    constructor() {
        super();
        this._resourceLoader = new EventEmitter();
    }

    get src(): string {
        return this._src;
    }

    set src(value: string) {
        if (this._src === value) return;
        this._src = value;
        this._loadTexture();
    }

    get alt(): string {
        return this._alt;
    }

    set alt(value: string) {
        this._alt = value;
    }

    private _loadTexture(): void {
        if (!this._src) {
            this._texture = null;
            return;
        }
        // Simulate async texture loading
        const loader = new EventEmitter();
        loader.once('load', (texture: Texture) => {
            this._texture = texture;
            this.fire('resize'); // trigger layout update
        });
        loader.once('error', () => {
            this._texture = null;
        });
        // In a real implementation, ResourceLoader would handle the fetch and decode
        // For now, we assume the texture is immediately available
        const dummyTexture = new Texture();
        setTimeout(() => loader.fire('load', dummyTexture), 0);
    }

    render(device: GraphicsDevice, screenWidth: number, screenHeight: number): void {
        if (!this.enabled) return;
        if (!this._texture) return;

        const worldPos = this.getWorldPosition();
        const worldSize = this.getWorldSize();

        const x = worldPos.x;
        const y = worldPos.y;
        const w = worldSize.x;
        const h = worldSize.y;

        // Simple quad rendering with texture
        const vertices = new Float32Array([
            x, y, 0, 0,
            x + w, y, 1, 0,
            x + w, y + h, 1, 1,
            x, y + h, 0, 1
        ]);

        const vertexBuffer = new VertexBuffer();
        vertexBuffer.setData(vertices);

        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
        const indexBuffer = new IndexBuffer();
        indexBuffer.setData(indices);

        device.setTexture(0, this._texture);
        device.draw(vertexBuffer, indexBuffer, 4, 6);
    }
}
