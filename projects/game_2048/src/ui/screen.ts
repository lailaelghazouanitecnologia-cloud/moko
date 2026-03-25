import { Element } from './element';

/**
 * Root container for UI
 */
export class Screen {
  width: number;
  height: number;
  elements: Element[];
  backgroundColor: string;

  constructor(width: number = 800, height: number = 600, backgroundColor: string = '#000000') {
    this.validateDimensions(width, height);
    this.validateColor(backgroundColor);
    this.width = width;
    this.height = height;
    this.backgroundColor = backgroundColor;
    this.elements = [];
  }

  /**
   * Add UI element
   * @param element - The element to add
   * @throws {Error} If element is null or already exists
   */
  addElement(element: Element): void {
    if (!element) {
      throw new Error('Cannot add null element');
    }
    if (this.elements.includes(element)) {
      throw new Error('Element already exists in screen');
    }
    this.elements.push(element);
  }

  /**
   * Remove UI element
   * @param element - The element to remove
   * @throws {Error} If element is null
   */
  removeElement(element: Element): void {
    if (!element) {
      throw new Error('Cannot remove null element');
    }
    const index = this.elements.indexOf(element);
    if (index === -1) {
      throw new Error('Element not found in screen');
    }
    this.elements.splice(index, 1);
  }

  /**
   * Remove all elements
   */
  clear(): void {
    this.elements.length = 0;
  }

  /**
   * Change screen size
   * @param width - New width
   * @param height - New height
   * @throws {Error} If dimensions are invalid
   */
  resize(width: number, height: number): void {
    this.validateDimensions(width, height);
    this.width = width;
    this.height = height;
  }

  /**
   * Get element by id
   * @param id - The element id
   * @returns The element or null if not found
   * @throws {Error} If id is empty
   */
  findElementById(id: string): Element | null {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid element id');
    }
    for (const element of this.elements) {
      if (element.id === id) {
        return element;
      }
    }
    return null;
  }

  /**
   * Draw all elements
   * @throws {Error} If canvas creation or context fails
   */
  render(): void {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const element of this.elements) {
      if (element.visible) {
        element.render(ctx);
      }
    }
  }

  /**
   * Validate dimensions
   * @private
   * @param width - Width to validate
   * @param height - Height to validate
   * @throws {Error} If dimensions are invalid
   */
  private validateDimensions(width: number, height: number): void {
    if (typeof width !== 'number' || typeof height !== 'number') {
      throw new Error('Dimensions must be numbers');
    }
    if (!isFinite(width) || !isFinite(height)) {
      throw new Error('Dimensions must be finite numbers');
    }
    if (width <= 0 || height <= 0) {
      throw new Error('Invalid dimensions');
    }
  }

  /**
   * Validate color format
   * @private
   * @param color - Color to validate
   * @throws {Error} If color is invalid
   */
  private validateColor(color: string): void {
    if (!color || typeof color !== 'string') {
      throw new Error('Invalid color format');
    }
    const colorRegex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;
    if (!colorRegex.test(color)) {
      throw new Error('Color must be in hex format (e.g., #000000)');
    }
  }
}
