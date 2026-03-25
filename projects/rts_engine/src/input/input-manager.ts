import { Keyboard } from './keyboard';
import { Mouse } from './mouse';
import { Touch } from './touch';
import { Gamepad } from './gamepad';
import { ElementInput } from './element-input';

/**
 * Central hub for all input devices.
 * Manages keyboard, mouse, touch, and gamepad input with action binding support.
 */
export class InputManager {
  private keyboard: Keyboard;
  private mouse: Mouse;
  private touch: Touch;
  private gamepad: Gamepad;
  private bindings: Map<string, ElementInput>;
  private enabledDevices: Set<string> = new Set(['keyboard', 'mouse', 'touch', 'gamepad']);

  constructor() {
    this.keyboard = new Keyboard();
    this.mouse = new Mouse();
    this.touch = new Touch();
    this.gamepad = new Gamepad();
    this.bindings = new Map();
  }

  /**
   * Polls all input devices and updates their states.
   * Should be called once per frame.
   */
  update(): void {
    this.keyboard.reset();
    this.mouse.update();
    this.touch.update();
    this.gamepad.update();
  }

  /**
   * Checks if any input device has the specified key pressed.
   * Supports keyboard keys and mouse buttons (mouse-left, mouse-middle, mouse-right).
   * @param key - The key or button to check
   * @returns true if the key is pressed on any device
   */
  isAnyPressed(key: string): boolean {
    if (typeof key !== 'string' || key.length === 0) {
      return false;
    }

    if (this.keyboard.isKeyDown(key)) return true;
    if (this.mouse.isPressed(0) && key === 'mouse-left') return true;
    if (this.mouse.isPressed(1) && key === 'mouse-middle') return true;
    if (this.mouse.isPressed(2) && key === 'mouse-right') return true;
    return false;
  }

  /**
   * Maps an action name to an input element.
   * @param action - The action name to bind
   * @param mapping - The input element to bind to the action
   * @throws Error if action is not a non-empty string or mapping is invalid
   */
  bind(action: string, mapping: ElementInput): void {
    if (typeof action !== 'string' || action.length === 0) {
      throw new Error('Action must be a non-empty string');
    }
    if (!mapping || typeof mapping !== 'object') {
      throw new Error('Mapping must be a valid ElementInput object');
    }
    this.bindings.set(action, mapping);
  }

  /**
   * Removes a mapping for the specified action.
   * @param action - The action name to unbind
   * @throws Error if action is not a non-empty string
   */
  unbind(action: string): void {
    if (typeof action !== 'string' || action.length === 0) {
      throw new Error('Action must be a non-empty string');
    }
    this.bindings.delete(action);
  }

  /**
   * Retrieves the input mapping for the specified action.
   * @param action - The action name to look up
   * @returns The ElementInput mapping or null if not found
   * @throws Error if action is not a non-empty string
   */
  getBinding(action: string): ElementInput | null {
    if (typeof action !== 'string' || action.length === 0) {
      throw new Error('Action must be a non-empty string');
    }
    return this.bindings.get(action) || null;
  }

  /**
   * Removes all action mappings.
   */
  clearBindings(): void {
    this.bindings.clear();
  }

  /**
   * Enables the specified input device.
   * @param device - The device to enable ('keyboard', 'mouse', 'touch', 'gamepad')
   * @throws Error if device is not a valid device name
   */
  enable(device: string): void {
    if (typeof device !== 'string' || device.length === 0) {
      throw new Error('Device must be a non-empty string');
    }
    if (!this.isValidDevice(device)) {
      throw new Error(`Invalid device: ${device}. Valid devices are: keyboard, mouse, touch, gamepad`);
    }
    this.enabledDevices.add(device);
    this.resetDevice(device);
  }

  /**
   * Disables the specified input device.
   * @param device - The device to disable ('keyboard', 'mouse', 'touch', 'gamepad')
   * @throws Error if device is not a valid device name
   */
  disable(device: string): void {
    if (typeof device !== 'string' || device.length === 0) {
      throw new Error('Device must be a non-empty string');
    }
    if (!this.isValidDevice(device)) {
      throw new Error(`Invalid device: ${device}. Valid devices are: keyboard, mouse, touch, gamepad`);
    }
    this.enabledDevices.delete(device);
    this.resetDevice(device);
  }

  /**
   * Checks if a device is currently enabled.
   * @param device - The device to check
   * @returns true if the device is enabled
   */
  isDeviceEnabled(device: string): boolean {
    return this.enabledDevices.has(device);
  }

  /**
   * Gets a list of all enabled devices.
   * @returns Array of enabled device names
   */
  getEnabledDevices(): string[] {
    return Array.from(this.enabledDevices);
  }

  /**
   * Resets the state of the specified device.
   * @param device - The device to reset
   */
  private resetDevice(device: string): void {
    switch (device) {
      case 'keyboard':
        this.keyboard.reset();
        break;
      case 'mouse':
        this.mouse.reset();
        break;
      case 'touch':
        this.touch.reset();
        break;
      case 'gamepad':
        this.gamepad.reset();
        break;
    }
  }

  /**
   * Validates if the given device name is valid.
   * @param device - The device name to validate
   * @returns true if the device is valid
   */
  private isValidDevice(device: string): boolean {
    return ['keyboard', 'mouse', 'touch', 'gamepad'].includes(device);
  }
}
