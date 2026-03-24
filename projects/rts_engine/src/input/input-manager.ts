import { InputDevice } from './input-device';
import { Keyboard } from './keyboard';
import { EventDispatcher } from './event-dispatcher';
import { InputMapping } from './input-mapping';

/**
 * Central input coordinator that manages all input devices and handles input mappings.
 * Provides a unified interface for handling keyboard, mouse and other input devices.
 */
export class InputManager {
  private devices: Map<string, InputDevice> = new Map<string, InputDevice>();
  private dispatcher: EventDispatcher = new EventDispatcher();
  private keyboard: Keyboard | null = null;
  private mouse: Mouse | null = null;

  constructor() {
    this.initializeDefaultDevices();
  }

  /**
   * Initializes default input devices (keyboard and mouse) and registers them with the manager.
   * @private
   */
  private initializeDefaultDevices(): void {
    this.keyboard = new Keyboard();
    this.mouse = new Mouse();
    
    this.registerDevice(this.keyboard);
    this.registerDevice(this.mouse);
  }

  /**
   * Registers an input device with the manager.
   * @param device - The input device to register
   * @throws {Error} If device is null, undefined, or invalid
   * @throws {Error} If a device with the same ID is already registered
   */
  registerDevice(device: InputDevice): void {
    if (!device) {
      throw new Error('Device cannot be null or undefined');
    }

    if (typeof device.getId !== 'function') {
      throw new Error('Device must have a getId() method');
    }

    const id = device.getId();
    if (!id || typeof id !== 'string') {
      throw new Error('Device must have a valid string ID');
    }

    if (this.devices.has(id)) {
      throw new Error(`Device with id '${id}' is already registered`);
    }
    
    this.devices.set(id, device);
    
    if (device instanceof Keyboard) {
      this.keyboard = device;
    } else if (device instanceof Mouse) {
      this.mouse = device;
    }
    
    device.connect();
  }

  /**
   * Unregisters an input device from the manager.
   * @param id - The ID of the device to unregister
   * @throws {Error} If ID is invalid or device not found
   */
  unregisterDevice(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Device ID must be a valid string');
    }

    const device = this.devices.get(id);
    if (!device) {
      throw new Error(`Device with id '${id}' is not registered`);
    }
    
    device.disconnect();
    this.devices.delete(id);
    
    if (device instanceof Keyboard) {
      this.keyboard = null;
    } else if (device instanceof Mouse) {
      this.mouse = null;
    }
  }

  /**
   * Retrieves a registered device by its ID.
   * @param id - The ID of the device to retrieve
   * @returns The input device or null if not found
   */
  getDevice(id: string): InputDevice | null {
    if (!id || typeof id !== 'string') {
      return null;
    }
    return this.devices.get(id) || null;
  }

  /**
   * Gets the keyboard device instance.
   * @returns The keyboard device
   * @throws {Error} If keyboard is not available
   */
  getKeyboard(): Keyboard {
    if (!this.keyboard) {
      throw new Error('Keyboard device is not available');
    }
    return this.keyboard;
  }

  /**
   * Gets the mouse device instance.
   * @returns The mouse device
   * @throws {Error} If mouse is not available
   */
  getMouse(): Mouse {
    if (!this.mouse) {
      throw new Error('Mouse device is not available');
    }
    return this.mouse;
  }

  /**
   * Updates all connected input devices.
   * This method should be called once per frame to process input events.
   */
  update(): void {
    for (const device of this.devices.values()) {
      if (device.isConnected()) {
        try {
          (device as any).update();
        } catch (error) {
          console.error(`Error updating device ${device.getId()}:`, error);
        }
      }
    }
  }

  /**
   * Binds an action to an input mapping.
   * @param action - The name of the action to bind
   * @param mapping - The input mapping configuration
   * @throws {Error} If action is invalid or mapping is null/undefined
   */
  bindAction(action: string, mapping: InputMapping): void {
    if (!action || typeof action !== 'string') {
      throw new Error('Action must be a valid string');
    }

    if (!mapping) {
      throw new Error('Mapping cannot be null or undefined');
    }

    this.dispatcher.on(action, (input: any, device: InputDevice) => {
      if (mapping.matches(device, input)) {
        this.dispatcher.emit(action, input, device);
      }
    });
  }

  /**
   * Gets all registered device IDs.
   * @returns Array of device IDs
   */
  getDeviceIds(): string[] {
    return Array.from(this.devices.keys());
  }

  /**
   * Gets the count of registered devices.
   * @returns Number of registered devices
   */
  getDeviceCount(): number {
    return this.devices.size;
  }

  /**
   * Checks if a device with the given ID is registered.
   * @param id - The device ID to check
   * @returns True if device is registered, false otherwise
   */
  hasDevice(id: string): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }
    return this.devices.has(id);
  }

  /**
   * Clears all registered devices and resets the manager state.
   */
  clear(): void {
    for (const device of this.devices.values()) {
      device.disconnect();
    }
    this.devices.clear();
    this.keyboard = null;
    this.mouse = null;
  }

  /**
   * Gets the event dispatcher for advanced event handling.
   * @returns The event dispatcher instance
   */
  getDispatcher(): EventDispatcher {
    return this.dispatcher;
  }
}

class Mouse extends InputDevice {
  constructor() {
    super();
  }
}
