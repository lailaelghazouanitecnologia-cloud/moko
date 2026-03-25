/**
 * Base component class for the ECS architecture.
 * Components are pure data containers attached to entities.
 * The generic parameter T allows typed component data access.
 */

/** Unique identifier type for components */
export type ComponentId = string;

/** Base interface that all component data must satisfy */
export interface ComponentData {
  readonly type: string;
}

/**
 * Generic component wrapper that associates typed data with an entity.
 * Components hold no logic — all behavior lives in Systems.
 */
export class Component<T extends ComponentData> {
  private static _nextId = 0;
  public readonly id: ComponentId;
  private _data: T;
  private _entityId: number | null = null;

  constructor(data: T) {
    this.id = `comp_${Component._nextId++}`;
    this._data = { ...data };
  }

  /** The component's typed data payload */
  get data(): Readonly<T> {
    return this._data;
  }

  /** Mutate component data. Returns the component for chaining. */
  setData(partial: Partial<T>): this {
    this._data = { ...this._data, ...partial };
    return this;
  }

  /** The entity this component is attached to, or null */
  get entityId(): number | null {
    return this._entityId;
  }

  /** @internal Used by Entity to bind this component */
  _bindToEntity(entityId: number): void {
    this._entityId = entityId;
  }

  /** @internal Used by Entity to unbind this component */
  _unbindFromEntity(): void {
    this._entityId = null;
  }

  /** Clone this component with a fresh id */
  clone(): Component<T> {
    return new Component<T>({ ...this._data });
  }
}
