import { Keypad } from './keypad';
import { Key } from './key';
import { KeyState } from './key-state';

export class InputHandler {
  private keyMapping: Map<string, Key>;
  private enabled: boolean;

  constructor() {
    this.keyMapping = new Map();
    this.enabled = true;
    this.setupDefaultMappings();
  }

  registerKeyMapping(keyCode: string, key: Key): void {
    this.keyMapping.set(keyCode, key);
  }

  unregisterKeyMapping(keyCode: string): void {
    this.keyMapping.delete(keyCode);
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;
    
    const key = this.keyMapping.get(event.code);
    if (key !== undefined) {
      Keypad.setKeyState(key, KeyState.Pressed);
      this.preventDefault(event);
    }
  }

  handleKeyUp(event: KeyboardEvent): void {
    if (!this.enabled) return;
    
    const key = this.keyMapping.get(event.code);
    if (key !== undefined) {
      Keypad.setKeyState(key, KeyState.Released);
      this.preventDefault(event);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getKeyMapping(keyCode: string): Key | null {
    const key = this.keyMapping.get(keyCode);
    return key !== undefined ? key : null;
  }

  setupDefaultMappings(): void {
    this.keyMapping.clear();
    
    // Standard Chip-8 keypad layout
    // 1 2 3 C  ->  1 2 3 4
    // 4 5 6 D  ->  Q W E R
    // 7 8 9 E  ->  A S D F
    // A 0 B F  ->  Z X C V
    
    this.keyMapping.set('Digit1', Key.K1);
    this.keyMapping.set('Digit2', Key.K2);
    this.keyMapping.set('Digit3', Key.K3);
    this.keyMapping.set('Digit4', Key.KC);
    
    this.keyMapping.set('KeyQ', Key.K4);
    this.keyMapping.set('KeyW', Key.K5);
    this.keyMapping.set('KeyE', Key.K6);
    this.keyMapping.set('KeyR', Key.KD);
    
    this.keyMapping.set('KeyA', Key.K7);
    this.keyMapping.set('KeyS', Key.K8);
    this.keyMapping.set('KeyD', Key.K9);
    this.keyMapping.set('KeyF', Key.KE);
    
    this.keyMapping.set('KeyZ', Key.KA);
    this.keyMapping.set('KeyX', Key.K0);
    this.keyMapping.set('KeyC', Key.KB);
    this.keyMapping.set('KeyV', Key.KF);
  }

  clearMappings(): void {
    this.keyMapping.clear();
  }

  preventDefault(event: KeyboardEvent): void {
    event.preventDefault();
  }

  attachEventListeners(target: EventTarget): void {
    target.addEventListener('keydown', this.handleKeyDown.bind(this));
    target.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  detachEventListeners(target: EventTarget): void {
    target.removeEventListener('keydown', this.handleKeyDown.bind(this));
    target.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }
}
