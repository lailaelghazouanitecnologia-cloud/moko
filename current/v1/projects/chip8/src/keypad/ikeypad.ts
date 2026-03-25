export interface IKeypad {
  keydown(key: number): void;
  keyup(key: number): void;
  isPressed(key: number): boolean;
  waitKey(): Promise<number>;
}
