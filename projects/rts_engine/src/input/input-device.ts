/**
 * Base input device interface
 */
export interface InputDevice {
  /**
   * Initialize device
   * @throws {Error} If device is already connected or initialization fails
   */
  connect(): void;

  /**
   * Release resources
   * @throws {Error} If device is not connected or disconnection fails
   */
  disconnect(): void;

  /**
   * Check device state
   * @returns {boolean} True if device is connected and ready, false otherwise
   */
  isConnected(): boolean;

  /**
   * Return unique device id
   * @returns {string} Unique identifier for this device
   * @throws {Error} If device is not initialized
   */
  getId(): string;
}
