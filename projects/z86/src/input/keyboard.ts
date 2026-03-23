import { EventEmitter } from '../core';
import { Vec2 } from '../math';

export class Keyboard extends EventEmitter {
  private _keys: Map<string, boolean> = new Map();
  private _keyCodes: Map<number, string> = new Map([
    [8, 'Backspace'],
    [9, 'Tab'],
    [13, 'Enter'],
    [16, 'Shift'],
    [17, 'Control'],
    [18, 'Alt'],
    [19, 'Pause'],
    [20, 'CapsLock'],
    [27, 'Escape'],
    [32, ' '],
    [33, 'PageUp'],
    [34, 'PageDown'],
    [35, 'End'],
    [36, 'Home'],
    [37, 'ArrowLeft'],
    [38, 'ArrowUp'],
    [39, 'ArrowRight'],
    [40, 'ArrowDown'],
    [45, 'Insert'],
    [46, 'Delete'],
    [48, '0'],
    [49, '1'],
    [50, '2'],
    [51, '3'],
    [52, '4'],
    [53, '5'],
    [54, '6'],
    [55, '7'],
    [56, '8'],
    [57, '9'],
    [65, 'a'],
    [66, 'b'],
    [67, 'c'],
    [68, 'd'],
    [69, 'e'],
    [70, 'f'],
    [71, 'g'],
    [72, 'h'],
    [73, 'i'],
    [74, 'j'],
    [75, 'k'],
    [76, 'l'],
    [77, 'm'],
    [78, 'n'],
    [79, 'o'],
    [80, 'p'],
    [81, 'q'],
    [82, 'r'],
    [83, 's'],
    [84, 't'],
    [85, 'u'],
    [86, 'v'],
    [87, 'w'],
    [88, 'x'],
    [89, 'y'],
    [90, 'z'],
    [91, 'Meta'],
    [92, 'Meta'],
    [93, 'Meta'],
    [96, '0'],
    [97, '1'],
    [98, '2'],
    [99, '3'],
    [100, '4'],
    [101, '5'],
    [102, '6'],
    [103, '7'],
    [104, '8'],
    [105, '9'],
    [106, '*'],
    [107, '+'],
    [109, '-'],
    [110, '.'],
    [111, '/'],
    [112, 'F1'],
    [113, 'F2'],
    [114, 'F3'],
    [115, 'F4'],
    [116, 'F5'],
    [117, 'F6'],
    [118, 'F7'],
    [119, 'F8'],
    [120, 'F9'],
    [121, 'F10'],
    [122, 'F11'],
    [123, 'F12'],
    [144, 'NumLock'],
    [145, 'ScrollLock'],
    [186, ';'],
    [187, '='],
    [188, ','],
    [189, '-'],
    [190, '.'],
    [191, '/'],
    [192, '`'],
    [219, '['],
    [220, '\\'],
    [221, ']'],
    [222, "'"]
  ]);

  constructor() {
    super();
    this._setupEventListeners();
  }

  private _setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', this._onKeyDown.bind(this));
    window.addEventListener('keyup', this._onKeyUp.bind(this));
  }

  private _onKeyDown(event: KeyboardEvent): void {
    const key = this._getKeyFromEvent(event);
    if (!key) return;

    this._keys.set(key, true);
    this.emit('keydown', key, event);
  }

  private _onKeyUp(event: KeyboardEvent): void {
    const key = this._getKeyFromEvent(event);
    if (!key) return;

    this._keys.set(key, false);
    this.emit('keyup', key, event);
  }

  private _getKeyFromEvent(event: KeyboardEvent): string | null {
    if (this._keyCodes.has(event.keyCode)) {
      return this._keyCodes.get(event.keyCode)!;
    }
    return event.key;
  }

  keyDown(key: string): boolean {
    return this._keys.get(key) === true;
  }

  keyUp(key: string): boolean {
    return this._keys.get(key) === false;
  }

  isPressed(key: string): boolean {
    return this._keys.get(key) === true;
  }

  destroy(): void {
    if (typeof window === 'undefined') return;

    window.removeEventListener('keydown', this._onKeyDown.bind(this));
    window.removeEventListener('keyup', this._onKeyUp.bind(this));
    this._keys.clear();
  }
}
