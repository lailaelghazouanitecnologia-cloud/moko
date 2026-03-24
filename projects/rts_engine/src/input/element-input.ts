import { InputManager } from './input-manager';

/**
 * DOM element input handler that provides coordinate conversion and bounds checking
 * for input events relative to a specific DOM element.
 */
export class ElementInput {
    private element: HTMLElement | null = null;
    private manager: InputManager;

    /**
     * Creates a new ElementInput instance
     * @param manager - The input manager instance
     * @throws {Error} If manager is not provided
     */
    constructor(manager: InputManager) {
        if (!manager) {
            throw new Error('InputManager is required');
        }
        this.manager = manager;
    }

    /**
     * Binds the input handler to a DOM element
     * @param element - The DOM element to bind to
     * @throws {Error} If element is not a valid HTMLElement
     */
    public attach(element: HTMLElement): void {
        if (!element || !(element instanceof HTMLElement)) {
            throw new Error('Valid HTMLElement is required');
        }
        this.element = element;
    }

    /**
     * Unbinds the input handler from the current DOM element
     */
    public detach(): void {
        this.element = null;
    }

    /**
     * Returns the bounding rectangle of the bound element
     * @returns DOMRect with element bounds, or zero rect if no element is bound
     */
    public getBoundingRect(): DOMRect {
        if (!this.element) {
            return new DOMRect(0, 0, 0, 0);
        }
        
        try {
            return this.element.getBoundingClientRect();
        } catch (error) {
            console.warn('Failed to get bounding rect:', error);
            return new DOMRect(0, 0, 0, 0);
        }
    }

    /**
     * Converts global coordinates to local element coordinates
     * @param x - Global x coordinate
     * @param y - Global y coordinate
     * @returns Local coordinates relative to the element
     * @throws {Error} If coordinates are not valid numbers
     */
    public convertToLocal(x: number, y: number): { x: number; y: number } {
        this.validateCoordinates(x, y);
        
        if (!this.element) {
            return { x, y };
        }
        
        try {
            const rect = this.element.getBoundingClientRect();
            return {
                x: x - rect.left,
                y: y - rect.top
            };
        } catch (error) {
            console.warn('Failed to convert coordinates:', error);
            return { x, y };
        }
    }

    /**
     * Checks if the given coordinates are within the element bounds
     * @param x - Global x coordinate
     * @param y - Global y coordinate
     * @returns True if coordinates are within element bounds
     * @throws {Error} If coordinates are not valid numbers
     */
    public isInside(x: number, y: number): boolean {
        this.validateCoordinates(x, y);
        
        if (!this.element) {
            return false;
        }
        
        try {
            const rect = this.element.getBoundingClientRect();
            return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
        } catch (error) {
            console.warn('Failed to check if inside element:', error);
            return false;
        }
    }

    /**
     * Gets the currently bound element
     * @returns The bound HTMLElement or null if not bound
     */
    public getElement(): HTMLElement | null {
        return this.element;
    }

    /**
     * Checks if an element is currently bound
     * @returns True if an element is bound
     */
    public isAttached(): boolean {
        return this.element !== null;
    }

    /**
     * Validates coordinate values
     * @param x - X coordinate to validate
     * @param y - Y coordinate to validate
     * @throws {Error} If coordinates are not valid numbers
     */
    private validateCoordinates(x: number, y: number): void {
        if (typeof x !== 'number' || isNaN(x) || !isFinite(x)) {
            throw new Error('X coordinate must be a valid number');
        }
        if (typeof y !== 'number' || isNaN(y) || !isFinite(y)) {
            throw new Error('Y coordinate must be a valid number');
        }
    }
}
