export interface ISound {
  start(): void;
  stop(): void;
  setFrequency(hz: number): void;
}
