export interface IKeyboard {
  readonly keys: ReadonlyArray<boolean>;
  isPressed(index: number): boolean;
  getPressedIndices(): number[];
  reset(): void;
}
