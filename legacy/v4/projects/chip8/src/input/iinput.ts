export interface IInput {
  isKeyPressed(key: number): boolean;
  waitForKey(): number;
  keyDown(key: number): void;
  keyUp(key: number): void;
  reset(): void;
}
