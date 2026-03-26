export interface IEmulator {
  loadROM(data: Uint8Array): void;
  run(): void;
  pause(): void;
  reset(): void;
  isRunning(): boolean;
  getFPS(): number;
}
