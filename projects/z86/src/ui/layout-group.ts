import { EventEmitter } from '../core';
import { Vec2, Vec3, Vec4 } from '../math';

export class LayoutGroup extends EventEmitter {
    private children: Element[] = [];
    private _enabled: boolean = true;
    private _spacing: number = 0;
    private _orientation: 'horizontal' | 'vertical' = 'horizontal';
    private _alignment: 'start' | 'center' | 'end' | 'stretch' = 'start';
    private _width: number = 0;
    private _height: number = 0;

    constructor() {
        super();
    }

    addChild(element: Element): void {
        this.children.push(element);
        this.layout();
    }

    removeChild(element: Element): void {
        const index = this.children.indexOf(element);
        if (index !== -1) {
            this.children.splice(index, 1);
            this.layout();
        }
    }

    layout(): void {
        if (!this._enabled) return;

        let offset = 0;
        const totalSpacing = Math.max(0, this.children.length - 1) * this._spacing;
        const totalSize = this._orientation === 'horizontal' ? this._width : this._height;
        const availableSize = totalSize - totalSpacing;

        let totalChildSize = 0;
        for (const child of this.children) {
            totalChildSize += this._orientation === 'horizontal' ? child.width : child.height;
        }

        let alignmentOffset = 0;
        if (this._alignment === 'center') {
            alignmentOffset = Math.max(0, (availableSize - totalChildSize) / 2);
        } else if (this._alignment === 'end') {
            alignmentOffset = Math.max(0, availableSize - totalChildSize);
        }

        offset += alignmentOffset;

        for (const child of this.children) {
            const childSize = this._orientation === 'horizontal' ? child.width : child.height;

            if (this._orientation === 'horizontal') {
                child.x = offset;
                if (this._alignment === 'stretch') {
                    child.y = 0;
                    child.height = this._height;
                } else if (this._alignment === 'center') {
                    child.y = (this._height - child.height) / 2;
                } else if (this._alignment === 'end') {
                    child.y = this._height - child.height;
                } else {
                    child.y = 0;
                }
            } else {
                child.y = offset;
                if (this._alignment === 'stretch') {
                    child.x = 0;
                    child.width = this._width;
                } else if (this._alignment === 'center') {
                    child.x = (this._width - child.width) / 2;
                } else if (this._alignment === 'end') {
                    child.x = this._width - child.width;
                } else {
                    child.x = 0;
                }
            }

            offset += childSize + this._spacing;
        }
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        if (this._enabled !== value) {
            this._enabled = value;
            this.layout();
        }
    }

    get spacing(): number {
        return this._spacing;
    }

    set spacing(value: number) {
        if (this._spacing !== value) {
            this._spacing = Math.max(0, value);
            this.layout();
        }
    }

    get orientation(): 'horizontal' | 'vertical' {
        return this._orientation;
    }

    set orientation(value: 'horizontal' | 'vertical') {
        if (this._orientation !== value) {
            this._orientation = value;
            this.layout();
        }
    }

    get alignment(): 'start' | 'center' | 'end' | 'stretch' {
        return this._alignment;
    }

    set alignment(value: 'start' | 'center' | 'end' | 'stretch') {
        if (this._alignment !== value) {
            this._alignment = value;
            this.layout();
        }
    }

    get width(): number {
        return this._width;
    }

    set width(value: number) {
        if (this._width !== value) {
            this._width = Math.max(0, value);
            this.layout();
        }
    }

    get height(): number {
        return this._height;
    }

    set height(value: number) {
        if (this._height !== value) {
            this._height = Math.max(0, value);
            this.layout();
        }
    }

    getChildren(): Element[] {
        return [...this.children];
    }

    clear(): void {
        this.children.length = 0;
        this.layout();
    }
}
