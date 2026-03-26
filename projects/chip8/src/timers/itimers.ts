export interface ITimers {
  tick(): void;
  getDelay(): number;
  setDelay(value: number): void;
  getSound(): number;
  setSound(value: number): void;
}
