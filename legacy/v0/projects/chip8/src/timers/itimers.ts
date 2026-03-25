export interface ITimers {
  readonly delayTimer: number;
  readonly soundTimer: number;

  tick60Hz(): void;
  setDelay(value: number): void;
  setSound(value: number): void;
  getDelay(): number;
  getSound(): number;
}
