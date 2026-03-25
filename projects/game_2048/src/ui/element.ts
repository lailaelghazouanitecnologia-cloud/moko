class Element {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    parent: Element | null;
    private children: Element[];

    /**
     * Creates a new Element.
     * @param id - Unique identifier for this element.
     */
    constructor(id: string = '') {
        this.id = id;
        this.x = 0;
        this.y = 0;
        this.width = 0;
        this.height = 0;
        this.visible = true;
        this.parent = null;
        this.children = [];
    }

    /**
     * Draws this element and its children onto the provided canvas context.
     * @param ctx - The 2D rendering context.
     */
    render(ctx: CanvasRenderingContext2D): void {
        if (!this.visible) return;
        if (!this._isValidContext(ctx)) {
            throw new Error('Invalid CanvasRenderingContext2D provided to render');
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        for (const child of this.children) {
            child.render(ctx);
        }

        ctx.restore();
    }

    /**
     * Updates this element and its children.
     * @param dt - Delta time in seconds since last update.
     */
    update(dt: number): void {
        if (!this.visible) return;
        if (!this._isValidDeltaTime(dt)) {
            throw new Error('Invalid delta time provided to update');
        }

        for (const child of this.children) {
            child.update(dt);
        }
    }

    /**
     * Performs a hit-test to determine if the given coordinates fall within this element.
     * @param x - X-coordinate to test.
     *  @param y - Y-coordinate to test.
     * @returns True if the point is inside this element, otherwise false.
     */
    contains(x: number, y: number): boolean {
        if (!this._isValidNumber(x) || !this._isValidNumber(y)) {
            return false;
        }
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    /**
     * Adds a child element to this element.
     * @param child - The child element to attach.
     */
    addChild(child: Element): void {
        if (!this._isValidElement(child)) {
            throw new Error('Invalid child element provided to addChild');
        }
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
    }

    /**
     * Removes a child element from this element.
     * @param child - The child element to detach.
     */
    removeChild(child: Element): void {
        if (!this._isValidElement(child)) {
            throw new Error('Invalid child element provided to removeChild');
        }
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    /**
     * Moves this element to the specified position.
     * @param x - New X-coordinate.
     * @param y - New Y-coordinate.
     */
    setPosition(x: number, y: number): void {
        if (!this._isValidNumber(x) || !this._isValidNumber(y)) {
            throw new Error('Invalid position coordinates provided to setPosition');
        }
        this.x = x;
        this.y = y;
    }

    /**
     * Resizes this element to the specified dimensions.
     * @param w - New width.
     * @param h - New height.
     */
    setSize(w: number, h: number): void {
        if (!this._isValidSize(w) || !this._isValidSize(h)) {
            throw new Error('Invalid dimensions provided to setSize');
        }
        this.width = w;
        this.height = h;
    }

    /**
     * Returns a shallow copy of this element's children.
     * @returns Array of children.
     */
    getChildren(): Element[] {
        return [...this.children];
    }

    /**
     * Returns the number of children.
     * @returns Child count.
     */
    getChildCount(): number {
        return this.children.length;
    }

    /**
     * Returns the child at the specified index.
     * @param index - Index of the child.
     * @returns The child element or undefined if index is out of bounds.
     */
    getChildAt(index: number): Element | undefined {
        if (!Number.isInteger(index) || index < 0 || index >= this.children.length) {
            return undefined;
        }
        return this.children[index];
    }

    /**
     * Removes all children from this element.
     */
    removeAllChildren(): void {
        for (const child of this.children) {
            child.parent = null;
        }
        this.children.length = 0;
    }

    /**
     * Checks if this element has the specified child.
     * @param child - The child element to check.
     * @returns True if this element contains the child, otherwise false.
     */
    hasChild(child: Element): boolean {
        return this.children.includes(child);
    }

    /**
     * Sets the visibility of this element.
     * @param visible - Whether the element should be visible.
     */
    setVisible(visible: boolean): void {
        this.visible = Boolean(visible);
    }

    /**
     * Returns the visibility state.
     * @returns True if visible, otherwise false.
     */
    isVisible(): boolean {
        return this.visible;
    }

    /**
     * Returns the bounding box of this element.
     * @returns An object with x, y, width, height.
     */
    getBounds(): { x: number; y: number; width: number; height: number } {
        return { x: this.x, y: this.y, width: this, height: this.height };
    }

    /**
     * Moves this element by the specified deltas.
     * @param dx - Offset in the X direction.
     * @param dy - Offset in the Y direction.
     */
    translate(dx: number, dy: number): void {
        if (!this._isValidNumber(dx) || !this._isValidNumber(dy)) {
            throw new Error('Invalid translation deltas provided to translate');
        }
        this.x += dx;
        this.y += dy;
    }

    /**
     * Brings this element to the front of its parent's children list.
     * Has no effect if this element has no parent.
     */
    bringToFront(): void {
        if (!this.parent) return;
        const siblings = this.parent.children;
        const index = siblings.indexOf(this);
        if (index === -1 || index === siblings.length - 1) return;
        siblings.splice(index, 1);
        siblings.push(this);
    }

    /**
     * Sends this element to the back of its parent's children list.
     * Has no effect if this element has no parent.
     */
    sendToBack(): void {
        if (!this.parent) return;
        const siblings = this.parent.children;
        const index = siblings.indexOf(this);
        if (index === -1 || index === 0) return;
        siblings.splice(index, 1);
        siblings.unshift(this);
    }

    // Private helper methods

    private _isValidNumber(value: number): boolean {
        return Number.isFinite(value);
    }

    private _isValidSize(value: number): boolean {
        return Number.isFinite(value) && value >= 0;
    }

    private _isValidDeltaTime(value: number): boolean {
        return Number.isFinite(value) && value >= 0;
    }

    private _isValidContext(ctx: any): boolean {
        return ctx && typeof ctx.save === 'function' && typeof ctx.restore === 'function';
    }

    private _isValidElement(element: any): boolean {
        return element instanceof Element;
    }
}
