export interface ITimers {
  update(deltaTime: number): void;
  getSpeed(): number;
  isSounding(): boolean;
}
