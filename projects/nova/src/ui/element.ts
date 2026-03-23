import { Entity } from '../scene';
import { Vec2, Vec3, Vec4 } from '../math';
import { Color } from '../graphics';
import { Screen } from './screen';

export class Element extends Entity {
    anchor: Vec4;
    pivot: Vec2;
    margin: Vec4;
    size: Vec2;
    color: Color;
    opacity: number;
    enabled: boolean;
    screen: Screen | null;

    constructor() {
        super();
        this.anchor = new Vec4(0.5, 0.5, 0.5, 0.5);
        this.pivot = new Vec2(0.5, 0.5);
        this.margin = new Vec4(0, 0, 0, 0);
        this.size = new Vec2(100, 100);
        this.color = new Color(1, 1, 1, 1);
        this.opacity = 1;
        this.enabled = true;
        this.screen = null;
    }

    setAnchor(x: number, y: number, x2?: number, y2?: number): void {
        if (x2 === undefined && y2 === undefined) {
            this.anchor.set(x, y, x, y);
        } else if (x2 !== undefined && y2 !== undefined) {
            this.anchor.set(x, y, x2, y2);
        }
    }

    setPivot(x: number, y: number): void {
        this.pivot.set(x, y);
    }

    setMargin(left: number, bottom: number, right: number, top: number): void {
        this.margin.set(left, bottom, right, top);
    }

    setSize(width: number, height: number): void {
        this.size.set(width, height);
    }

    setColor(r: number, g: number, b: number, a?: number): void {
        this.color.set(r, g, b, a !== undefined ? a : this.color.a);
        this.opacity = this.color.a;
    }

    getWorldPosition(): Vec3 {
        const worldPos = new Vec3();
        const parentSize = this.screen ? this.screen.getSize() : new Vec2(1920, 1080);
        
        const left = this.anchor.x * parentSize.x + this.margin.x;
        const bottom = this.anchor.y * parentSize.y + this.margin.y;
        const right = this.anchor.z * parentSize.x - this.margin.z;
        const top = this.anchor.w * parentSize.y - this.margin.w;
        
        const centerX = (left + right) * 0.5;
        const centerY = (bottom + top) * 0.5;
        
        worldPos.x = centerX - this.size.x * (this.pivot.x - 0.5);
        worldPos.y = centerY - this.size.y * (this.pivot.y - 0.5);
        worldPos.z = 0;
        
        return worldPos;
    }

    getWorldSize(): Vec2 {
        const parentSize = this.screen ? this.screen.getSize() : new Vec2(1920, 1080);
        
        const left = this.anchor.x * parentSize.x + this.margin.x;
        const bottom = this.anchor.y * parentSize.y + this.margin.y;
        const right = this.anchor.z * parentSize.x - this.margin.z;
        const top = this.anchor.w * parentSize.y - this.margin.w;
        
        const width = Math.max(0, right - left);
        const height = Math.max(0, top - bottom);
        
        return new Vec2(width, height);
    }

    containsPoint(x: number, y: number): boolean {
        const worldPos = this.getWorldPosition();
        const worldSize = this.getWorldSize();
        
        const left = worldPos.x - worldSize.x * this.pivot.x;
        const right = left + worldSize.x;
        const bottom = worldPos.y - worldSize.y * this.pivot.y;
        const top = bottom + worldSize.y;
        
        return x >= left && x <= right && y >= bottom && y <= top;
    }

    updateLayout(): void {
        const parentSize = this.screen ? this.screen.getSize() : new Vec2(1920, 1080);
        
        const left = this.anchor.x * parentSize.x + this.margin.x;
        const bottom = this.anchor.y * parentSize.y + this.margin.y;
        const right = this.anchor.z * parentSize.x - this.margin.z;
        const top = this.anchor.w * parentSize.y - this.margin.w;
        
        this.size.x = Math.max(0, right - left);
        this.size.y = Math.max(0, top - bottom);
    }

    onEnable(): void {
        this.enabled = true;
    }

    onDisable(): void {
        this.enabled = false;
    }

    destroy(): void {
        if (this.screen) {
            this.screen.removeElement(this);
        }
        super.destroy();
    }
}
