export interface InputDevice {
  id: string;
  type: Keyboard | Mouse | Touch | Gamepad;
  connected: boolean;
  isPressed(code: string): boolean;
  wasJustPressed(code: string): boolean;
  wasJustReleased(code: string): boolean;
  getValue(code: string): number;
  vibrate(pattern: number[]): void;
}
