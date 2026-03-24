import { Color } from '../math/color';
import { Vec3 } from '../math/vec3';
import { Component } from './component';
import { Entity } from './entity';

export enum LightType {
  DIRECTIONAL = 'directional',
  POINT = 'point',
  SPOT = 'spot'
}

/**
 * Represents a light source in the scene.
 * Supports directional, point, and spot lights with shadow casting capabilities.
 */
export class Light extends Component {
  private _type: LightType = LightType.DIRECTIONAL;
  private _color: Color = new Color(1, 1, 1, 1);
  private _intensity: number = 1.0;
  private _range: number = 10.0;
  private _innerConeAngle: number = 30.0;
  private _outerConeAngle: number = 45.0;
  private _castShadows: boolean = false;
  private _shadowBias: number = 0.05;
  private _shadowResolution: number = 1024;
  private _enabled: boolean = true;

  constructor(entity: Entity) {
    super(entity);
  }

  /**
   * Gets the type of light.
   */
  get type(): LightType {
    return this._type;
  }

  /**
   * Sets the type of light.
   * @param value - The light type
   * @throws {Error} If value is not a valid LightType
   */
  set type(value: LightType) {
    if (!Object.values(LightType).includes(value)) {
      throw new Error(`Invalid light type: ${value}`);
    }
    this._type = value;
  }

  /**
   * Gets the color of the light.
   */
  get color(): Color {
    return this._color;
  }

  /**
   * Sets the color of the light.
   * @param value - The color to copy
   * @throws {Error} If value is null or undefined
   */
  set color(value: Color) {
    if (!value) {
      throw new Error('Color cannot be null or undefined');
    }
    this._color.copy(value);
  }

  /**
   * Gets the intensity of the light.
   */
  get intensity(): number {
    return this._intensity;
  }

  /**
   * Sets the intensity of the light.
   * @param value - The intensity value (must be >= 0)
   * @throws {Error} If value is negative
   */
  set intensity(value: number) {
    if (value < 0) {
      throw new Error('Intensity must be non-negative');
    }
    this._intensity = value;
  }

  /**
   * Gets the range of the light (for point and spot lights).
   */
  get range(): number {
    return this._range;
  }

  /**
   * Sets the range of the light.
   * @param value - The range value (must be > 0)
   * @throws {Error} If value is not positive
   */
  set range(value: number) {
    if (value <= 0) {
      throw new Error('Range must be positive');
    }
    this._range = value;
  }

  /**
   * Gets the inner cone angle in degrees (for spot lights).
   */
  get innerConeAngle(): number {
    return this._innerConeAngle;
  }

  /**
   * Sets the inner cone angle in degrees.
   * @param value - The angle in degrees (must be between 0 and 90)
   * @throws {Error} If value is out of valid range
   */
  set innerConeAngle(value: number) {
    if (value < 0 || value > 90) {
      throw new Error('Inner cone angle must be between 0 and 90 degrees');
    }
    if (value > this._outerConeAngle) {
      throw new Error('Inner cone angle cannot exceed outer cone angle');
    }
    this._innerConeAngle = value;
  }

  /**
   * Gets the outer cone angle in degrees (for spot lights).
   */
  get outerConeAngle(): number {
    return this._outerConeAngle;
  }

  /**
   * Sets the outer cone angle in degrees.
   * @param value - The angle in degrees (must be between 0 and 90)
   * @throws {Error} If value is out of valid range
   */
  set outerConeAngle(value: number) {
    if (value < 0 || value > 90) {
      throw new Error('Outer cone angle must be between 0 and 90 degrees');
    }
    if (value < this._innerConeAngle) {
      throw new Error('Outer cone angle must be greater than or equal to inner cone angle');
    }
    this._outerConeAngle = value;
  }

  /**
   * Gets whether the light casts shadows.
   */
  get castShadows(): boolean {
    return this._castShadows;
  }

  /**
   * Sets whether the light casts shadows.
   * @param value - True to enable shadow casting
   */
  set castShadows(value: boolean) {
    this._castShadows = value;
  }

  /**
   * Gets the shadow bias value.
   */
  get shadowBias(): number {
    return this._shadowBias;
  }

  /**
   * Sets the shadow bias value.
   * @param value - The bias value
   * @throws {Error} If value is negative
   */
  set shadowBias(value: number) {
    if (value < 0) {
      throw new Error('Shadow bias must be non-negative');
    }
    this._shadowBias = value;
  }

  /**
   * Gets the shadow map resolution.
   */
  get shadowResolution(): number {
    return this._shadowResolution;
  }

  /**
   * Sets the shadow map resolution.
   * @param value - The resolution (must be power of 2 and between 64 and 4096)
   * @throws {Error} If value is invalid
   */
  set shadowResolution(value: number) {
    if (!this._isPowerOfTwo(value)) {
      throw new Error('Shadow resolution must be a power of 2');
    }
    if (value < 64 || value > 4096) {
      throw new Error('Shadow resolution must be between 64 and 4096');
    }
    this._shadowResolution = value;
  }

  /**
   * Gets whether the light is enabled.
   */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Sets whether the light is enabled.
   * @param value - True to enable the light
   */
  set enabled(value: boolean) {
    this._enabled = value;
  }

  /**
   * Gets the direction vector of the light (for directional and spot lights).
   * @returns The normalized direction vector
   */
  getDirection(): Vec3 {
    const rotation = this.entity.getRotation();
    const forward = new Vec3(0, 0, -1);
    return rotation.transformVector(forward).normalize();
  }

  /**
   * Gets the world position of the light.
   * @returns The position vector
   */
  getPosition(): Vec3 {
    return this.entity.getPosition();
  }

  /**
   * Initializes the light component.
   */
  init(): void {
    try {
      this._validateInitialState();
      // Light initialization logic
      this._initializeShadowMap();
    } catch (error) {
      console.error('Failed to initialize light:', error);
      throw error;
    }
  }

  /**
   * Updates the light component each frame.
   * @param dt - Delta time in seconds
   */
  update(dt: number): void {
    if (!this._enabled) return;

    try {
      // Per-frame light updates
      this._updateShadows(dt);
    } catch (error) {
      console.error('Error updating light:', error);
    }
  }

  /**
   * Destroys the light component and cleans up resources.
   */
  destroy(): void {
    try {
      // Cleanup light resources
      this._cleanupShadowMap();
      this._color = null as any;
    } catch (error) {
      console.error('Error destroying light:', error);
    }
  }

  /**
   * Creates a copy of this light's properties.
   * @returns A new Light instance with copied properties
   */
  clone(): Light {
    const cloned = new Light(this.entity);
    cloned._type = this._type;
    cloned._color.copy(this._color);
    cloned._intensity = this._intensity;
    cloned._range = this._range;
    cloned._innerConeAngle = this._innerConeAngle;
    cloned._outerConeAngle = this._outerConeAngle;
    cloned._castShadows = this._castShadows;
    cloned._shadowBias = this._shadowBias;
    cloned._shadowResolution = this._shadowResolution;
    cloned._enabled = this._enabled;
    return cloned;
  }

  /**
   * Serializes the light data to a plain object.
   * @returns Plain object representation
   */
  serialize(): any {
    return {
      type: this._type,
      color: this._color.serialize(),
      intensity: this._intensity,
      range: this._range,
      innerConeAngle: this._innerConeAngle,
      outerConeAngle: this._outerConeAngle,
      castShadows: this._castShadows,
      shadowBias: this._shadowBias,
      shadowResolution: this._shadowResolution,
      enabled: this._enabled
    };
  }

  /**
   * Deserializes light data from a plain object.
   * @param data - The data object
   * @throws {Error} If data is invalid
   */
  deserialize(data: any): void {
    if (!data) {
      throw new Error('Cannot deserialize null or undefined data');
    }

    try {
      this.type = data.type || LightType.DIRECTIONAL;
      if (data.color) {
        this._color.deserialize(data.color);
      }
      this.intensity = data.intensity ?? 1.0;
      this.range = data.range ?? 10.0;
      this.innerConeAngle = data.innerConeAngle ?? 30.0;
      this.outerConeAngle = data.outerConeAngle ?? 45.0;
      this.castShadows = data.castShadows ?? false;
      this.shadowBias = data.shadowBias ?? 0.05;
      this.shadowResolution = data.shadowResolution ?? 1024;
      this.enabled = data.enabled ?? true;
    } catch (error) {
      throw new Error(`Failed to deserialize light: ${error}`);
    }
  }

  /**
   * Checks if a number is a power of two.
   * @param value - The number to check
   * @returns True if power of two
   */
  private _isPowerOfTwo(value: number): boolean {
    return (value & (value - 1)) === 0 && value !== 0;
  }

  /**
   * Validates the initial state of the light.
   * @throws {Error} If state is invalid
   */
  private _validateInitialState(): void {
    if (this._intensity < 0) {
      throw new Error('Initial intensity cannot be negative');
    }
    if (this._range <= 0) {
      throw new Error('Initial range must be positive');
    }
    if (this._innerConeAngle < 0 || this._innerConeAngle > 90) {
      throw new Error('Initial inner cone angle out of range');
    }
    if (this._outerConeAngle < 0 || this._outerConeAngle > 90) {
      throw new Error('Initial outer cone angle out of range');
    }
    if (this._innerConeAngle > this._outerConeAngle) {
      throw new Error('Initial inner cone angle cannot exceed outer cone angle');
    }
  }

  /**
   * Initializes the shadow map.
   */
  private _initializeShadowMap(): void {
    if (this._castShadows) {
      // Shadow map initialization logic
    }
  }

  /**
   * Updates shadow-related data.
   * @param dt - Delta time
   */
  private _updateShadows(dt: number): void {
    if (this._castShadows) {
      // Shadow update logic
    }
  }

  /**
   * Cleans up shadow map resources.
   */
  private _cleanupShadowMap(): void {
    if (this._castShadows) {
      // Shadow map cleanup logic
    }
  }
}
