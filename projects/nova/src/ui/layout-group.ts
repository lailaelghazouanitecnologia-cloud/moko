import { Element } from './element';
import { Vec2, Vec4 } from '../math';

export class LayoutGroup extends Element {
    private orientation: string = 'horizontal';
    private spacing: number = 0;
    private padding: Vec4 = new Vec4(0, 0, 0, 0);
    private alignment: Vec2 = new Vec2(0.5, 0.5);
    private reverse: boolean = false;
    private wrap: boolean = false;
    private widthFit: string = 'none';
    private heightFit: string = 'none';

    constructor() {
        super();
    }

    setOrientation(orientation: string): void {
        this.orientation = orientation;
        this.reflow();
    }

    setSpacing(spacing: number): void {
        this.spacing = spacing;
        this.reflow();
    }

    setPadding(left: number, bottom: number, right: number, top: number): void {
        this.padding.x = left;
        this.padding.y = bottom;
        this.padding.z = right;
        this.padding.w = top;
        this.reflow();
    }

    setAlignment(x: number, y: number): void {
        this.alignment.x = x;
        this.alignment.y = y;
        this.reflow();
    }

    setReverse(reverse: boolean): void {
        this.reverse = reverse;
        this.reflow();
    }

    setWrap(wrap: boolean): void {
        this.wrap = wrap;
        this.reflow();
    }

    setWidthFit(fit: string): void {
        this.widthFit = fit;
        this.reflow();
    }

    setHeightFit(fit: string): void {
        this.heightFit = fit;
        this.reflow();
    }

    addChild(child: Element): void {
        super.addChild(child);
        this.reflow();
    }

    removeChild(child: Element): void {
        super.removeChild(child);
        this.reflow();
    }

    reflow(): void {
        if (!this.children || this.children.length === 0) {
            return;
        }

        const isHorizontal = this.orientation === 'horizontal';
        const totalSpacing = (this.children.length - 1) * this.spacing;
        let totalSize = 0;
        let maxCrossSize = 0;

        // Calculate total size and max cross size
        for (const child of this.children) {
            if (isHorizontal) {
                totalSize += child.width || 0;
                maxCrossSize = Math.max(maxCrossSize, child.height || 0);
            } else {
                totalSize += child.height || 0;
                maxCrossSize = Math.max(maxCrossSize, child.width || 0);
            }
        }

        // Add spacing to total size
        totalSize += totalSpacing;

        // Calculate available space
        const availableWidth = this.width - this.padding.x - this.padding.z;
        const availableHeight = this.height - this.padding.y - this.padding.w;

        // Handle width/height fitting
        if (this.widthFit === 'children' && isHorizontal) {
            this.width = totalSize + this.padding.x + this.padding.z;
        } else if (this.heightFit === 'children' && !isHorizontal) {
            this.height = totalSize + this.padding.y + this.padding.w;
        }

        // Position children
        let currentPos = isHorizontal ? this.padding.x : this.padding.y;
        
        if (this.reverse) {
            currentPos = isHorizontal ? 
                this.width - this.padding.z - totalSize :
                this.height - this.padding.w - totalSize;
        }

        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            const childIndex = this.reverse ? this.children.length - 1 - i : i;

            if (isHorizontal) {
                child.x = currentPos;
                
                // Vertical alignment
                const crossSize = child.height || 0;
                const crossAvailable = availableHeight;
                const crossOffset = (crossAvailable - crossSize) * this.alignment.y;
                child.y = this.padding.w + crossOffset;
                
                currentPos += (child.width || 0) + this.spacing;
            } else {
                child.y = currentPos;
                
                // Horizontal alignment
                const crossSize = child.width || 0;
                const crossAvailable = availableWidth;
                const crossOffset = (crossAvailable - crossSize) * this.alignment.x;
                child.x = this.padding.x + crossOffset;
                
                currentPos += (child.height || 0) + this.spacing;
            }
        }
    }
}
