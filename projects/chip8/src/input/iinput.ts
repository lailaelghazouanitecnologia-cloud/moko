export interface IInput {
  readonly keyStates: ReadonlyArray<boolean>;
  isPressed(key: number): boolean;
  waitForPress(): number;
  setKeyState(key: number, pressed: boolean): void;
}
