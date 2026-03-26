export interface ITimer {
  setDelay(value: number): void;
  getDelay(): number;
  setSound(value: number): void;
  getSound(): number;
  tick(): void;
}
