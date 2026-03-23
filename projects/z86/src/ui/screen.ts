import { EventEmitter } from '../core';
import { Vec2 } from '../math';
import { GraphicsDevice } from '../graphics';

export class Screen extends EventEmitter {
    private _width: number;
    private _height: number;
    private _device: GraphicsDevice;
    private _elements: Element[] = [];
    private _isDisposed: boolean = false;

    constructor(device: GraphicsDevice, width: number, height: number) {
        super();
        this._device = device;
        this._width = width;
        this._height = height;
    }

    get width(): number {
        return this._width;
    }

    get height(): number {
        return this._height;
    }

    get device(): GraphicsDevice {
        return this._device;
    }

    addElement(element: Element): void {
        this._elements.push(element);
    }

    removeElement(element: Element): void {
        const index = this._elements.indexOf(element);
        if (index !== -1) {
            this._elements.splice(index, 1);
        }
    }

    getElements(): Element[] {
        return [...this._elements];
    }

    render(): void {
        if (this._isDisposed) return;

        this._device.clear(0, 0, 0, 1);
        
        for (const element of this._elements) {
            if (element.enabled) {
                element.render(this._device);
            }
        }
    }

    resize(width: number, height: number): void {
        this._width = width;
        this._height = height;
        this._device.setViewport(0, 0, width, height);
        
        for (const element of this._elements) {
            if (element.resize) {
                element.resize(width, height);
            }
        }
    }

    dispose(): void {
        if (this._isDisposed) return;

        for (const element of this._elements) {
            if (element.dispose) {
                element.dispose();
            }
        }
        this._elements.length = 0;
        this._isDisposed = true;
    }
}
