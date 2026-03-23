import { EventEmitter } from '../core/event-emitter';
import { Vec2 } from '../math/vec2';
import { GraphicsDevice } from '../graphics/graphics-device';
import { Element } from './element';

export class Screen extends EventEmitter {
    private _elements: Element[] = [];
    private _device: GraphicsDevice;
    private _size: Vec2 = new Vec2();
    private _resolution: Vec2 = new Vec2();
    private _scale: number = 1;
    private _canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement, device: GraphicsDevice) {
        super();
        this._canvas = canvas;
        this._device = device;
        this._updateSize();
        
        window.addEventListener('resize', this._onWindowResize.bind(this));
    }

    get elements(): Element[] {
        return this._elements.slice();
    }

    get width(): number {
        return this._size.x;
    }

    get height(): number {
        return this._size.y;
    }

    get resolution(): Vec2 {
        return this._resolution.clone();
    }

    get scale(): number {
        return this._scale;
    }

    addElement(element: Element): void {
        if (this._elements.indexOf(element) === -1) {
            this._elements.push(element);
            element.screen = this;
        }
    }

    removeElement(element: Element): void {
        const index = this._elements.indexOf(element);
        if (index !== -1) {
            this._elements.splice(index, 1);
            element.screen = null;
        }
    }

    render(): void {
        this._device.clear({
            color: [0, 0, 0, 1],
            depth: 1,
            stencil: 0
        });

        for (const element of this._elements) {
            if (element.enabled) {
                element.render();
            }
        }
    }

    resize(width: number, height: number): void {
        this._canvas.width = width;
        this._canvas.height = height;
        this._canvas.style.width = width + 'px';
        this._canvas.style.height = height + 'px';
        
        this._device.setViewport(0, 0, width, height);
        this._updateSize();
        
        this.emit('resize', this._size.x, this._size.y);
    }

    dispose(): void {
        window.removeEventListener('resize', this._onWindowResize.bind(this));
        
        for (const element of this._elements) {
            element.dispose();
        }
        this._elements.length = 0;
        
        this.emit('destroy');
        this.off();
    }

    private _updateSize(): void {
        const rect = this._canvas.getBoundingClientRect();
        this._size.set(rect.width, rect.height);
        this._resolution.set(this._canvas.width, this._canvas.height);
        this._scale = this._canvas.width / rect.width;
    }

    private _onWindowResize(): void {
        const rect = this._canvas.getBoundingClientRect();
        this.resize(rect.width, rect.height);
    }
}
