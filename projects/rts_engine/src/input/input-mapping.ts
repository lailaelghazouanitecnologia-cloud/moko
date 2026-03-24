/**
 * Input mapping configuration
 */
export interface InputMapping {
  /**
   * Check if mapping matches
   * @param device - The input device to check against
   * @param input - The raw input event or value
   * @returns True if this mapping applies to the given device and input
   * @throws {TypeError} If device is null or undefined
   * @throws {TypeError} If input is null or undefined
   */
  matches(device: InputDevice, input: any): boolean;
}

/**
 * Represents an input device (keyboard, gamepad, mouse, etc.)
 */
export interface InputDevice {
  /**
   * Unique identifier for the device
   */
  id: string;

  /**
   * Human-readable name of the device
   */
  name: string;

  /**
   * Type of the device (keyboard, mouse, gamepad, etc.)
   */
  type: string;

  /**
   * Check if the device is currently connected
   */
  isConnected: boolean;
}
