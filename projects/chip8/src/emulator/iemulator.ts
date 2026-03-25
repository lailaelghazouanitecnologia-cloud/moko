export interface IEmulator {
  readonly isRunning: boolean;
  readonly romLoaded: boolean;
  readonly tickCount: number;

  loadRom(data: Uint8Array): Promise<void>;
  start(): void;
  pause(): void;
  reset(): void;
  tick(): void;
}
