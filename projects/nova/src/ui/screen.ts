import { Entity } from '../scene';
import { Vec2 } from '../math';
import { ForwardRenderer } from '../scene';
import { InputManager } from '../input';
import { Element } from './element';

export class Screen extends Entity {
    resolution: Vec2;
    referenceResolution: Vec2;
    scaleMode: string;
    screenSpace: boolean;
    priority: number;
    elements: Element[];

    constructor() {
        super();
        this.resolution = new Vec2(1280, 720);
        this.referenceResolution = new Vec2(1280, 720);
        this.scaleMode = 'blend';
        this.screenSpace = true;
        this.priority = 0;
        this.elements = [];
    }

    setResolution(width: number, height: number): void {
        this.resolution.x = width;
        this.resolution.y = height;
    }

    setReferenceResolution(width: number, height: number): void {
        this.referenceResolution.x = width;
        this.referenceResolution.y = height;
    }

    setScaleMode(mode: string): void {
        this.scaleMode = mode;
    }

    getScale(): Vec2 {
        const scaleX = this.resolution.x / this.referenceResolution.x;
        const scaleY = this.resolution.y / this.referenceResolution.y;
        
        if (this.scaleMode === 'none') {
            return new Vec2(1, 1);
        } else if (this.scaleMode === 'blend') {
            const uniformScale = Math.min(scaleX, scaleY);
            return new Vec2(uniformScale, uniformScale);
        } else if (this.scaleMode === 'blend-zoom') {
            const uniformScale = Math.max(scaleX, scaleY);
            return new Vec2(uniformScale, uniformScale);
        }
        
        return new Vec2(scaleX, scaleY);
    }

    addElement(element: Element): void {
        if (!this.elements.includes(element)) {
            this.elements.push(element);
            if (element.entity && element.entity.parent !== this) {
                this.addChild(element.entity);
            }
        }
    }

    removeElement(element: Element): void {
        const index = this.elements.indexOf(element);
        if (index !== -1) {
            this.elements.splice(index, 1);
            if (element.entity && element.entity.parent === this) {
                this.removeChild(element.entity);
            }
        }
    }

    getElementAt(x: number, y: number): Element {
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const element = this.elements[i];
            if (element.containsPoint && element.containsPoint(x, y)) {
                return element;
            }
        }
        return null;
    }

    updateLayout(): void {
        for (const element of this.elements) {
            if (element.updateLayout) {
                element.updateLayout();
            }
        }
    }

    handleInput(input: InputManager): void {
        for (const element of this.elements) {
            if (element.handleInput) {
                element.handleInput(input);
            }
        }
    }

    render(renderer: ForwardRenderer): void {
        for (const element of this.elements) {
            if (element.render && element.enabled !== false) {
                element.render(renderer);
            }
        }
    }
}
