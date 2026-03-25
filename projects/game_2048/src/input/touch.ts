/**
 * Represents a single touch contact with position and pressure information.
 */
export class Touch {
    private identifier: number;
    private x: number;
    private y: number;
    private force: number;

    /**
     * Creates a new Touch instance.
     * @param identifier - Unique identifier for this touch
     * @param x - X coordinate of the touch
     * @param y - Y coordinate of the touch
     * @param force - Pressure value (0-1, where 0 means no pressure)
     * @throws {TypeError} If any parameter is not a number
     * @throws {RangeError} If force is negative or identifier is negative
     */
    constructor(identifier: number, x: number, y: number, force: number) {
        this.validateConstructorParams(identifier, x, y, force);
        this.identifier = identifier;
        this.x = x;
        this.y = y;
        this.force = force;
    }

    /**
     * Gets the unique identifier for this touch.
     * @returns The touch identifier
     */
    getIdentifier(): number {
        return this.identifier;
    }

    /**
     * Gets the X coordinate of the touch.
     * @returns The x coordinate
     */
    getX(): number {
        return this.x;
    }

    /**
     * Gets the Y coordinate of the touch.
     * @returns The y coordinate
     */
    getY(): number {
        return this.y;
    }

    /**
     * Gets the pressure value of the touch.
     * @returns The force value (0-1)
     */
    getForce(): number {
        return this.force;
    }

    /**
     * Checks if this touch has moved compared to another touch state.
     * @param other - The other touch to compare against
     * @returns True if position has changed, false otherwise
     * @throws {TypeError} If other is not a Touch instance
     */
    moved(other: Touch): boolean {
        this.validateTouchParameter(other, 'other');
        return this.x !== other.x || this.y !== other.y;
    }

    /**
     * Checks if this touch represents a press event compared to another state.
     * A press occurs when the same touch goes from no pressure to having pressure.
     * @param other - The other touch to compare against
     * @returns True if this represents a press event
     * @throws {TypeError} If other is not a Touch instance
     */
    pressed(other: Touch): boolean {
        this.validateTouchParameter(other, 'other');
        return this.identifier === other.identifier && other.force > 0 && this.force === 0;
    }

    /**
     * Checks if this touch represents a release event compared to another state.
     * A release occurs when the same touch goes from having pressure to no pressure.
     * @param other - The other touch to compare against
     * @returns True if this represents a release event
     * @throws {TypeError} If other is not a Touch instance
     */
    released(other: Touch): boolean {
        this.validateTouchParameter(other, 'other');
        return this.identifier === other.identifier && this.force > 0 && other.force === 0;
    }

    /**
     * Validates constructor parameters.
     * @throws {TypeError} If any parameter is not a number
     * @throws {RangeError} If force is negative or identifier is negative
     */
    private validateConstructorParams(identifier: number, x: number, y: number, force: number): void {
        if (typeof identifier !== 'number' || isNaN(identifier)) {
            throw new TypeError('Identifier must be a valid number');
        }
        if (typeof x !== 'number' || isNaN(x)) {
            throw new TypeError('X coordinate must be a valid number');
        }
        if (typeof y !== 'number' || isNaN(y)) {
            throw new TypeError('Y coordinate must be a valid number');
        }
        if (typeof force !== 'number' || isNaN(force)) {
            throw new TypeError('Force must be a valid number');
        }
        if (identifier < 0) {
            throw new RangeError('Identifier cannot be negative');
        }
        if (force < 0) {
            throw new RangeError('Force cannot be negative');
        }
    }

    /**
     * Validates that a parameter is a Touch instance.
     * @param touch - The parameter to validate
     * @param paramName - The parameter name for error messages
     * @throws {TypeError} If touch is not a Touch instance
     */
    private validateTouchParameter(touch: Touch, paramName: string): void {
        if (!(touch instanceof Touch)) {
            throw new TypeError(`${paramName} must be a Touch instance`);
        }
    }
}
