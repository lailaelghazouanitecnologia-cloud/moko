import { EventEmitter } from '../core/eventemitter';
import { Vec2 } from '../math/vec2';
import { Element } from './element';

export class LayoutGroup extends EventEmitter {
    private _children: Element[] = [];
    private _spacing: Vec2 = new Vec2(0, 0);
    private _padding: Vec2 = new Vec2(0, 0);
    private _orientation: 'horizontal' | 'vertical' = 'horizontal';
    private _alignment: 'start' | 'center' | 'end' = 'start';
    private _distribution: 'start' | 'center' | 'end' | 'space-between' | 'space-around' = 'start';
    private _wrap: boolean = false;
    private _width: number = 0;
    private _height: number = 0;

    constructor(options?: {
        spacing?: Vec2,
        padding?: Vec2,
        orientation?: 'horizontal' | 'vertical',
        alignment?: 'start' | 'center' | 'end',
        distribution?: 'start' | 'center' | 'end' | 'space-between' | 'space-around',
        wrap?: boolean,
        width?: number,
        height?: number
    }) {
        super();
        if (options) {
            if (options.spacing) this._spacing.copy(options.spacing);
            if (options.padding) this._padding.copy(options.padding);
            if (options.orientation) this._orientation = options.orientation;
            if (options.alignment) this._alignment = options.alignment;
            if (options.distribution) this._distribution = options.distribution;
            if (options.wrap !== undefined) this._wrap = options.wrap;
            if (options.width !== undefined) this._width = options.width;
            if (options.height !== undefined) this._height = options.height;
        }
    }

    addChild(child: Element): void {
        this._children.push(child);
        this.layout();
    }

    removeChild(child: Element): void {
        const index = this._children.indexOf(child);
        if (index !== -1) {
            this._children.splice(index, 1);
            this.layout();
        }
    }

    layout(): void {
        if (this._children.length === 0) return;

        const totalSpacing = this._spacing.clone().mulScalar(this._children.length - 1);
        const availableWidth = Math.max(0, this._width - this._padding.x * 2 - totalSpacing.x);
        const availableHeight = Math.max(0, this._height - this._padding.y * 2 - totalSpacing.y);

        let totalSize = 0;
        let maxCrossSize = 0;

        this._children.forEach(child => {
            if (this._orientation === 'horizontal') {
                totalSize += child.width;
                maxCrossSize = Math.max(maxCrossSize, child.height);
            } else {
                totalSize += child.height;
                maxCrossSize = Math.max(maxCrossSize, child.width);
            }
        });

        let offset = 0;
        let crossOffset = 0;

        if (this._distribution === 'center') {
            offset = (this._orientation === 'horizontal' ? availableWidth : availableHeight) / 2 - totalSize / 2;
        } else if (this._distribution === 'end') {
            offset = (this._orientation === 'horizontal' ? availableWidth : availableHeight) - totalSize;
        } else if (this._distribution === 'space-between' && this._children.length > 1) {
            const space = ((this._orientation === 'horizontal' ? availableWidth : availableHeight) - totalSize) / (this._children.length - 1);
            this._spacing = new Vec2(space, space);
        } else if (this._distribution === 'space-around') {
            const space = ((this._orientation === 'horizontal' ? availableWidth : availableHeight) - totalSize) / this._children.length;
            offset = space / 2;
            this._spacing = new Vec2(space, space);
        }

        if (this._alignment === 'center') {
            crossOffset = (this._orientation === 'horizontal' ? availableHeight : availableWidth) / 2 - maxCrossSize / 2;
        } else if (this._alignment === 'end') {
            crossOffset = (this._orientation === 'horizontal' ? availableHeight : availableWidth) - maxCrossSize;
        }

        let currentPos = 0;

        this._children.forEach((child, index) => {
            if (this._orientation === 'horizontal') {
                child.x = this._padding.x + offset + currentPos;
                child.y = this._padding.y + crossOffset + (maxCrossSize - child.height) / 2;
                currentPos += child.width + this._spacing.x;
            } else {
                child.x = this._padding.x + crossOffset + (maxCrossSize - child.width) / 2;
                child.y = this._padding.y + offset + currentPos;
                currentPos += child.height + this._spacing.y;
            }
        });
    }

    get spacing(): Vec2 {
        return this._spacing.clone();
    }

    set spacing(value: Vec2) {
        this._spacing.copy(value);
        this.layout();
    }

    get padding(): Vec2 {
        return this._padding.clone();
    }

    set padding(value: Vec2) {
        this._padding.copy(value);
        this.layout();
    }

    get orientation(): 'horizontal' | 'vertical' {
        return this._orientation;
    }

    set orientation(value: 'horizontal' | 'vertical') {
        this._orientation = value;
        this.layout();
    }

    get alignment(): 'start' | 'center' | 'end' {
        return this._alignment;
    }

    set alignment(value: 'start' | 'center' | 'end') {
        this._alignment = value;
        this.layout();
    }

    get distribution(): 'start' | 'center' | 'end' | 'space-between' | 'space-around' {
        return this._distribution;
    }

    set distribution(value: 'start' | 'center' | 'end' | 'space-between' | 'space-around') {
        this._distribution = value;
        this.layout();
    }

    get wrap(): boolean {
        return this._wrap;
    }

    set wrap(value: boolean) {
        this._wrap = value;
        this.layout();
    }

    get width(): number {
        return this._width;
    }

    set width(value: number) {
        this._width = value;
        this.layout();
    }

    get height(): number {
        return this._height;
    }

    set height(value: number) {
        this._height = value;
        this.layout();
    }

    get children(): Element[] {
        return [...this._children];
    }
}
