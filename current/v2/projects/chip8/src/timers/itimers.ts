export interface ITimers {
  tick60Hz(): void;
  getDelay(): number;
  setDelay(val: number): void;
  getSound(): number;
  setSound(val: number): void;
}
