export interface ISound {
  play(): void;
  stop(): void;
  setFrequency(hz: number): void;
  isPlaying(): boolean;
}
