export type ComponentConstructor = new (entity: Entity) => Component;

/**
 * Container for components in scene graph
 */
export class Entity {
  id: string;
  name: string;
  active: boolean;
  components: Component[];
  node: GraphNode;

  constructor(name?: string) {
    this.id = Math.random().toString(36).substring(2, 9);
    this.name = name || 'Entity';
    this.active = true;
    this.components = [];
    this.node = new GraphNode();
  }

  /**
   * Attach component instance
   * @param type Component constructor to instantiate
   * @returns New component instance
   * @throws {TypeError} If type is not a valid constructor
   */
  addComponent(type: ComponentConstructor): Component {
    if (typeof type !== 'function') {
      throw new TypeError('addComponent expects a constructor function');
      }
    if (!type.name) {
      throw new TypeError('Component constructor must have a name');
    }

    const existing = this.getComponent(type);
    if (existing) {
      return existing;
    }

    const component = new type(this);
    this.components.push(component);
    try {
      component.init();
    } catch (err) {
      this.components.pop();
      throw new Error(`Component ${type.name} init failed: ${(err as Error).message}`);
    }
    return component;
  }

  /**
   * Detach component type
   * @param type Component constructor to remove
   */
  removeComponent(type: ComponentConstructor): void {
    if (typeof type !== 'function') {
      throw new TypeError('removeComponent expects a constructor function');
    }

    const index = this.components.findIndex(c => c instanceof type);
    if (index !== -1) {
      const component = this.components[index];
      try {
        component.destroy();
      } catch (err) {
        console.warn(`Component ${type.name} threw during destroy:`, err);
      }
      this.components.splice(index, 1);
    }
  }

  /**
   * Retrieve component instance
   * @param type Component constructor to find
   * @returns Found component or null
   */
  getComponent(type: ComponentConstructor): Component | null {
    if (typeof type !== 'function') {
      throw new TypeError('getComponent expects a constructor function');
    }
    return this.components.find(c => c instanceof type) || null;
  }

  /**
   * List all components
   * @param type Optional constructor to filter by
   * @returns Array of components
   */
  getComponents(type?: ComponentConstructor): Component[] {
    if (type !== undefined && typeof type !== 'function') {
      throw new TypeError('getComponents optional argument must be a constructor function');
    }
    if (type) {
      return this.components.filter(c => c instanceof type);
    }
    return [...this.components];
  }

  /**
   * Toggle entity state
   * @param state New active state
   */
  setActive(state: boolean): void {
    if (typeof state !== 'boolean') {
      throw new TypeError('setActive expects a boolean');
    }
    this.active = state;
    this.components.forEach(component => {
      component.setEnabled(state);
    });
  }

  /**
   * Cleanup and remove
   */
  destroy(): void {
    this.components.forEach(component => {
      try {
        component.destroy();
      } catch (err) {
        console.warn('Component threw during destroy:', err);
      }
    });
    this.components.length = 0;
  }

  /**
   * Check if entity has a component of given type
   * @param type Constructor to check for
   * @returns True if component exists
   */
  hasComponent(type: ComponentConstructor): boolean {
    if (typeof type !== 'function') {
      throw new TypeError('hasComponent expects a constructor function');
    }
    return this.components.some(c => c instanceof type);
  }

  /**
   * Get count of components
   * @param type Optional constructor to filter by
   * @returns Number of components
   */
  countComponents(type?: ComponentConstructor): number {
    if (type !== undefined && typeof type !== 'function') {
      throw new TypeError('countComponents optional argument must be a constructor function');
    }
    return type ? this.components.filter(c => c instanceof type).length : this.components.length;
  }

  /**
   * Clone entity and its components
   * @returns New entity instance
   */
  clone(): Entity {
    const clone = new Entity(`${this.name}_clone`);
    clone.active = this.active;
    this.components.forEach(component => {
      const clonedComponent = clone.addComponent(component.constructor as ComponentConstructor);
      if (clonedComponent && typeof (clonedComponent as any).copyFrom === 'function') {
        (clonedComponent as any).copyFrom(component);
      }
    });
    return clone;
  }

  /**
   * Serialize entity to JSON
   * @returns Serialized data
   */
  toJSON(): any {
    return {
      id: this.id,
      name: this.name,
      active: this.active,
      components: this.components.map(c => {
        if (typeof (c as any).toJSON === 'function') {
          return (c as any).toJSON();
        }
        return { type: c.constructor.name };
      })
    };
  }

  /**
   * Get entity name with ID
   * @returns Formatted name
   */
  getNameWithId(): string {
    return `${this.name} (${this.id})`;
  }

  /**
   * Validate entity integrity
   * @returns True if valid
   */
  isValid(): boolean {
    return (
      typeof this.id === 'string' &&
      this.id.length > 0 &&
      typeof this.name === 'string' &&
      this.name.length > 0 &&
      typeof this.active === 'boolean' &&
      Array.isArray(this.components) &&
      this.node !== undefined
    );
  }
}
