import { Element } from './element';

export class LayoutGroup extends Element {
    private _orientation: 'horizontal' | 'vertical';
    private _spacing: number;
    private _padding: number;
    private _children: Element[];

    constructor(id: string = '') {
        super(id);
        this._orientation = 'horizontal';
        this._spacing = 0;
        this._padding = 0;
        this._children = [];
    }

    get orientation(): 'horizontal' | 'vertical' {
        return this._orientation;
    }

    get spacing(): number {
        return this._spacing;
    }

    get padding(): number {
        return this._padding;
    }

    get children(): Element[] {
        return [...this._children];
    }

    addChild(child: Element): void {
        if (!child) {
            throw new Error('Child element is required');
        }
        
        if (this._children.includes(child)) {
            return;
        }

        this._children.push(child);
        child.parent = this;
        this.layout();
    }

    removeChild(child: Element): void {
        if (!child) {
            throw new Error('Child element is required');
        }

        const index = this._children.indexOf(child);
        if (index === -1) {
            return;
        }

        this._children.splice(index, 1);
        child.parent = null;
        this.layout();
    }

    setSpacing(value: number): void {
        if (typeof value !== 'number' || isNaN(value) || value < 0) {
            throw new Error('Spacing must be a non-negative number');
        }

        if (this._spacing !== value) {
            this._spacing = value;
            this.layout();
        }
    }

    setPadding(value: number): void {
        if (typeof value !== 'number' || isNaN(value) || value < 0) {
            throw new Error('Padding must be a non-negative number');
        }

        if (this._padding !== value) {
            this._padding = value;
            this.layout();
        }
    }

    setOrientation(value: 'horizontal' | 'vertical'): void {
        if (value !== 'horizontal' && value !== 'vertical') {
            throw new Error('Orientation must be "horizontal" or "vertical"');
        }

        if (this._orientation !== value) {
            this._orientation = value;
            this.layout();
        }
    }

    layout(): void {
        if (this._children.length === 0) {
            return;
        }

        let currentPosition = this._padding;

        for (const child of this._children) {
            if (this._orientation === 'horizontal') {
                child.x = this.x + currentPosition;
                child.y = this.y + this._padding;
                currentPosition += child.width + this._spacing;
            } else {
                child.x = this.x + this._padding;
                child.y = this.y + currentPosition;
                currentPosition += child.height + this._spacing;
            }
        }
    }

    clear(): void {
        for (const child of this._children) {
            child.parent = null;
        }
        this._children.length = 0;
        this.layout();
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (!this.visible) {
            return;
        }

        for (const child of this._children) {
            child.render(ctx);
        }
    }

    update(dt: number): void {
        for (const child of this._children) {
            child.update(dt);
        }
    }

    contains(x: number, y: number): boolean {
        if (!super.contains(x, y)) {
            return false;
        }

        for (const child of this._children) {
            if (child.contains(x, y)) {
                return true;
            }
        }

        return false;
    }

    setPosition(x: number, y: number): void {
        const deltaX = x - this.x;
        const deltaY = y - this.y;

        super.setPosition(x, y);

        for (const child of this._children) {
            child.x += deltaX;
            child.y += deltaY;
        }
    }
}
