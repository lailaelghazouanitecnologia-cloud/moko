import { Texture } from './texture';

/**
 * Represents a framebuffer object used for off-screen rendering.
 * Contains color and optional depth attachments.
 */
export interface RenderTarget {
  /**
   * The color buffer texture where rendered pixels are stored.
   * Must be a valid Texture instance.
   */
  colorBuffer: Texture;

  /**
   * Optional depth buffer texture for depth testing.
   * If provided, must be a valid Texture instance with a depth format.
   */
  depthBuffer?: Texture;
}

/**
 * Utility class for RenderTarget validation and management.
 */
export class RenderTargetUtil {
  /**
   * Validates that the provided RenderTarget is well-formed.
   * @param target - The RenderTarget to validate.
   * @throws {TypeError} If colorBuffer is missing or invalid.
   * @throws {TypeError} If depthBuffer is provided but invalid.
   */
  static validate(target: RenderTarget): void {
    if (!target) {
      throw new TypeError('RenderTarget is required');
    }
    if (!target.colorBuffer) {
      throw new TypeError('colorBuffer is required');
    }
    if (target.depthBuffer && typeof target.depthBuffer !== 'object') {
      throw new TypeError('depthBuffer must be a valid Texture when provided');
    }
  }

  /**
   * Creates a new RenderTarget with optional depth buffer.
   * @param colorBuffer - The color texture attachment.
   * @param depthBuffer - Optional depth texture attachment.
   * @returns A new RenderTarget instance.
   * @throws {TypeError} If colorBuffer is invalid.
   */
  static create(colorBuffer: Texture, depthBuffer?: Texture): RenderTarget {
    if (!colorBuffer) {
      throw new TypeError('colorBuffer is required');
    }
    const target: RenderTarget = { colorBuffer };
    if (depthBuffer) {
      target.depthBuffer = depthBuffer;
    }
    this.validate(target);
    return target;
  }

  /**
   * Clones a RenderTarget, optionally overriding attachments.
   * @param source - The RenderTarget to clone.
   * @param overrides - Partial properties to override.
   * @returns A new RenderTarget instance.
   * @throws {TypeError} If source is invalid.
   */
  static clone(source: RenderTarget, overrides?: Partial<RenderTarget>): RenderTarget {
    if (!source) {
      throw new TypeError('source RenderTarget is required');
    }
    const cloned: RenderTarget = {
      colorBuffer: overrides?.colorBuffer ?? source.colorBuffer,
      depthBuffer: overrides?.depthBuffer ?? source.depthBuffer,
    };
    this.validate(cloned);
    return cloned;
  }
}
