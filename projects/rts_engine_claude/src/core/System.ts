/**
 * Base system class for the ECS architecture.
 * Systems contain all game logic, operating on entities that have
 * the required set of components.
 */

import { Entity } from './Entity';
import { ComponentData } from './Component';

/**
 * Abstract base for all systems.
 * The generic parameter T constrains which component data types the system operates on.
 * Subclasses define requiredComponents and implement update().
 */
export abstract class System<T extends ComponentData = ComponentData> {
  /** Human-readable name for debugging */
  public readonly name: string;

  /** Priority determines update order — lower values run first */
  public readonly priority: number;

  private _enabled: boolean = true;

  constructor(name: string, priority: number = 0) {
    this.name = name;
    this.priority = priority;
  }

  /** Whether this system is active */
  get enabled(): boolean {
    return this._enabled;
  }

  /** Enable or disable this system */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
  }

  /**
   * Component types this system requires on entities.
   * Only entities possessing ALL of these components will be processed.
   */
  abstract get requiredComponents(): readonly string[];

  /**
   * Called once per tick with the filtered list of qualifying entities.
   * @param entities - Entities that have all required components and are active
   * @param deltaTime - Seconds elapsed since last update
   */
  abstract update(entities: readonly Entity[], deltaTime: number): void;

  /**
   * Optional lifecycle hook called when the system is first added to the world.
   */
  initialize(): void {
    // Override in subclasses if needed
  }

  /**
   * Optional lifecycle hook called when the system is removed from the world.
   */
  destroy(): void {
    // Override in subclasses if needed
  }

  /**
   * Filter entities to those matching this system's requirements.
   * Used internally by the game loop.
   */
  filterEntities(entities: readonly Entity[]): Entity[] {
    return entities.filter(
      (e) => e.active && e.hasAllComponents(this.requiredComponents)
    );
  }

  /** Convenience: extract typed component data from an entity */
  protected getComponentData<C extends T>(entity: Entity, type: string): C | undefined {
    const comp = entity.getComponent<C>(type);
    return comp ? (comp.data as C) : undefined;
  }
}
