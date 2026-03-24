export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Platform detection and capabilities.
 *
 * @public
 */
export class Platform {
  private name: string;
  private version: string;

  /**
   * Creates a new Platform instance.
   *
   * @param name - Platform name (e.g. 'chrome', 'node', 'firefox')
   * @param version - Platform version in semantic format
   * @throws {ValidationError} if name or version are invalid
   */
  constructor(name: string, version: string) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new ValidationError('Platform name must be a non-empty string');
    }
    if (typeof version !== 'string' || !this.isValidVersion(version)) {
      throw new ValidationError('Platform version must be a valid semantic version string');
    }
    this.name = name.trim();
    this.version = version.trim();
  }

  /**
   * Validate semantic version string (major.minor.patch or major.minor).
   *
   * @private
   */
  private isValidVersion(version: string): boolean {
    return /^\d+\.\d+(\.\d+)?$/.test(version);
  }

  /**
   * Check if running inside a browser environment.
   *
   * @returns true if browser
   * @public
   */
  isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
  }

  /**
   * Check if running in Node.js.
   *
   * @returns true if Node.js
   * @public
   */
  isNode(): boolean {
    return typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.versions != null && (globalThis as any).process.versions.node != null;
  }

  /**
   * Check if running in a Web Worker.
   *
   * @returns true if worker
   * @public
   */
  isWorker(): boolean {
    return typeof self !== 'undefined' && typeof (self as any).importScripts === 'function' && !this.isBrowser();
  }

  /**
   * Check if WebAssembly is supported.
   *
   * @returns true if WebAssembly is available
   * @public
   */
  supportsWebAssembly(): boolean {
    return typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
  }

  /**
   * Check if WebGL is supported.
   *
   * @returns true if WebGL is available
   * @public
   */
  supportsWebGL(): boolean {
    if (!this.isBrowser()) {
      return false;
    }
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get the user's language code.
   *
   * @returns language code (e.g. 'en', 'es')
   * @public
   */
  getLanguage(): string {
    if (this.isBrowser()) {
      return (navigator.language || 'en').split('-')[0];
    }
    if (this.isNode()) {
      const env = (globalThis as any).process.env.LANG || (globalThis as any).process.env.LANGUAGE || 'en';
      return env.split('_')[0].split('.')[0];
    }
    return 'en';
  }

  /**
   * Detect the current platform.
   *
   * @returns Platform instance
   * @public
   * @static
   */
  static detect(): Platform {
    let name = 'unknown';
    let version = '0.0.0';

    if (typeof window !== 'undefined' && window.navigator) {
      const ua = window.navigator.userAgent;
      if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) {
        name = 'chrome';
        const match = ua.match(/Chrome\/([0-9]+\.[0-9]+\.[0-9]+)/);
        if (match) version = match[1];
      } else if (ua.indexOf('Firefox') !== -1 && ua.indexOf('Seamonkey') === -1) {
        name = 'firefox';
        const match = ua.match(/Firefox\/([0-9]+\.[0-9]+)/);
        if (match) version = match[1];
      } else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1 && ua.indexOf('Chromium') === -1) {
        name = 'safari';
        const match = ua.match(/Version\/([0-9]+\.[0-9]+)/);
        if (match) version = match[1];
      } else if (ua.indexOf('Edg') !== -1 || ua.indexOf('Edge') !== -1) {
        name = 'edge';
        const match = ua.match(/(?:Edge|Edg)\/([0-9]+\.[0-9]+\.[0-9]+)/);
        if (match) version = match[1];
      } else {
        name = 'browser';
      }
    } else if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.versions) {
      if ((globalThis as any).process.versions.node) {
        name = 'node';
        version = (globalThis as any).process.versions.node;
      }
    }

    return new Platform(name, version);
  }

  /**
   * Get the current platform.
   *
   * @returns Platform instance
   * @public
   * @static
   */
  static current(): Platform {
    return Platform.detect();
  }

  /**
   * Get platform name.
   *
   * @returns platform name
   * @public
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get platform version.
   *
   * @returns version string
   * @public
   */
  getVersion(): string {
    return this.version;
  }

  /**
   * Convert to formatted string.
   *
   * @returns formatted string
   * = @public
   */
  toString(): string {
    return `${this.name} ${this.version}`;
  }

  /**
   * Check if this platform equals another.
   *
   * @param other - Platform to compare
   * @returns true if equal
   * @public
   */
  equals(other: Platform): boolean {
    if (!(other instanceof Platform)) return false;
    return this.name === other.name && this.version === other.version;
  }

  /**
   * Serialize to JSON.
   *
   * @returns JSON representation
   * @public
   */
  toJSON(): { name: string; version: string } {
    return { name: this.name, version: this.version };
  }
}
