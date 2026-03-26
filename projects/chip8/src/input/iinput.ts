export interface IInput {
  readonly keypad: Uint8Array;
  key_down(chip8_key: number): void;
  key_up(chip8_key: number): void;
  is_pressed(chip8_key: number): boolean;
  wait_key(): Promise<number>;
}
