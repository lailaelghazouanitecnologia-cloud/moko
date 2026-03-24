import { InputDevice } from './input-mapping';
import { TouchData } from './touch-data';

/**
 * Touch input device that handles touch events from the browser.
 * Manages touch points and provides gesture recognition capabilities.
 */
export class Touch implements InputDevice {
  private touches: Map<number, TouchData> = new Map<number, TouchData>();
  private gestures: any | null = null;
  private touchStartCallbacks: ((touch: TouchData) => void)[] = [];
  private touchMoveCallbacks: ((touch: TouchData) => void)[] = [];
  private touchEndCallbacks: ((touch: TouchData) => void)[] = [];
  private isDisposed: boolean = false;
  private boundTouchStart: ((event: TouchEvent) => void) | null = null;
  private boundTouchMove: ((event: TouchEvent) => void) | null = null;
  private boundTouchEnd: ((event: TouchEvent) => void) | null = null;

  constructor() {
    this.setupEventListeners();
  }

  /**
   * Connects the touch device and initializes gesture recognition
   * @throws {Error} If the device has been disposed
   */
  public connect(): void {
    this.validateNotDisposed();
    if (!this.gestures) {
      this.gestures = new (class {
        onTouchStart(touch: TouchData): void {}
        onTouchMove(touch: TouchData): void {}
        onTouchEnd(touch: TouchData): void {}
        dispose(): void {}
      })();
    }
  }

  /**
   * Disconnects the touch device and cleans up resources
   * @throws {Error} If the device has been disposed
   */
  public disconnect(): void {
    this.validateNotDisposed();
    this.cleanupEventListeners();
    this.touches.clear();
    this.touchStartCallbacks = [];
    this.touchMoveCallbacks = [];
    this.touchEndCallbacks = [];
    if (this.gestures) {
      this.gestures.dispose();
      this.gestures = null;
    }
    this.isDisposed = true;
  }

  /**
   * Checks if the device is connected
   * @returns {boolean} True if connected, false if disposed
   */
  public isConnected(): boolean {
    return !this.isDisposed;
  }

  /**
   * Gets the device identifier
   * @returns {string} The device ID
   */
  public getId(): string {
    return 'touch-device';
  }

  /**
   * Gets all active touch points
   * @returns {TouchData[]} Array of current touch points
   * @throws {Error} If the device has been disposed
   */
  public getTouches(): TouchData[] {
    this.validateNotDisposed();
    return Array.from(this.touches.values());
  }

  /**
   * Registers a callback for touch start events
   * @param callback - Function to call when touch starts
   * @throws {Error} If the device has been disposed or callback is invalid
   */
  public onTouchStart(callback: (touch: TouchData) => void): void {
    this.validateNotDisposed();
    this.validateCallback(callback);
    this.touchStartCallbacks.push(callback);
  }

  /**
   * Registers a callback for touch move events
   * @param callback - Function to call when touch moves
   * @throws {Error} If the device has been disposed or callback is invalid
   */
  public onTouchMove(callback: (touch: TouchData) => void): void {
    this.validateNotDisposed();
    this.validateCallback(callback);
    this.touchMoveCallbacks.push(callback);
  }

  /**
   * Registers a callback for touch end events
   * @param callback - Function to call when touch ends
   * @throws {Error} If the device has been disposed or callback is invalid
   */
  public onTouchEnd(callback: (touch: TouchData) => void): void {
    this.validateNotDisposed();
    this.validateCallback(callback);
    this.touchEndCallbacks.push(callback);
  }

  /**
   * Gets a specific touch by its identifier
   * @param id - The touch identifier
   * @returns {TouchData | null} The touch data or null if not found
   * @throws {Error} If the device has been disposed
   */
  public getTouchById(id: number): TouchData | null {
    this.validateNotDisposed();
    this.validateTouchId(id);
    return this.touches.get(id) || null;
  }

  /**
   * Gets the gesture recognizer instance
   * @returns {any | null} The gesture recognizer or null if not initialized
   */
  public getGestures(): any | null {
    return this.gestures;
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.boundTouchStart = this.onTouchStartEvent.bind(this);
    this.boundTouchMove = this.onTouchMoveEvent.bind(this);
    this.boundTouchEnd = this.onTouchEndEvent.bind(this);

    window.addEventListener('touchstart', this.boundTouchStart, { passive: false });
    window.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    window.addEventListener('touchend', this.boundTouchEnd, { passive: false });
    window.addEventListener('touchcancel', this.boundTouchEnd, { passive: false });
  }

  private cleanupEventListeners(): void {
    if (typeof window === 'undefined' || !this.boundTouchStart || !this.boundTouchMove || !this.boundTouchEnd) {
      return;
    }

    window.removeEventListener('touchstart', this.boundTouchStart);
    window.removeEventListener('touchmove', this.boundTouchMove);
    window.removeEventListener('touchend', this.boundTouchEnd);
    window.removeEventListener('touchcancel', this.boundTouchEnd);

    this.boundTouchStart = null;
    this.boundTouchMove = null;
    this.boundTouchEnd = null;
  }

  private onTouchStartEvent(event: TouchEvent): void {
    if (this.isDisposed) {
      return;
    }

    event.preventDefault();
    
    if (!event.changedTouches || event.changedTouches.length === 0) {
      return;
    }

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (!touch) continue;

      const touchData: TouchData = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        force: touch.force || 0
      };

      this.touches.set(touch.identifier, touchData);
      this.notifyTouchStartCallbacks(touchData);
      
      if (this.gestures) {
        this.gestures.onTouchStart(touchData);
      }
    }
  }

  private onTouchMoveEvent(event: TouchEvent): void {
    if (this.isDisposed) {
      return;
    }

    event.preventDefault();
    
    if (!event.changedTouches || event.changedTouches.length === 0) {
      return;
    }

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (!touch) continue;

      const existingTouch = this.touches.get(touch.identifier);
      if (!existingTouch) {
        continue;
      }

      const touchData: TouchData = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        force: touch.force || 0
      };

      this.touches.set(touch.identifier, touchData);
      this.notifyTouchMoveCallbacks(touchData);
      
      if (this.gestures) {
        this.gestures.onTouchMove(touchData);
      }
    }
  }

  private onTouchEndEvent(event: TouchEvent): void {
    if (this.isDisposed) {
      return;
    }

    event.preventDefault();
    
    if (!event.changedTouches || event.changedTouches.length === 0) {
      return;
    }

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (!touch) continue;

      const touchData: TouchData = {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        force: touch.force || 0
      };

      this.touches.delete(touch.identifier);
      this.notifyTouchEndCallbacks(touchData);
      
      if (this.gestures) {
        this.gestures.onTouchEnd(touchData);
      }
    }
  }

  private notifyTouchStartCallbacks(touch: TouchData): void {
    this.touchStartCallbacks.forEach(callback => {
      try {
        callback(touch);
      } catch (error) {
        console.error('Error in touch start callback:', error);
      }
    });
  }

  private notifyTouchMoveCallbacks(touch: TouchData): void {
    this.touchMoveCallbacks.forEach(callback => {
      try {
        callback(touch);
      } catch (error) {
        console.error('Error in touch move callback:', error);
      }
    });
  }

  private notifyTouchEndCallbacks(touch: TouchData): void {
    this.touchEndCallbacks.forEach(callback => {
      try {
        callback(touch);
      } catch (error) {
        console.error('Error in touch end callback:', error);
      }
    });
  }

  private validateNotDisposed(): void {
    if (this.isDisposed) {
      throw new Error('Touch device has been disposed');
    }
  }

  private validateCallback(callback: Function): void {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
  }

  private validateTouchId(id: number): void {
    if (typeof id !== 'number' || isNaN(id) || id < 0) {
      throw new Error('Touch ID must be a non-negative number');
    }
  }
}
