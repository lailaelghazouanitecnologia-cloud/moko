export type Uint8 = number;

export interface IInput {
  isKeyPressed(key: Uint8): boolean;
  waitForKeyPress(): Uint8;
  keyPressed(key: Uint8): void;
  keyReleased(key: Uint8): void;
  reset(): void;
}
