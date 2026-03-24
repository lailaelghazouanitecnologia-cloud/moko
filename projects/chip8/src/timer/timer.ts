export interface Timer {
  set(value: number): void;
  tick(): void;
  get(): number;
  reset(): void;
}
