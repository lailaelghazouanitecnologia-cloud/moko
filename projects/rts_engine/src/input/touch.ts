export class Touch {
    public identifier: number;
    public target: EventTarget;
    public clientX: number;
    public clientY: number;
    public screenX: number;
    public screenY: number;
    public radiusX: number;
    public radiusY: number;
    public rotationAngle: number;
    public force: number;

    constructor(
        identifier: number,
        target: EventTarget,
        clientX: number,
        clientY: number,
        screenX: number,
        screenY: number,
        radiusX: number,
        radiusY: number,
        rotationAngle: number,
        force: number
    ) {
        this.identifier = identifier;
        this.target = target;
        this.clientX = clientX;
        this.clientY = clientY;
        this.screenX = screenX;
        this.screenY = screenY;
        this.radiusX = radiusX;
        this.radiusY = radiusY;
        this.rotationAngle = rotationAngle;
        this.force = force;
    }

    /**
     * Returns the client coordinates of the touch point.
     * @returns An object with x and y properties representing the client coordinates.
     */
    getCoordinates(): { x: number; y: number } {
        return { x: this.clientX, y: this.clientY };
    }

    /**
     * Returns the screen coordinates of the touch point.
     * @returns An object with x and y properties representing the screen coordinates.
     */
    getScreenCoordinates(): { x: number; y: number } {
        return { x: this.screenX, y: this.screenY };
    }

    /**
     * Returns the pressure of the touch.
     * @returns A number representing the force of the touch.
     */
    getPressure(): number {
        return this.force;
    }

    /**
     * Returns the ellipse parameters for the touch area.
     * @returns An object with radiusX, radiusY, and rotation properties.
     */
    getEllipse(): { radiusX: number; radiusY: number; rotation: number } {
        return { radiusX: this.radiusX, radiusY: this.radiusY, rotation: this.rotationAngle };
    }

    /**
     * Compares this touch with another touch for equality.
     * @param other - The other Touch instance to compare with.
     * @returns True if all properties are equal, false otherwise.
     */
    equals(other: Touch): boolean {
        if (!other || !(other instanceof Touch)) {
            return false;
        }
        return (
            this.identifier === other.identifier &&
            this.target === other.target &&
            this.clientX === other.clientX &&
            this.clientY === other.clientY &&
            this.screenX === other.screenX &&
            this.screenY === other.screenY &&
            this.radiusX === other.radiusX &&
            this.radiusY === other.radiusY &&
            this.rotationAngle === other.rotationAngle &&
            this.force === other.force
        );
    }

    /**
     * Creates a deep copy of this touch instance.
     * @returns A new Touch instance with the same properties.
     */
    clone(): Touch {
        return new Touch(
            this.identifier,
            this.target,
            this.clientX,
            this.clientY,
            this.screenX,
            this.screenY,
            this.radiusX,
            this.radiusY,
            this.rotationAngle,
            this.force
        );
    }
}
