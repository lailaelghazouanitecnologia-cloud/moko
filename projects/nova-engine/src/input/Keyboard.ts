import { KEY_CODES } from './KeyCodes';

export class Keyboard {
  private keys: Map<string, boolean> = new Map();
  private prevKeys: Map<string, boolean> = new Map();

  static readonly KEY_CODES: { [key: string]: string } = {
    'KeyA': 'A',
    'KeyB': 'B',
    'KeyC': 'C',
    'KeyD': 'D',
    'KeyE': 'E',
    'KeyF': 'F',
    'KeyG': 'G',
    'KeyH': 'H',
    'KeyI': 'I',
    'KeyJ': 'J',
    'KeyK': 'K',
    'KeyL': 'L',
    'KeyM': 'M',
    'KeyN': 'N',
    'KeyO': 'O',
    'KeyP': 'P',
    'KeyQ': 'Q',
    'KeyR': 'R',
    'KeyS': 'S',
    'KeyT': 'T',
    'KeyU': 'U',
    'KeyV': 'V',
    'KeyW': 'W',
    'KeyX': 'X',
    'KeyY': 'Y',
    'KeyZ': 'Z',
    'Digit0': '0',
    'Digit1': '1',
    'Digit2': '2',
    'Digit3': '3',
    'Digit4': '4',
    'Digit5': '5',
    'Digit6': '6',
    'Digit7': '7',
    'Digit8': '8',
    'Digit9': '9',
    'Space': 'Space',
    'Enter': 'Enter',
    'ShiftLeft': 'Shift',
    'ShiftRight': 'Shift',
    'ControlLeft': 'Control',
    'ControlRight': 'Control',
    'AltLeft': 'Alt',
    'AltRight': 'Alt',
    'MetaLeft': 'Meta',
    'MetaRight': 'Meta',
    'ArrowUp': 'ArrowUp',
    'ArrowDown': 'ArrowDown',
    'ArrowLeft': 'ArrowLeft',
    'ArrowRight': 'ArrowRight',
    'Escape': 'Escape',
    'Tab': 'Tab',
    'Backspace': 'Backspace',
    'Delete': 'Delete',
    'Insert': 'Insert',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PageUp',
    'PageDown': 'PageDown',
    'CapsLock': 'CapsLock',
    'NumLock': 'NumLock',
    'ScrollLock': 'ScrollLock',
    'Pause': 'Pause',
    'F1': 'F1',
    'F2': 'F2',
    'F3': 'F3',
    'F4': 'F4',
    'F5': 'F5',
    'F6': 'F6',
    'F7': 'F7',
    'F8': 'F8',
    'F9': 'F9',
    'F10': 'F10',
    'F11': 'F11',
    'F12': 'F12'
  };

  isKeyDown(key: string): boolean {
    return this.keys.get(key) || false;
  }

  isKeyPressed(key: string): boolean {
    const current = this.keys.get(key) || false;
    const previous = this.prevKeys.get(key) || false;
    return current && !previous;
  }

  isKeyReleased(key: string): boolean {
    const current = this.keys.get(key) || false;
    const previous = this.prevKeys.get(key) || false;
    return !current && previous;
  }

  getKeyName(code: string): string {
    return Keyboard.KEY_CODES[code] || code;
  }

  update(): void {
    this.prevKeys = new Map(this.keys);
  }

  handleKeyDown(event: KeyboardEvent): void {
    const keyName = this.getKeyName(event.code);
    this.keys.set(keyName, true);
  }

  handleKeyUp(event: KeyboardEvent): void {
    const keyName = this.getKeyName(event.code);
    this.keys.set(keyName, false);
  }

  clear(): void {
    this.keys.clear();
    this.prevKeys.clear();
  }

  isAnyKeyPressed(): boolean {
    for (const [, pressed] of this.keys) {
      if (pressed) return true;
    }
    return false;
  }

  getPressedKeys(): string[] {
    const pressed: string[] = [];
    for (const [key, isPressed] of this.keys) {
      if (isPressed) {
        pressed.push(key);
      }
    }
    return pressed;
  }
}
