/**
 * Entity class for the ECS architecture.
 * Entities are containers for components, identified by a unique numeric ID.
 * They serve as the "glue" that binds related components together.
 */

import { Component, ComponentData } from './Component';

export class Entity {
  private static _nextId = 0;

  public readonly id: number;
  private readonly _components: Map<string, Component<ComponentData>> = new Map();
  private readonly _tags: Set<string> = new Set();
  private _active: boolean = true;

  constructor() {
    this.id = Entity._nextId++;
  }

  /** Whether this entity is active in the world */
  get active(): boolean {
    return this._active;
  }

  /** Deactivate this entity (systems should skip inactive entities) */
  deactivate(): void {
    this._active = false;
  }

  /** Reactivate this entity */
  activate(): void {
    this._active = true;
  }

  /** Attach a component by its data type string. Replaces existing component of same type. */
  addComponent<T extends ComponentData>(component: Component<T>): this {
    const type = component.data.type;
    const existing = this._components.get(type);
    if (existing) {
      existing._unbindFromEntity();
    }
    component._bindToEntity(this.id);
    this._components.set(type, component as Component<ComponentData>);
    return this;
  }

  /** Remove a component by its data type string */
  removeComponent(type: string): boolean {
    const component = this._components.get(type);
    if (component) {
      component._unbindFromEntity();
      this._components.delete(type);
      return true;
    }
    return false;
  }

  /** Get a component by its data type string, with type assertion */
  getComponent<T extends ComponentData>(type: string): Component<T> | undefined {
    return this._components.get(type) as Component<T> | undefined;
  }

  /** Check if entity has a component of the given type */
  hasComponent(type: string): boolean {
    return this._components.has(type);
  }

  /** Check if entity has all of the given component types */
  hasAllComponents(types: readonly string[]): boolean {
    return types.every((t) => this._components.has(t));
  }

  /** Get all components attached to this entity */
  getAllComponents(): ReadonlyArray<Component<ComponentData>> {
    return Array.from(this._components.values());
  }

  /** Add a tag for fast categorization (e.g., "unit", "building", "projectile") */
  addTag(tag: string): this {
    this._tags.add(tag);
    return this;
  }

  /** Remove a tag */
  removeTag(tag: string): boolean {
    return this._tags.delete(tag);
  }

  /** Check if entity has a specific tag */
  hasTag(tag: string): boolean {
    return this._tags.has(tag);
  }

  /** All tags on this entity */
  get tags(): ReadonlySet<string> {
    return this._tags;
  }
}
