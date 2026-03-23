import type { GameObject } from './gameobject';

export abstract class Component {
  enabled: boolean = true;
  entity: GameObject | null = null;

  abstract onEnable(): void;
  abstract onDisable(): void;
  abstract update(dt: number): void;
}
