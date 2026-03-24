import { Element } from './element';

export enum LayoutDirection {
    HORIZONTAL = 'horizontal',
    VERTICAL = 'registration'
}

export enum LayoutAlignment {
    START = 'start',
    CENTER = 'center',
    END = 'end',
    STRETCH = 'stretch'
}

export interface LayoutGroupOptions {
    direction?: LayoutDirection;
    alignment?: LayoutAlignment;
    spacing?: number;
    padding?: number | { top: number; right: number; bottom: number; left: number };
}

/**
 * A container element that automatically arranges its children
 * according to the specified direction, alignment, spacing, and padding.
 */
export class LayoutGroup extends Element {
    private direction: LayoutDirection;
       private alignment: LayoutAlignment;
    private spacing: number;
    private padding: { top: number; right: number; bottom: number; left: number };

    constructor(options: LayoutGroupOptions = {}) {
        super(0, 0, 200, 100);
        
        this.direction = options.direction || LayoutDirection.VERTICAL;
        this.alignment = options.alignment || LayoutAlignment.START;
        this.spacing = Math.max(0, options.spacing ?? 0);
        
        if (typeof options.padding === 'number') {
            this.padding = {
                top: options.padding,
                right: options.padding,
                bottom: options.padding,
                left: options.padding
            };
        } else {
            this.padding = options.padding || { top: 0, right: 0, bottom: 0, left: 0 };
        }
        
        this.validateConfiguration();
        this.updateLayout();
    }

    /**
     * Sets the layout direction and re-flows the children.
     * @param direction - The new direction for layout.
     * @throws {TypeError} If direction is not a valid LayoutDirection.
     */
    setDirection(direction: LayoutDirection): void {
        if (!Object.values(LayoutDirection).includes(direction)) {
            throw new TypeError(`Invalid direction: ${direction}`);
        }
        if (this.direction !== direction) {
            this.direction = direction;
            this.updateLayout();
        }
    }

    /**
     * Returns the current layout direction.
     * @returns The current direction.
     */
    getDirection(): LayoutDirection {
        return this.direction;
    }

    /**
     * Sets the alignment of children within the container.
     * @param alignment - The new alignment.
     * @throws {TypeError} If alignment is not a valid LayoutAlignment.
     */
    setAlignment(alignment: LayoutAlignment): void {
        if (!Object.values(LayoutAlignment).includes(alignment)) {
            throw new TypeError(`Invalid alignment: ${alignment}`);
        }
        if (this.alignment !== alignment) {
            this.alignment = alignment;
            this.updateLayout();
        }
    }

    /**
     * Returns the current alignment.
     * @returns The current alignment.
     */
    getAlignment(): LayoutAlignment {
        return this.alignment;
    }

    /**
     * Sets the spacing between children.
     * @param spacing - Non-negative spacing in pixels.
     * @throws {RangeError} If spacing is negative.
     */
    setSpacing(spacing: number): void {
        if (typeof spacing !== 'number' || isNaN(spacing)) {
            throw new TypeError('Spacing must be a number');
        }
        if (spacing < 0) {
            throw new RangeError('Spacing must be non-negative');
        }
        if (this.spacing !== spacing) {
            this.spacing = spacing;
            this.updateLayout();
        }
    }

    /**
     * Returns the current spacing.
     * @returns The spacing in pixels.
     */
    getSpacing(): number {
        return this.spacing;
    }

    /**
     * Sets the padding for the container.
     * @param padding - Uniform number or individual side values.
     * @throws {TypeError} If padding is not a number or valid object.
     * @throws {RangeError} If any padding value is negative.
     */
    setPadding(padding: number | { top: number; right: number; bottom: number; left: number }): void {
        let newPadding: { top: number; right: number; bottom: number; left: number };
        if (typeof padding === 'number') {
            if (isNaN(padding)) {
                throw new TypeError('Padding must be a valid number or object');
            }
            if (padding < 0) {
                throw new RangeError('Padding must be non-negative');
            }
            newPadding = {
                top: padding,
                right: padding,
                bottom: padding,
                left: padding
            };
        } else {
            if (!padding || typeof padding !== 'object') {
                throw new TypeError('Padding must be a number or an object');
            }
            const { top = 0, right = 0, bottom = 0, left = 0 } = padding;
            [top, right, bottom, left].forEach((v, i) => {
                if (typeof v !== 'number' || isNaN(v)) {
                    throw new TypeError(`Padding side at index ${i} must be a number`);
                }
                if (v < 0) {
                    throw new RangeError(`Padding side at index ${i} must be non-negative`);
                }
            });
            newPadding = { top, right, bottom, left };
        }
        if (JSON.stringify(this.padding) !== JSON.stringify(newPadding)) {
            this.padding = newPadding;
            this.updateLayout();
        }
    }

    /**
     * Returns a copy of the current padding.
     * @returns Padding values for each side.
     */
    getPadding(): { top: number; right: number; bottom: number; left: number } {
        return { ...this.padding };
    }

    /**
     * Adds a child element and re-flows the layout.
     * @param child - The element to add.
     * @throws {TypeError} If child is not an instance of Element.
     */
    addChild(child: Element): void {
        if (!(child instanceof Element)) {
            throw new TypeError('Child must be an instance of Element');
        }
        super.addChild(child);
        this.updateLayout();
    }

    /**
     * Removes a child element and re-flows the layout.
     * @param child - The element to remove.
     * @throws {TypeError} If child is not an instance of Element.
     */
    removeChild(child: Element): void {
        if (!(child instanceof Element)) {
            throw new TypeError('Child must be an instance of Element');
        }
        super.removeChild(child);
        this.updateLayout();
    }

    /**
     * Forces a re-layout of all children.
     * Public to allow external triggers when children change size.
     */
    updateLayout(): void {
        const visibleChildren = this.children.filter(child => child.isVisible());
        if (visibleChildren.length === 0) return;

        const availableWidth = Math.max(0, this.width - this.padding.left - this.padding.right);
        const availableHeight = Math.max(0, this.height - this.padding.top - this.padding.bottom);

        if (this.direction === LayoutDirection.VERTICAL) {
            this.layoutVertical(visibleChildren, availableWidth, availableHeight);
        } else {
            this.layoutHorizontal(visibleChildren, availableWidth, availableHeight);
        }
    }

    /**
     * Performs vertical layout of children.
     * @private
     */
    private layoutVertical(children: Element[], availableWidth: number, availableHeight: number): void {
        const totalSpacing = this.spacing * (children.length - 1);
        let totalChildHeight = 0;
        const stretchChildren: Element[] = [];

        for (const child of children) {
            const bounds = child.getBounds();
            if (this.alignment === LayoutAlignment.STRETCH) {
                stretchChildren.push(child);
            } else {
                totalChildHeight += bounds.height;
            }
        }

        if (stretchChildren.length > 0) {
            const remainingHeight = availableHeight - totalChildHeight - totalSpacing;
            const stretchHeight = Math.max(0, remainingHeight / stretchChildren.length);
            
            for (const child of stretchChildren) {
                child.setSize(availableWidth, stretchHeight);
            }
        }

        let yOffset = this.padding.top;
        
        if (this.alignment === LayoutAlignment.CENTER) {
            const totalHeight = children.reduce((sum, child) => sum + child.getBounds().height, 0) + totalSpacing;
            yOffset += Math.max(0, (availableHeight - totalHeight) / 2);
        } else if (this.alignment === LayoutAlignment.END) {
            const totalHeight = children.reduce((sum, child) => sum + child.getBounds().height, 0) + totalSpacing;
            yOffset += Math.max(0, availableHeight - totalHeight);
        }

        for (const child of children) {
            const bounds = child.getBounds();
            
            let x = this.padding.left;
            if (this.alignment === LayoutAlignment.CENTER) {
                x += (availableWidth - bounds.width) / 2;
            } else if (this.alignment === LayoutAlignment.END) {
                x += availableWidth - bounds.width;
            } else if (this.alignment === LayoutAlignment.STRETCH) {
                child.setSize(availableWidth, bounds.height);
            }
            
            child.setPosition(x, yOffset);
            yOffset += bounds.height + this.spacing;
        }
    }

    /**
     * Performs horizontal layout of children.
     * @private
     */
    private layoutHorizontal(children: Element[], availableWidth: number, availableHeight: number): void {
        const totalSpacing = this.spacing * (children.length - 1);
        let totalChildWidth = 0;
        const stretchChildren: Element[] = [];

        for (const child of children) {
            const bounds = child.getBounds();
            if (this.alignment === LayoutAlignment.STRETCH) {
                stretchChildren.push(child);
            } else {
                totalChildWidth += bounds.width;
            }
        }

        if (stretchChildren.length > 0) {
            const remainingWidth = availableWidth - totalChildWidth - totalSpacing;
            const stretchWidth = Math.max(0, remainingWidth / stretchChildren.length);
            
            for (const child of stretchChildren) {
                child.setSize(stretchWidth, availableHeight);
            }
        }

        let xOffset = this.padding.left;
        
        if (this.alignment === LayoutAlignment.CENTER) {
            const totalWidth = children.reduce((sum, child) => sum + child.getBounds().width, 0) + totalSpacing;
            xOffset += Math.max(0, (availableWidth - totalWidth) / 2);
        } else if (this.alignment === LayoutAlignment.END) {
            const totalWidth = children.reduce((sum, child) => sum + child.getBounds().width, 0) + totalSpacing;
            xOffset += Math.max(0, availableWidth - totalWidth);
        }

        for (const child of children) {
            const bounds = child.getBounds();
            
            let y = this.padding.top;
            if (this.alignment === LayoutAlignment.CENTER) {
                y += (availableHeight - bounds.height) / 2;
            } else if (this.alignment === LayoutAlignment.END) {
                y += availableHeight - bounds.height;
            } else if (this.alignment === LayoutAlignment.STRETCH) {
                child.setSize(bounds.width, availableHeight);
            }
            
            child.setPosition(xOffset, y);
            xOffset += bounds.width + this.spacing;
        }
    }

    /**
     * Sets the size of the container and re-flows children.
     * @param width - New width in pixels.
     * @param height - New height in pixels.
     * @throws {RangeError} If width or height is negative.
     */
    setSize(width: number, height: number): void {
        if (typeof width !== 'number' || isNaN(width) || width < 0) {
            throw new RangeError('Width must be a non-negative number');
        }
        if (typeof height !== 'number' || isNaN(height) || height < 0) {
            throw new RangeError('Height must be a non-negative number');
        }
        super.setSize(width, height);
        this.updateLayout();
    }

    /**
     * Validates the initial configuration for consistency.
     * @private
     */
    private validateConfiguration(): void {
        const { top, right, bottom, left } = this.padding;
        const totalHorizontal = left + right;
        const totalVertical = top + bottom;
        if (totalHorizontal > this.width || totalVertical > thisHeight) {
            console.warn('LayoutGroup: padding exceeds container size');
        }
    }

    /**
     * Renders a debug overlay for the container.
     * @param ctx - Canvas 2D context.
     */
    protected renderSelf(ctx: CanvasRenderingContext): void {
        if (!ctx) {
            throw new TypeError('CanvasRenderingContext2D is required');
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, this.width, this.height);
    }
}
