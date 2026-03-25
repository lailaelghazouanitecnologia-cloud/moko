export interface IKeyboard {
  readonly keys: boolean[];

  isPressed(index: number): boolean;
  getPressed(): number[];
  clear(): void;
  press(index: number): void;
  release(index: number): void;
}
