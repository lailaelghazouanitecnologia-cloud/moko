/**
 * Shape types for colliders.
 * Defines the geometric primitives and mesh types that can be used for physics collision detection.
 */
export enum ColliderType {
  /**
   * Spherical collider with uniform radius in all directions.
   */
  SPHERE = 'sphere',

  /**
   * Axis-aligned rectangular prism collider defined by width, height, and depth.
   */
  BOX = 'box',

  /**
   * Capsule collider composed of two hemispheres connected by a cylinder.
   * Useful for character controllers and limb approximations.
   */
  CAPSULE = 'capsule',

  /**
   * Cylindrical collider with circular cross-section and uniform height.
   */
  CYLINDER = 'cylinder',

  /**
   * Conical collider with circular base and apex point.
   */
  CONE = 'cone',

  /**
   * Arbitrary mesh-based collider using triangle data.
   * Most expensive to process but allows for exact shape representation.
   */
  MESH = 'mesh'
}

/**
 * Utility class for handling ColliderType enum operations.
 * Provides validation, conversion, and metadata functionality.
 */
export class ColliderTypeUtils {
  /**
   * Array of all valid collider types.
   */
  private static readonly ALL_TYPES: readonly ColliderType[] = [
    ColliderType.SPHERE,
    ColliderType.BOX,
    ColliderType.CAPSULE,
    ColliderType.CYLINDER,
    ColliderType.CONE,
    ColliderType.MESH
  ];

  /**
   * Validates if a value is a valid ColliderType.
   * @param value - The value to validate
   * @returns True if the value is a valid ColliderType
   */
  static isValid(value: unknown): value is ColliderType {
    if (typeof value !== 'string') {
      return false;
    }
    return this.ALL_TYPES.includes(value as ColliderType);
  }

  /**
   * Attempts to parse a string into a ColliderType.
   * @param value - The string to parse
   * @returns The parsed ColliderType
   * @throws {Error} If the string is not a valid collider type
   */
  static parse(value: string): ColliderType {
    if (!this.isValid(value)) {
      throw new Error(`Invalid collider type: "${value}". Valid types are: ${this.ALL_TYPES.join(', ')}`);
    }
    return value as ColliderType;
  }

  /**
   * Safely parses a string into a ColliderType with a fallback value.
   * @param value - The string to parse
   * @param fallback - The fallback value if parsing fails
   * @returns The parsed ColliderType or the fallback value
   */
  static parseSafe(value: string, fallback: ColliderType = ColliderType.SPHERE): ColliderType {
    try {
      return this.parse(value);
    } catch {
      return fallback;
    }
  }

  /**
   * Gets all available collider types.
   * @returns Array of all collider types
   */
  static getAll(): readonly ColliderType[] {
    return this.ALL_TYPES;
  }

  /**
   * Gets a human-readable description for a collider type.
   * @param type - The collider type
   * @returns Description of the collider type
   */
  static getDescription(type: ColliderType): string {
    const descriptions: Record<ColliderType, string> = {
      [ColliderType.SPHERE]: 'Spherical collider with uniform radius',
      [ColliderType.BOX]: 'Axis-aligned rectangular prism',
      [ColliderType.CAPSULE]: 'Capsule with hemispheres and cylinder',
      [ColliderType.CYLINDER]: 'Cylindrical shape with circular cross-section',
      [ColliderType.CONE]: 'Conical shape with circular base',
      [ColliderType.MESH]: 'Triangle-based arbitrary mesh'
    };
    return descriptions[type] || 'Unknown collider type';
  }

  /**
   * Determines if a collider type is a primitive shape (non-mesh).
   * @param type - The collider type to check
   * @returns True if the type is a primitive shape
   */
  static isPrimitive(type: ColliderType): boolean {
    return type !== ColliderType.MESH;
  }

  /**
   * Determines if a collider type is a convex shape.
   * @param type - The collider type to check
   * @returns True if the type is convex
   */
  static isConvex(type: ColliderType): boolean {
    return type !== ColliderType.MESH;
  }

  /**
   * Gets the number of parameters required to define the collider shape.
   * @param type - The collider type
   * @returns Number of parameters required
   */
  static getParameterCount(type: ColliderType): number {
    const parameterCounts: Record<ColliderType, number> = {
      [ColliderType.SPHERE]: 1, // radius
      [ColliderType.BOX]: 3, // width, height, depth
      [ColliderType.CAPSULE]: 2, // radius, height
      [ColliderType.CYLINDER]: 2, // radius, height
      [ColliderType.CONE]: 2, // radius, height
      [ColliderType.MESH]: 0 // parameters vary by mesh
    };
    return parameterCounts[type] ?? 0;
  }
}
