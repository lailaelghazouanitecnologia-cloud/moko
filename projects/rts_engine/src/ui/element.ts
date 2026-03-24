import { UIError } from '../errors/UIError';

/**
 * Base UI element with position, size, and hierarchical structure.
 * Provides rendering, hit testing, and child management functionality.
 */
export class Element {
    private x: number;
    private y: number;
    private width: number;
    private height: number;
    private visible: boolean;
    private parent: Element | null;
    private children: Element[];

    /**
     * Creates a new Element instance.
     * @param x - The x-coordinate of the element (default: 0)
     * @param y - The y-coordinate of the element (default: 0)
     * @param width - The width of the element (default: 100)
     * @param height - The height of the element (default: 100)
     * @throws {UIError} If dimensions are invalid
     */
    constructor(x: number = 0, y: number = 0, width: number = 100, height: number = 100) {
        this.validateDimensions(width, height);
        this.validateCoordinates(x, y);
        
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.visible = true;
        this.parent = null;
        this.children = [];
    }

    /**
     * Renders the element and its children to the canvas context.
     * @param ctx - The canvas rendering context
     * @throws {UIError} If context is invalid
     */
    render(ctx: CanvasRenderingContext2D): void {
        if (!ctx) {
            throw new UIError('Invalid canvas rendering context provided');
        }

        if (!this.visible) return;

        try {
            ctx.save();
            ctx.translate(this.x, this.y);

            this.renderSelf(ctx);

            for (const child of this.children) {
                child.render(ctx);
            }
        } finally {
            ctx.restore();
        }
    }

    /**
     * Renders the element itself (to be overridden by subclasses).
     * @param ctx - The canvas rendering context
     */
    protected renderSelf(ctx: CanvasRenderingContext2D): void {
        // Base implementation - override in subclasses
    }

    /**
     * Tests if a point is within the element's bounds.
     * @param x - The x-coordinate to test
     * @param y - The y-coordinate to test
     * @returns True if the point is within the element's bounds
     * @throws {UIError} If coordinates are invalid
     */
    hitTest(x: number, y: number): boolean {
        this.validateCoordinates(x, y);

        if (!this.visible) return false;

        const bounds = this.getBounds();
        const inside = x >= bounds.x && x <= bounds.x + bounds.width &&
                      y >= bounds.y && y <= bounds.y + bounds.height;

        if (!inside) return false;

        // Check children in reverse order (top to bottom)
        for (let i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            const childHit = child.hitTest(x - this.x, y - this.y);
            if (childHit) return true;
        }

        return true;
    }

    /**
     * Adds a child element to this element.
     * @param child - The child element to add
     * @throws {UIError} If child is invalid or already has a parent
     */
    addChild(child: Element): void {
        if (!child) {
            throw new UIError('Cannot add null or undefined child element');
        }

        if (child === this) {
            throw new UIError('Cannot add element as its own child');
        }

        if (child.parent) {
            child.parent.removeChild(child);
        }
        
        child.parent = this;
        this.children.push(child);
    }

    /**
     * Removes a child element from this element.
     * @param child - The child element to remove
     * @throws {UIError} If child is invalid
     */
    removeChild(child: Element): void {
        if (!child) {
            throw new UIError('Cannot remove null or undefined child element');
        }

        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    /**
     * Gets the bounding box of the element.
     * @returns The bounding box with x, y, width, and height
     */
    getBounds(): {x: number, y: number, width: number, height: number} {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Sets the position of the element.
     * @param x - The new x-coordinate
     * @param y - The new y-coordinate
     * @throws {UIError} If coordinates are invalid
     */
    setPosition(x: number, y: number): void {
        this.validateCoordinates(x, y);
        this.x = x;
        this.y = y;
    }

    /**
     * Sets the size of the element.
     * @param width - The new width
     * @param height - The new height
     * @throws {UIError} If dimensions are invalid
     */
    setSize(width: number, height: number): void {
        this.validateDimensions(width, height);
        this.width = width;
        this.height = height;
    }

    /**
     * Checks if the element is visible.
     * @returns True if the element is visible
     */
    isVisible(): boolean {
        return this.visible;
    }

    /**
     * Sets the visibility of the element.
     * @param visible - Whether the element should be visible
     */
    setVisible(visible: boolean): void {
        this.visible = Boolean(visible);
    }

    /**
     * Gets the absolute position of the element in screen coordinates.
     * @returns The absolute position with x and y coordinates
     */
    getAbsolutePosition(): {x: number, y: number} {
        let current: Element | null = this;
        let absX = 0;
        let absY = 0;

        while (current) {
            absX += current.x;
            absY += current.y;
            current = current.parent;
        }

        return { x: absX, y: absY };
    }

    /**
     * Gets the parent element.
     * @returns The parent element or null if this is a root element
     */
    getParent(): Element | null {
        return this.parent;
    }

    /**
     * Gets all child elements.
     * @returns Array of child elements
     */
    getChildren(): Element[] {
        return [...this.children]; // Return copy to prevent external modification
    }

    /**
     * Removes all child elements.
     */
    removeAllChildren(): void {
        for (const child of this.children) {
            child.parent = null;
        }
        this.children = [];
    }

    /**
     * Gets the number of child elements.
     * @returns The number of children
     */
    getChildCount(): number {
        return this.children.length;
    }

    /**
     * Checks if the element has any children.
     * @returns True if the element has children
     */
    hasChildren(): boolean {
        return this.children.length > 0;
    }

    /**
     * Validates coordinate values.
     * @param x - The x-coordinate to validate
     * @param y - The y-coordinate to validate
     * @throws {UIError} If coordinates are invalid
     */
    private validateCoordinates(x: number, y: number): void {
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new UIError('Coordinates must be finite numbers');
        }
    }

    /**
     * Validates dimension values.
     * @param width - The width to validate
     * @param height - The height to validate
     * @throws {UIError} If dimensions are invalid
     */
    private validateDimensions(width: number, height: number): void {
        if (!Number.isFinite(width) || !Number.isFinite(height)) {
            throw new UIError('Dimensions must be finite numbers');
        }
        if (width < 0 || height < 0) {
            throw new UIError('Dimensions must be non-negative');
        }
    }
}
