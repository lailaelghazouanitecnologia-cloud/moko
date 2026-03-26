export interface IInput {
  isKeyPressed(key: number): boolean;
  waitKey(): Promise<number>;
  pressKey(key: number): void;
  releaseKey(key: number): void;
  reset(): void;
}
