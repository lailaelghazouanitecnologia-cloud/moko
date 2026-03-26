type Uint8 = number;

export interface IInput {
  isPressed(key: Uint8): boolean;
  waitKey(): Promise<Uint8>;
  keyDown(key: Uint8): void;
  keyUp(key: Uint8): void;
  reset(): void;
}
