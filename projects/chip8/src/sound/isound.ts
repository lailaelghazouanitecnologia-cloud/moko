export interface ISound {
  setBuzzer(active: boolean): void;
  isPlaying(): boolean;
  setFrequency(hz: number): void;
  setVolume(level: number): void;
}
