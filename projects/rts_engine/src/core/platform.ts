/**
 * Platform detection utility that identifies the runtime environment
 * and available capabilities such as WebAssembly, WebWorkers, etc.
 */
export class Platform {
    private isNode: boolean = false;
    private isBrowser: boolean = false;
    private isWebWorker: boolean = false;
    private platformName: string = 'unknown';
    private features: Set<string> = new Set();

    constructor() {
        this.detect();
    }

    /**
     * Detects the current runtime platform and sets internal flags.
     * This method is called automatically on instantiation.
     */
    detect(): void {
        try {
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                this.isNode = true;
                this.platformName = 'node';
            } else if (typeof window !== 'undefined') {
                this.isBrowser = true;
                this.platformName = 'browser';
            } else if (typeof self !== 'undefined' && typeof importScripts === 'function') {
                this.isWebWorker = true;
                this.platformName = 'webworker';
            } else {
                this.platformName = 'unknown';
            }

            this.detectFeatures();
        } catch (error) {
            this.platformName = 'error';
            console.error('Platform detection failed:', error);
        }
    }

    /**
     * Detects available platform features and adds them to the features set.
     * @private
     */
    private detectFeatures(): void {
        try {
            if (this.isBrowser || this.isWebWorker) {
                if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
                    this.features.add('webassembly');
                }
                if (typeof Worker === 'function') {
                    this.features.add('webworkers');
                }
                if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
                    this.features.add('serviceworker');
                }
            }

            // Additional feature detection
            if (this.isNode) {
                if (typeof require !== 'undefined') {
                    this.features.add('commonjs');
                }
                if (typeof module !== 'undefined' && module.exports) {
                    this.features.add('module');
                }
            }

            if (typeof Promise !== 'undefined') {
                this.features.add('promises');
            }
            if (typeof ArrayBuffer !== 'undefined') {
                this.features.add('typedarrays');
            }
            if (typeof Map !== 'undefined' && typeof Set !== 'undefined') {
                this.features.add('es6-collections');
            }
            if (typeof Reflect !== 'undefined') {
                this.features.add('es6-reflect');
            }
        } catch (error) {
            console.warn('Feature detection failed:', error);
        }
    }

    /**
     * Checks if the platform supports a given feature.
     * @param feature - The feature name to check (case-insensitive)
     * @returns true if the feature is supported, false otherwise
     */
    hasFeature(feature: string): boolean {
        if (typeof feature !== 'string') {
            return false;
        }
        return this.features.has(feature.toLowerCase());
    }

    /**
     * Returns the user agent string for the current platform.
     * @returns User agent string or empty string if unavailable
     */
    getUserAgent(): string {
        try {
            if (typeof navigator !== 'undefined' && navigator.userAgent) {
                return navigator.userAgent;
            }
            if (this.isNode && typeof process !== 'undefined') {
                return `Node.js ${process.version}`;
            }
        } catch (error) {
            console.warn('Unable to retrieve user agent:', error);
        }
        return '';
    }

    /**
     * Checks if WebAssembly is supported on this platform.
     * @returns true if WebAssembly is supported, false otherwise
     */
    supportsWebAssembly(): boolean {
        return this.hasFeature('webassembly');
    }

    /**
     * Checks if WebWorkers are supported on this platform.
     * @returns true if WebWorkers are supported, false otherwise
     */
    supportsWebWorkers(): boolean {
        return this.hasFeature('webworkers');
    }

    /**
     * Checks if ServiceWorker is supported on this platform.
     * @returns true if ServiceWorker is supported, false otherwise
     */
    supportsServiceWorker(): boolean {
        return this.hasFeature('serviceworker');
    }

    /**
     * Returns the language/locale code for the current platform.
     * @returns Language code (e.g., 'en', 'en-US') or 'en' as fallback
     */
    getLanguage(): string {
        try {
            if (typeof navigator !== 'undefined') {
                const nav = navigator as any;
                return nav.language || nav.userLanguage || nav.browserLanguage || nav.systemLanguage || 'en';
            }
            if (this.isNode && typeof process !== 'undefined') {
                return process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES || 'en';
            }
        } catch (error) {
            console.warn('Unable to retrieve language:', error);
        }
        return 'en';
    }

    /**
     * Returns the current platform name.
     * @returns 'node', 'browser', 'webworker', or 'unknown'
     */
    getPlatformName(): string {
        return this.platformName;
    }

    /**
     * Checks if the code is running in a Node.js environment.
     * @returns true if running in Node.js, false otherwise
     */
    isNode(): boolean {
        return this.isNode;
    }

    /**
     * Checks if the code is running in a browser environment.
     * @returns true if running in a browser, false otherwise
     */
    isBrowser(): boolean {
        return this.isBrowser;
    }

    /**
     * Checks if the code is running in a WebWorker environment.
     * @returns true if running in a WebWorker, false otherwise
     */
    isWebWorker(): boolean {
        return this.isWebWorker;
    }

    /**
     * Returns an array of all supported features.
     * @returns Array of feature names
     */
    getFeatures(): string[] {
        return Array.from(this.features);
    }

    /**
     * Returns the platform information as a formatted string.
     * @returns Platform information string
     */
    toString(): string {
        return `Platform: ${this.platformName}, Features: [${this.getFeatures().join(', ')}]`;
    }
}
