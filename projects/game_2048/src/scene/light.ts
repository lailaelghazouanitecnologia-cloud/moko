import { Vec3 } from '../math/vec3';
import { Texture } from '../graphics/texture';

/**
 * Light source for rendering.
 */
export class Light {
  type: string;
  color: Vec3;
  intensity: number;
  range: number;
  spotAngle: number;
  castShadows: boolean;
  shadowMap: Texture | null;

  constructor() {
    this.type = 'directional';
    this.color = new Vec3(1, 1, 1);
    this.intensity = 1.0;
    this.range = 10.0;
    this.spotAngle = 30.0;
    this.castShadows = false;
    this.shadowMap = null;
  }

  /**
   * Sets RGB color.
   * @param r - Red component (0-1)
   * @param g - Green component (0-1)
   * @param b - Blue component (0-1)
   */
  setColor(r: number, g: number, b: number): void {
    this.validateColorComponent(r, 'r');
    this.validateColorComponent(g, 'g');
    this.validateColorComponent(b, 'b');
    this.color.set(r, g, b);
  }

  /**
   * Adjusts brightness.
   * @param value - Intensity value (must be non-negative)
   */
  setIntensity(value: number): void {
    this.validateNonNegative(value, 'intensity');
    this.intensity = value;
  }

  /**
   * Sets falloff radius.
   * @param value - Range value (must be positive)
   */
  setRange(value: number): void {
    this.validatePositive(value, 'range');
    this.range = value;
  }

  /**
   * Toggles shadow casting.
   * @param enable - Whether to enable shadows
   */
  enableShadows(enable: boolean): void {
    this.castShadows = enable;
  }

  /**
   * Check directional type.
   * @returns True if light is directional
   */
  isDirectional(): boolean {
    return this.type === 'directional';
  }

  /**
   * Check spot type.
   * @returns True if light is spot
   */
  isDirectional(): boolean {
    return this.type === 'spot';
  }

  /**
   * Check point type.
   * @returns True if light is point
   */
  isPoint(): boolean {
    return this.type === 'point';
  }

  /**
   * Sets the light type.
   * @param type - Light type ('directional', 'spot', 'point')
   */
  setType(type: 'directional' | 'spot' | 'point'): void {
    this.validateLightType(type);
    this.type = type;
  }

  /**
   * Sets the spot angle for spot lights.
   * @param angle - Spot angle in degrees (must be positive)
   */
  setSpotAngle(angle: number): void {
    this.validatePositive(angle, 'spotAngle');
    this.spotAngle = angle;
  }

  /**
   * Sets the shadow map texture.
   * @param texture - Shadow map texture or null
   */
  setShadowMap(texture: Texture | null): void {
    this.shadowMap = texture;
  }

  /**
   * Gets the light type.
   * @returns Light type
   */
  getType(): string {
    return this.type;
  }

  /**
   * Gets the color.
   * @returns Copy of the color vector
   */
  getColor(): Vec3 {
    return this.color.clone();
  }

  /**
   * Gets the intensity.
   * @returns Intensity value
   */
  getIntensity(): number {
    return this.intensity;
  }

  /**
   * Gets the range.
   * @returns Range value
   */
  getRange(): number {
    return this.range;
  }

  /**
   * Gets the spot angle.
   * @returns Spot angle in degrees
   */
  getSpotAngle(): number {
    return this.spotAngle;
  }

  /**
   * Checks if shadows are enabled.
   * @returns True if shadows are enabled
   */
  isCastingShadows(): boolean {
    return this.castShadows;
  }

  /**
   * Gets the shadow map texture.
   * @returns Shadow map texture or null
   */
  getShadowMap(): Texture | null {
    return this.shadowMap;
 }

  /**
   * Creates a copy of this light.
   * @returns New Light instance with same properties
   */
  clone(): Light {
    const light = new Light();
    light.type = this.type;
    light.color = this.color.clone();
    light.intensity = this.intensity;
    light.range = this.range;
    light.spotAngle = this.spotAngle;
    light.castShadows = this.castShadows;
    light.shadowMap = this.shadowMap;
    return light;
  }

  /**
   * Validates a color component value.
   * @param value - Value to validate
   * @param name - Name of the component for error messages
   * @throws Error if value is not between 0 and 1
   */
  private validateColorComponent(value: number, name: string): void {
    if (typeof value !== 'number' || isNaN(value) || value < 0 || value > 1) {
      throw new Error(`Invalid color component '${name}': must be a number between 0 and 1`);
    }
  }

  /**
   * Validates that a value is non-negative.
   * @param value - Value to validate
   * @param name - Name of the value for error messages
   * @throws Error if value is negative
   */
  private validateNonNegative(value: number, name: string): void {
    if (typeof value !== 'number' || isNaN(value) || value < 0) {
      throw new Error(`Invalid ${name}: must be a non-negative number`);
    }
  }

  /**
   * Validates that a value is positive.
   * @param value - Value to validate
   * @name Name of the value for error messages
   * @throws Error if value is not positive
   */
  private validatePositive(value: number, name: string): void {
    if (typeof value !== 'number' || isNaN(value) || value <= 0) {
      throw new Error(`Invalid ${name}: must be a positive number`);
    }
  }

  /**
   * Validates the light type.
   * @param type - Type to validate
   * @throws Error if type is not valid
   */
  private validateLightType(type: string): void {
    const validTypes = ['directional', 'spot', 'point'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid light type '${type}': must be one of ${validTypes.join(', ')}`);
    }
  }
}
