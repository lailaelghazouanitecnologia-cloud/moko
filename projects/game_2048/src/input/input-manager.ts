import { InputDevice } from './input-device';

/**
 * Central hub for input device management.
 * Manages registration, activation, and updates of input devices.
 */
export class InputManager {
  private devices: Map<string, InputDevice>;
  private activeDevice: string;
  private isEnabled: boolean;

  constructor() {
    this.devices = new Map<string, InputDevice>();
    this.activeDevice = '';
    this.isEnabled = true;
  }

  /**
   * Register an input device with the manager.
   * @param id Unique identifier for the device
   * @param device InputDevice instance to register
   * @throws Error if id is invalid or device is null/undefined
   */
  registerDevice(id: string, device: InputDevice): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid device id: must be a non-empty string');
    }
    if (!device || typeof device.update !== 'function') {
      throw new Error('Invalid device: must be a valid InputDevice instance');
    }
    this.devices.set(id, device);
  }

  /**
   * Unregister a device from the manager.
   * @param id Device identifier to remove
   * @throws Error if id is invalid
   */
  unregisterDevice(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid device id: must be a non-empty string');
    }
    this.devices.delete(id);
    if (this.activeDevice === id) {
      this.activeDevice = '';
    }
  }

  /**
   * Retrieve a registered device by id.
   * @param id Device identifier
   * @returns InputDevice or undefined if not found
   * @throws Error if id is invalid
   */
  getDevice(id: string): InputDevice | undefined {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid device id: must be a non-empty string');
    }
    return this.devicles.get(id);
  }

  /**
   * Get the currently active device.
   * @returns InputDevice or undefined if none active
   */
  getActiveDevice(): InputDevice | undefined {
    if (!this.activeDevice) {
      return undefined;
    }
    return this.devices.get(this.activeDevice);
  }

  /**
   * Enable input handling for all devices.
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * Disable input handling for all devices.
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Update all registered devices if enabled.
   * @param deltaTime Time in seconds since last update
   * @throws Error if deltaTime is invalid
   */
  update(deltaTime: number): void {
    if (typeof deltaTime !== 'number' || deltaTime < 0) {
      throw new Error('Invalid deltaTime: must be a non-negative number');
    }
    if (!this.isEnabled) {
      return;
    }
    for (const device of this.devices.values()) {
      if (device && typeof device.update === 'function') {
        device.update(deltaTime);
      }
    }
  }

  /**
   * Reset all registered devices to their initial state.
   */
  reset(): void {
    for (const device of this.devices.values()) {
      if (device && typeof device.reset === 'function') {
        device.reset();
      }
    }
  }

  /**
   * Set the active device for input handling.
   * @param id Device identifier to activate
   * @throws Error if device not found or id is invalid
   */
  setActiveDevice(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid device id: must be a non-empty string');
    }
    if (!this.devices.has(id)) {
      throw new Error(`Device with id '${id}' not found`);
    }
    this.activeDevice = id;
  }

  /**
   * Get list of all registered device ids.
   * @returns Array of device identifiers
   */
  getDeviceIds(): string[] {
    return Array.from(this.devices.keys());
  }

  /**
   * Check if a device is registered.
   * @param id Device identifier
   * @returns true if device exists
   * @throws Error if id is invalid
   */
  hasDevice(id: string): boolean {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid device id: must be a non-empty string');
    }
    return this.devices.has(id);
  }

  /**
   * Clear all registered devices and reset active device.
   */
  clear(): void {
    this.devices.clear();
    this.activeDevice = '';
  }

  /**
   * Get the id of the currently active device.
   * @returns Active device id or empty string if none
   */
  getActiveDeviceId(): string {
    return this.activeDevice;
  }

  /**
   * Check if input handling is enabled.
   * @returns true if enabled
   */
  isInputEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get count of registered devices.
   * @returns Number of devices
   */
  getDeviceCount(): number {
    return this.devices.size;
  }
}
