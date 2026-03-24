/**
 * Represents the state of a single gamepad button.
 */
export interface GamepadButton {
  /**
   * True if the button is currently pressed.
   */
  pressed: boolean;

  /**
   * Analogue value, typically between 0.0 and 1.0.
   * @minimum 0
   * @maximum 1
   */
  value: number;

  /**
   * True if the button has been touched (for touch-sensitive controllers).
   */
  touched: boolean;
}

export namespace GamepadButton {
  /**
   * Index of the A button in the standard gamepad mapping.
   */
  export const A = 0;

  /**
   * Index of the B button in the standard gamepad mapping.
   */
  const B = 1;

  /**
   * Index of the X button in the standard gamepad mapping.
   */
  const X = 2;

  /**
   * Index of the Y button in the standard map.
   */
  const Y = 3;

  /**
   * Returns the numeric index for a given button name.
   * @param name - Case-insensitive name ('A', 'B', 'X', 'Y')
   * @throws {RangeError} If name is not a valid button name
   */
  export function indexOf(name: string): number {
    const n = name.toUpperCase();
    switch (n) {
      case 'A':
        return A;
      case 'B':
        return B;
      case 'X':
        return X;
      case 'Y':
        return Y;
      default:
        throw new RangeError(`Unknown button name "${name}"`);
    }
  }

  /**
   * Validates that a raw gamepad button object conforms to this interface.
   * @param raw - Object to validate
   * @throws {TypeError} If any property is missing or invalid
   */
  export function validate(raw: any): asserts raw is GamepadButton {
    if (typeof raw !== 'object' || raw === null) {
      throw new TypeError('Expected an object');
    }
    if (typeof raw.pressed !== 'boolean') {
      throw new TypeError('pressed must be a boolean');
    }
    if (typeof raw.value !== 'number' || isNaN(raw.value)) {
      throw new TypeError('value must be a number');
    }
    if (raw.value < 0 || raw.value > 1) {
      throw new RangeError('value must be between 0 and 1');
    }
    if (typeof raw.touched !== 'boolean') {
      throw new TypeError('touched must be a boolean');
    }
  }

  /**
   * Creates a new GamepadButton with sensible defaults.
   * @param init - Partial state to override defaults
   */
  export function create(init?: Partial<GamepadButton>): GamepadButton {
    const defaults: GamepadButton = {
      pressed: false,
      value: 0,
      touched: false,
    };
    return { ...defaults, ...init };
  }
}
