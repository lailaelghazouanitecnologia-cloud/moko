import { IKeypad } from './ikeypad';

/**
 * CHIP-8 keypad input handler.
 * Maps host keyboard events to CHIP-8 key indices and manages key states.
 */
export class Keypad implements IKeypad {
  readonly hostMap: Uint8Array;
  private readonly keyMap: Uint8Array;
  private readonly pressed: Uint8Array;
  private readonly waiting: Uint8Array;
  private resolveKey: ((key: number) => void) | null;

  constructor() {
    this.hostMap = new Uint8Array(16);
    this.keyMap = new Uint8Array(16);
    this.pressed = new Uint8Array(16);
    this.waiting = Uint8Array.from({ length: 16 }, (_, i) => i);
    this.resolveKey = null;
  }

  isPressed(key: number): boolean {
    if (!Number.isInteger(key) || key < 0 || key > 15) {
      throw new RangeError('Key must be an integer between 0 and 15');
    }
    return this.pressed[key] === 1;
  }

  /**
   * Wait for the next key press.
   * Resolves with the CHIP-8 key index (0–15) when a key is pressed.
   * @returns Promise that resolves with the pressed key index
   */
  waitKey(): Promise<number> {
    return new Promise<number>((resolve) => {
      this.resolveKey = resolve;
    });
  }

  keyDown(hostKey: string): void {
    const chipKey = this.mapHostKey(hostKey);
    if (chipKey >= 0 && chipKey < 16) {
      this.pressed[chipKey] = 1;
      if (this.resolveKey) {
        this.resolveKey(chipKey);
        this.resolveKey = null;
      }
    }
  }

  keyUp(hostKey: string): void {
    const chipKey = this.mapHostKey(hostKey);
    if (chipKey >= 0 && chipKey < 16) {
      this.pressed[chipKey] = 0;
    }
  }

  mapHostKey(hostKey: string): number {
    const map: Record<string, number> = {
      '1': 0x1, '2': 0x2, '3': 0x3, '4': 0xC,
      'q': 0x4, 'w': 0x5, 'e': 0x6, 'r': 0xD,
      'a': 0x7, 's': 0x8, 'd': 0x9, 'f': 0xE,
      'z': 0xA, 'x': 0x0, 'c': 0xB, 'v': 0xF
    };
    return map[hostKey.toLowerCase()] ?? -1;
  }

  reset(): void {
    this.pressed.fill(0);
    this.waiting.set(Uint8Array.from({ length: 16 }, (_, i) => i));
    if (this.resolveKey) {
      this.resolveKey(-1);
      this.resolveKey = null;
    }
  }
}
