export interface ITimers {
  readonly delayCounter: number;
  readonly soundCounter: number;

  setDelay(value: number): void;
  getDelay(): number;
  setSound(value: number): void;
  getSound(): number;
  tick(): void;
}
