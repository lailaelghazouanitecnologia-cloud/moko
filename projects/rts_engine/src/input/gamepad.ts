import { InputDevice } from './input-device';

/**
 * Game controller input device implementation
 * Supports standard gamepad features including buttons, axes, vibration, and event callbacks
 */
export class Gamepad implements InputDevice {
  private buttons: GamepadButton[] = [];
  private axes: number[] = [];
  private index: number = -1;
  private connected: boolean = false;
  private buttonPressCallbacks: ((index: number) => void)[] = [];
  private gamepad: globalThis.Gamepad | null = null;
  private previousButtons: boolean[] = [];
  private vibrationSupported: boolean = false;
  private deadzone: number = 0.15;

  constructor(index: number = 0) {
    this.validateIndex(index);
    this.index = index;
    this.checkVibrationSupport();
  }

  /**
   * Connect to the gamepad and initialize state
   * @throws Error if gamepad not found at index
   */
  public connect(): void {
    if (this.connected) return;
    
    this.pollGamepad();
    if (!this.gamepad) {
      throw new Error(`Gamepad not found at index ${this.index}`);
    }
    
    this.connected = true;
    this.setupInitialState();
  }

  /**
   * Disconnect from the gamepad and cleanup
   */
  public disconnect(): void {
    this.connected = false;
    this.gamepad = null;
    this.buttons = [];
    this.axes = [];
    this.previousButtons = [];
    this.buttonPressCallbacks = [];
  }

  /**
   * Check if gamepad is currently connected
   * @returns Connection status
   */
  public isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get unique identifier for this gamepad
   * @returns Device ID string
   */
  public getId(): string {
    return `gamepad-${this.index}`;
  }

  /**
   * Get button data by index
   * @param index - Button index (0-based)
   * @returns Button state object
   * @throws Error if index is invalid
   */
  public getButton(index: number): GamepadButton {
    this.validateButtonIndex(index);
    
    if (!this.connected || index >= this.buttons.length) {
      return { pressed: false, value: 0, touched: false };
    }
    
    return this.buttons[index];
  }

  /**
   * Get axis value by index
   * @param index - Axis index (0-based)
   * @returns Axis value between -1 and 1
   * @throws Error if index is invalid
   */
  public getAxis(index: number): number {
    this.validateAxisIndex(index);
    
    if (!this.connected || index >= this.axes.length) {
      return 0;
    }
    
    return this.applyDeadzone(this.axes[index]);
  }

  /**
   * Check if button is currently pressed
   * @param index - Button index (0-based)
   * @returns True if button is pressed
   * @throws Error if index is invalid
   */
  public isButtonPressed(index: number): boolean {
    this.validateButtonIndex(index);
    
    if (!this.connected || index >= this.buttons.length) {
      return false;
    }
    
    return this.buttons[index].pressed;
  }

  /**
   * Trigger vibration/rumble effect
   * @param duration - Duration in milliseconds
   * @param intensity - Vibration intensity (0-1)
   */
  public vibrate(duration: number, intensity: number): void {
    if (!this.connected || !this.gamepad || !this.vibrationSupported) return;
    
    this.validateVibrationParams(duration, intensity);
    
    const actuator = this.gamepad.vibrationActuator;
    if (actuator && actuator.playEffect) {
      actuator.playEffect('dual-rumble', {
        duration: Math.max(0, duration),
        strongMagnitude: Math.max(0, Math.min(1, intensity)),
        weakMagnitude: Math.max(0, Math.min(1, intensity * 0.5))
      }).catch((error: Error) => {
        console.warn(`Vibration failed: ${error.message}`);
      });
    }
  }

  /**
   * Register callback for button press events
   * @param callback - Function to call when button is pressed
   */
  public onButtonPress(callback: (index: number) => void): void {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    this.buttonPressCallbacks.push(callback);
  }

  /**
   * Remove button press callback
   * @param callback - Function to remove
   */
  public offButtonPress(callback: (index: number) => void): void {
    const index = this.buttonPressCallbacks.indexOf(callback);
    if (index !== -1) {
      this.buttonPressCallbacks.splice(index, 1);
    }
  }

  /**
   * Update gamepad state - call this in your game loop
   */
  public update(): void {
    if (!this.connected) return;
    
    this.pollGamepad();
    if (!this.gamepad) {
      this.disconnect();
      return;
    }

    this.updateButtons();
    this.updateAxes();
  }

  /**
   * Get number of available buttons
   * @returns Button count
   */
  public getButtonCount(): number {
    return this.connected ? this.buttons.length : 0;
  }

  /**
   * Get number of available axes
   * @returns Axis count
   */
  public getAxisCount(): number {
    return this.connected ? this.axes.length : 0;
  }

  /**
   * Set deadzone for analog sticks
   * @param value - Deadzone value (0-1)
   */
  public setDeadzone(value: number): void {
    if (value < 0 || value > 1) {
      throw new Error('Deadzone must be between 0 and 1');
    }
    this.deadzone = value;
  }

  /**
   * Get current deadzone value
   * @returns Deadzone value
   */
  public getDeadzone(): number {
    return this.deadzone;
  }

  private pollGamepad(): void {
    try {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[this.index];
      
      if (gp && gp.connected) {
        this.gamepad = gp;
      } else {
        this.gamepad = null;
      }
    } catch (error) {
      console.warn('Failed to poll gamepad:', error);
      this.gamepad = null;
    }
  }

  private setupInitialState(): void {
    if (!this.gamepad) return;
    
    this.buttons = new Array(this.gamepad.buttons.length).fill(null).map(() => ({
      pressed: false,
      value: 0,
      touched: false
    }));
    
    this.axes = new Array(this.gamepad.axes.length).fill(0);
    this.previousButtons = new Array(this.gamepad.buttons.length).fill(false);
  }

  private updateButtons(): void {
    if (!this.gamepad) return;
    
    for (let i = 0; i < this.gamepad.buttons.length; i++) {
      const button = this.gamepad.buttons[i];
      const wasPressed = this.previousButtons[i];
      const isPressed = button.pressed;
      
      this.buttons[i] = {
        pressed: button.pressed,
        value: button.value,
        touched: button.touched || button.value > 0
      };
      
      if (!wasPressed && isPressed) {
        this.triggerButtonPress(i);
      }
      
      this.previousButtons[i] = isPressed;
    }
  }

  private updateAxes(): void {
    if (!this.gamepad) return;
    
    for (let i = 0; i < this.gamepad.axes.length; i++) {
      this.axes[i] = this.gamepad.axes[i];
    }
  }

  private triggerButtonPress(index: number): void {
    for (const callback of this.buttonPressCallbacks) {
      try {
        callback(index);
      } catch (error) {
        console.error(`Button press callback error: ${error}`);
      }
    }
  }

  private validateButtonIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error(`Invalid button index: ${index}. Must be non-negative integer.`);
    }
  }

  private validateAxisIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error(`Invalid axis index: ${index}. Must be non-negative integer.`);
    }
  }

  private validateIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error(`Invalid gamepad index: ${index}. Must be non-negative integer.`);
    }
  }

  private validateVibrationParams(duration: number, intensity: number): void {
    if (!Number.isFinite(duration) || duration < 0) {
      throw new Error('Duration must be a non-negative number');
    }
    if (!Number.isFinite(intensity) || intensity < 0 || intensity > 1) {
      throw new Error('Intensity must be between 0 and 1');
    }
  }

  private applyDeadzone(value: number): number {
    if (Math.abs(value) < this.deadzone) {
      return 0;
    }
    return value;
  }

  private checkVibrationSupport(): void {
    try {
      const gamepads = navigator.getGamepads();
      const gp = gamepads[this.index];
      this.vibrationSupported = !!(gp && gp.vibrationActuator);
    } catch {
      this.vibrationSupported = false;
    }
  }
}
