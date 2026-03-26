export type Uint8 = number;

export interface ITimers {
  update(): void;
  setDelayTimer(value: Uint8): void;
  setSoundTimer(value: Uint8): void;
  getDelayTimer(): Uint8;
  getSoundTimer(): Uint8;
}
