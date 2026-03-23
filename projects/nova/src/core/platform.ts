export class Platform {
  static isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  static isNode(): boolean {
    return typeof process !== 'undefined' && process.versions?.node !== undefined;
  }

  static isWorker(): boolean {
    return typeof importScripts === 'function';
  }

  static userAgent(): string {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      return navigator.userAgent;
    }
    return '';
  }

  static language(): string {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language;
    }
    return 'en';
  }

  static languages(): string[] {
    if (typeof navigator !== 'undefined' && navigator.languages && Array.isArray(navigator.languages)) {
      return Array.from(navigator.languages);
    }
    return ['en'];
  }

  static touch(): boolean {
    if (typeof window !== 'undefined' && 'ontouchstart' in window) {
      return true;
    }
    return false;
  }

  static webgl(): boolean {
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return gl !== null;
      } catch {
        return false;
      }
    }
    return false;
  }

  static webgpu(): boolean {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      return true;
    }
    return false;
  }

  static webWorkers(): boolean {
    return typeof Worker !== 'undefined';
  }

  static offscreenCanvas(): boolean {
    return typeof OffscreenCanvas !== 'undefined';
  }

  static screen(): { width: number; height: number } {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight
      };
    }
    return { width: 0, height: 0 };
  }

  static pixelRatio(): number {
    if (typeof window !== 'undefined' && window.devicePixelRatio) {
      return window.devicePixelRatio;
    }
    return 1;
  }

  static now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  static raf(cb: FrameRequestCallback): number {
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      return window.requestAnimationFrame(cb);
    }
    return setTimeout(() => cb(Date.now()), 16) as unknown as number;
  }

  static caf(id: number): void {
    if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
      window.cancelAnimationFrame(id);
    } else {
      clearTimeout(id);
    }
  }
}
