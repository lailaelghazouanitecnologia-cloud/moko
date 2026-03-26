export interface IKeypad {
  readonly hostMap: Uint8Array;
  isPressed(key: number): boolean;
  waitKey(): Promise<number>;
  keyDown(hostKey: string): void;
  keyUp(hostKey: string): void;
}
