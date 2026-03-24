import { Key } from './key';
import { KeyState } from './key-state';
import { InputHandler } from './input-handler';

export class Keypad {
  private keys: Map<Key, KeyState> = new Map();
  private inputHandler: InputHandler = new InputHandler();
  private keyPressResolver: ((key: Key) => void) | null = null;

  constructor() {
    this.reset();
  }

  pressKey(key: Key): void {
    this.keys.set(key, KeyState.Pressed);
    if (this.keyPressResolver) {
      this.keyPressResolver(key);
      this.keyPressResolver = null;
    }
  }

  releaseKey(key: Key): void {
    this.keys.set(key, KeyState.Released);
  }

  isKeyPressed(key: Key): boolean {
    return this.keys.get(key) === KeyState.Pressed;
  }

  getPressedKey(): Key | null {
    for (const [key, state] of this.keys) {
      if (state === KeyState.Pressed) {
        return key;
      }
    }
    return null;
  }

  waitForKeyPress(): Promise<Key> {
    return new Promise<Key>((resolve) => {
      const pressedKey = this.getPressedKey();
      if (pressedKey !== null) {
        resolve(pressedKey);
        return;
      }
      this.keyPressResolver = resolve;
    });
  }

  reset(): void {
    this.keys.clear();
    for (let i = 0; i < 16; i++) {
      this.keys.set(i as Key, KeyState.Released);
    }
  }

  getKeyState(key: Key): KeyState {
    return this.keys.get(key) || KeyState.Released;
  }

  getPressedKeys(): Key[] {
    const pressed: Key[] = [];
    for (const [key, state] of this.keys) {
      if (state === KeyState.Pressed) {
        pressed.push(key);
      }
    }
    return pressed;
  }

  setInputHandler(handler: InputHandler): void {
    this.inputHandler = handler;
  }

  handleKeyEvent(event: KeyboardEvent): void {
    const key = this.mapKeyCode(event.code);
    if (key !== null) {
      if (event.type === 'keydown') {
        this.pressKey(key);
      } else if (event.type === 'keyup') {
        this.releaseKey(key);
      }
    }
  }

  mapKeyCode(keyCode: string): Key | null {
    const keyMap: { [key: string]: Key } = {
      'Digit1': 0x1, 'Digit2': 0x2, 'Digit3': 0x3, 'Digit4': 0xC,
      'KeyQ': 0x4, 'KeyW': 0x5, 'KeyE': 0x6, 'KeyR': 0xD,
      'KeyA': 0x7, 'KeyS': 0x8, 'KeyD': 0x9, 'KeyF': 0xE,
      'KeyZ': 0xA, 'KeyX': 0x0, 'KeyC': 0xB, 'KeyV': 0xF
    };
    return keyMap[keyCode] ?? null;
  }

  update(deltaTime: number): void {
    // Update key states based on time delta if needed
    // For now, states are managed by press/release events
  }
}
