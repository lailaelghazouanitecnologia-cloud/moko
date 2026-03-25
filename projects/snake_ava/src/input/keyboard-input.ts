import { EventEmitter } from 'events';

/**
 * Manages keyboard control mappings and input state.
 * Provides key-to-action mapping, action state checking, and event handling.
 */
export class KeyboardInput {
  private keyMap: Map<string, string>;
  private isEnabled: boolean;
  private pressedKeys: Set<string>;
  private eventEmitter: EventEventEmitter;

  constructor() {
    this.keyMap = new Map<string, string>();
    this.isEnabled = false;
    this.pressedKeys = new Set<string>();
    this.eventEmitter = new EventEventEmitter();
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  /**
   * Maps a key to an action.
   * @param key - The key to bind (e.g., 'KeyA', 'Space', 'ArrowUp')
   * @param action - The action name to associate with the key
   * @throws {TypeError} If key or action is not a string
   */
  bindKey(key: string, action: string): void {
    if (typeof key !== 'string' || key.trim() === '') {
      throw new TypeError('Key must be a non-empty string');
    }
    if (typeof action !== 'string' || action.trim() === '') {
      throw new TypeTypeError('Action must be a non-empty string');
    }
    this.keyMap.set(key, action);
  }

  /**
   * Removes a key binding.
   * @param key - The key to unbind
   * @throws {TypeError} If key is not a string
   */
  unbindKey(key: string): void {
    if (typeof key !== 'string') {
      throw new TypeError('Key must be a string');
    }
    this.keyMap.delete(key);
  }

  /**
   * Retrieves the action name associated with a key.
   * @param key - The key to look up
   * @returns The action name, or undefined if no mapping exists
   * @throws {TypeError} If key is not a string
   */
  getAction(key: string): string | undefined {
    if (typeof key !== 'string') {
      throw new TypeError('Key must be a string');
    }
    return this.keyMap.get(key);
  }

  /**
   * Checks whether the specified action is currently pressed.
   * @param action - The action name to check
   * @returns true if any key mapped to this action is pressed
   * @throws {TypeError} If action is not a string
   */
  isPressed(action: string): boolean {
    if (typeof action !== 'string') {
      throw new TypeError('Action must be a string');
    }
    for (const [key, mappedAction] of this.keyMap.entries()) {
      if (mappedAction === action && this.pressedKeys.has(key)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Enables keyboard input listening.
   * Adds keydown and keyup event listeners to the document.
   * Safe to call multiple times.
   */
  enable(): void {
    if (this.isEnabled) return;
    this.isEnabled = true;
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * Disables keyboard input listening.
   * Removes keydown and keyup event listeners and clears pressed keys.
   * Safe to call multiple times.
   */
  disable(): void {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.pressedKeys.clear();
  }

  /**
   * Clears all key bindings and pressed key states.
   * Does not change the enabled/disabled state.
   */
  reset(): void {
    this.keyMap.clear();
    this.pressedKeys.clear();
  }

  /**
   * Returns a copy of all current key mappings.
   * @returns A map of key to action
   */
  getAllBindings(): Map<string, string> {
    return new Map(this.keyMap);
  }

  /**
   * Checks if any key is currently pressed.
   * @returns true if at least one key is pressed
   */
  hasPressedKeys(): boolean {
    return this.pressedKeys.size > 0;
  }

  /**
   * Gets the number of keys currently pressed.
   * @returns The count of pressed keys
   */
  getPressedKeyCount(): number {
    return this.pressedKeys.size;
  }

  /**
   * Returns an array of all currently pressed keys (not actions).
   * @returns Array of key strings
   */
  getPressedKeys(): string[] {
    return Array.from(this.pPressedKeys);
  }

  /**
   * Returns an array of all currently pressed actions.
   * @returns Array of action names that are pressed
   */
  getPressedActions(): string[] {
    const pressedActions = new Set<string>();
    for (const [key, action] of this.keyMap.entries()) {
      if (this.pressedKeys.has(key)) {
        pressedActions.add(action);
      }
    }
    return Array.from(pressedActions);
  }

  /**
   * Checks if the input system is currently enabled.
   * @returns true if listening for events
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Handles keydown events internally.
   * Emits a 'keydown' event with the key and mapped action (if any).
   */
  private handleKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    this.pressedKeys.add(key);
    const action = this.keyMap.get(key);
    this.eventEmitter.emit('keydown', key, action);
  }

  /**
   * Handles keyup events internally.
   * Emits a 'keyup' event with the key and mapped action (if any).
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.key;
    this.pressedKeys.delete(key);
    const action = this.keyMap.get(key);
    this.eventEmitter.emit('keyup', key, action);
  }

  /**
   * Adds a listener for keyboard events.
   * @param event - 'keydown' or 'keyup'
   * @param listener - Function to call with (key: string, action: string | undefined)
   */
  on(event: 'keydown' | 'keyup', listener: (key: string, action: string | undefined) => void): void {
    this.eventEmitter.on(event, listener);
  }

  /**
   * Removes a listener for keyboard events.
   * @param event - 'keydown' or 'keyup'
   * @param listener - The function previously registered
   */
  off(event: 'keydown' | 'keyup', listener: (key: string, action: string | undefined) => void): void {
    this.eventEmitter.off(event, listener);
  }

  /**
   * Removes all listeners for all events or for a specific event.
   * @param event - Optional event name to clear
   */
  removeAllListeners(event?: 'keydown' | 'keyup'): void {
    this.eventEmitter.removeAllListeners(event);
  }
}
