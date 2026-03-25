/**
 * Renders game entities using HTML elements.
 */
export class HtmlRenderer {
  private container: HTMLElement;
  private entityMap: Map<string, HTMLElement>;
  private zIndex: number;

  /**
   * Creates a new HtmlRenderer instance.
   * @param container The HTML container element where entities will be rendered.
   * @throws {Error} If container is not a valid HTMLElement.
   */
  constructor(container: HTMLElement) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('HtmlRenderer requires a valid HTMLElement container');
    }
    this.container = container;
    this.entityMap = new Map<string, HTMLElement>();
    this.zIndex = 0;
  }

  /**
   * Renders a single entity to the DOM.
   * @param entity The entity to render (Snake, Food, or Board).
   * @throws {Error} If entity is invalid or rendering fails.
   */
  render(entity: Snake | Food | Board): void {
    try {
      if (!entity) {
        throw new Error('Cannot render null or undefined entity');
      }

      const id = this.getEntityId(entity);
      let element = this.entityMap.get(id);

      if (!element) {
        element = this.createElement(entity);
        this.entityMap.set(id, element);
        this.container.appendChild(element);
      }

      this.updateElement(entity, element);
    } catch (error) {
      console.error('Failed to render entity:', error);
      throw new Error(`Rendering failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Removes all rendered elements from the DOM and clears the entity map.
   * @throws {Error} If DOM manipulation fails.
   */
  clear(): void {
    try {
      this.entityMap.forEach((element, id) => {
        try {
          if (element.parentNode === this.container) {
            this.container.removeChild(element);
          }
        } catch (error) {
          console.warn(`Failed to remove element with id ${id}:`, error);
        }
      });
      this.entityMap.clear();
      this.zIndex = 0;
    } catch (error) {
      console.error('Failed to clear renderer:', error);
      throw new Error(`Clear operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates a new HTML element for the given entity.
   * @param entity The entity to create an element for.
   * @returns The created HTMLElement.
   * @throws {Error} If element creation fails.
   */
  createElement(entity: Snake | Food | Board): HTMLElement {
    try {
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.zIndex = String(this.zIndex++);
      return element;
    } catch (error) {
      console.error('Failed to create element:', error);
      throw new Error(`Element creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates an existing HTML element to match the current entity state.
   * @param entity The entity with updated state.
   * @param element The HTML element to update.
   * @throws {Error} If entity type is unsupported or update fails.
   */
  updateElement(entity: Snake | Food | Board, element: HTMLElement): void {
    try {
      if (!element) {
        throw new Error('Cannot update null element');
      }

      if (entity instanceof Snake) {
        this.updateSnakeElement(entity, element);
      } else if (entity instanceof Food) {
        this.updateFoodElement(entity, element);
      } else if (entity instanceof Board) {
        this.updateBoardElement(entity, element);
      } else {
        throw new Error(`Unsupported entity type: ${typeof entity}`);
      }
    } catch (error) {
      console.error('Failed to update element:', error);
      throw new Error(`Update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates the HTML element for a Snake entity.
   * @param snake The snake entity.
   * @param element The HTML element to update.
   * @private
   */
  private updateSnakeElement(snake: Snake, element: HTMLElement): void {
    try {
      const segments = snake.segments;
      if (!segments || segments.length === 0) {
        element.style.display = 'none';
        return;
      }

      element.innerHTML = '';
      element.style.display = 'block';
      element.style.width = '20px';
      element.style.height = '20px';
      element.style.backgroundColor = snake.isAlive ? '#4ade80' : '#ef4444';

      const head = segments[0];
      if (head && typeof head.x === 'number' && typeof head.y === 'number') {
        this.setPosition(element, head.x * 20, head.y * 20);
      }
    } catch (error) {
      console.error('Failed to update snake element:', error);
      throw new Error(`Snake update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates the HTML element for a Food entity.
   * @param food The food entity.
   * @param element The HTML element to update.
   * @private
   */
  private updateFoodElement(food: Food, element: HTMLElement): void {
    try {
      const pos = food.getPosition();
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') {
        element.style.display = 'none';
        return;
      }

      element.style.display = 'block';
      element.style.width = '20px';
      element.style.height = '20px';
      
      const foodType = food.getType();
      element.style.backgroundColor = foodType === 'normal' ? '#f87171' : '#fbbf24';
      element.style.borderRadius = '50%';
      
      this.setPosition(element, pos.x * 20, pos.y * 20);
    } catch (error) {
      console.error('Failed to update food element:', error);
      throw new Error(`Food update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates the HTML element for a Board entity.
   * @param board The board entity.
   * @param element The HTML element to update.
   * @private
   */
  private updateBoardElement(board: Board, element: HTMLElement): void {
    try {
      if (!board || typeof board.width !== 'number' || typeof board.height !== 'number') {
        throw new Error('Invalid board dimensions');
      }

      element.style.width = `${board.width * 20}px`;
      element.style.height = `${board.height * 20}px`;
      element.style.border = '2px solid #374151';
      element.style.backgroundColor = '#111827';
      this.setPosition(element, 0, 0);
    } catch (error) {
      console.error('Failed to update board element:', error);
      throw new Error(`Board update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Removes an element by its ID.
   * @param id The ID of the element to remove.
   * @throws {Error} If ID is invalid or removal fails.
   */
  removeElement(id: string): void {
    try {
      if (typeof id !== 'string' || id.trim() === '') {
        throw new Error('Invalid element ID');
      }

      const element = this.entityMap.get(id);
      if (element) {
        if (element.parentNode === this.container) {
          this.container.removeChild(element);
        }
        this.entityMap.delete(id);
      }
    } catch (error) {
      console.error(`Failed to remove element with id ${id}:`, error);
      throw new Error(`Removal failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sets the position of an element using CSS transform.
   * @param element The HTML element to position.
   * @param x The x-coordinate in pixels.
   * @param y The y-coordinate in pixels.
   * @throws {Error} If element is invalid or coordinates are not finite numbers.
   */
  setPosition(element: HTMLElement, x: number, y: number): void {
    try {
      if (!element || !(element instanceof HTMLElement)) {
        throw new Error('Invalid element');
      }
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        throw new Error('Coordinates must be finite numbers');
      }

      element.style.transform = `translate(${x}px, ${y}px)`;
    } catch (error) {
      console.error('Failed to set position:', error);
      throw new Error(`Positioning failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Applies CSS styles to an element.
   * @param element The HTML element to style.
   * @param style An object mapping CSS property names to values.
   * @throws {Error} If element or style object is invalid.
   */
  setStyle(element: HTMLElement, style: Record<string, string>): void {
    try {
      if (!element || !(element instanceof HTMLElement)) {
        throw new Error('Invalid element');
      }
      if (!style || typeof style !== 'object') {
        throw new Error('Style must be an object');
      }

      Object.entries(style).forEach(([key, value]) => {
        if (typeof key === 'string' && typeof value === 'string') {
          (element.style as any)[key] = value;
        }
      });
    } catch (error) {
      console.error('Failed to apply styles:', error);
      throw new Error(`Styling failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generates a unique ID for an entity.
   * @param entity The entity to generate an ID for.
   * @returns A string ID unique to the entity type and state.
   * @private
   */
  private getEntityId(entity: Snake | Food | Board): string {
    if (entity instanceof Snake) return 'snake';
    if (entity instanceof Food) {
      const pos = entity.getPosition();
      return `food-${pos.x}-${pos.y}`;
    }
    return 'board';
  }

  /**
   * Gets the current number of rendered entities.
   * @returns The count of active entities.
   */
  getEntityCount(): number {
    return this.entityMap.size;
  }

  /**
   * Checks if an entity with the given ID exists.
   * @param id The ID to check.
   * @returns True if the entity exists, false otherwise.
   */
  hasEntity(id: string): boolean {
    return typeof id === 'string' && this.entityMap.has(id);
  }

  /**
   * Gets all entity IDs currently rendered.
   * @returns An array of entity IDs.
   */
  getEntityIds(): string[] {
    return Array.from(this.entityMap.keys());
  }
}
