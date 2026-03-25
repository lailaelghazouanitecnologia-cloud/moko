/**
 * Manages keyboard and mouse game input with pointer lock support.
 */
export class InputHandler {
  private readonly keyStates: Map<string, boolean>;
  private mousePos: { x: number; y: number };
  private isLocked: boolean;
  private lastMousePos: { x: number; y: number };
  private canvas: HTMLCanvasElement | null;

  constructor() {
    this.keyStates = new Map<string, boolean>();
    this.mousePos = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.isLocked = false;
    this.canvas = null;
  }

  /**
   * Attach event listeners to the provided canvas element.
   * @param canvas - The canvas element to bind input events to.
   * @throws {TypeError} If canvas is not an HTMLCanvasElement.
   */
  init(canvas: HTMLCanvasElement): void {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError('Expected canvas to be an HTMLCanvasElement');
    }

    this.canvas = canvas;

    const handleKeyDown = (event: KeyboardEvent) => {
      this.keyStates.set(event.code, true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      this.keyStates.set(event.code, false);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (this.isLocked && document.pointerLockElement === canvas) {
        this.mousePos.x += event.movementX;
        this.mousePos.y += event.movementY;
      } else {
        const rect = canvas.getBoundingClientRect();
        this.mousePos.x = event.clientX - rect.left;
        this.mousePos.y = event.clientY - rect.top;
      }
    };

    const handlePointerLockChange = () => {
      if (document.pointerLockElement !== canvas) {
        this.isLocked = false;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    (canvas as unknown as { _inputHandlerListeners: Record<string, unknown> })._inputHandlerListeners = {
      keydown: handleKeyDown,
      keyup: handleKeyUp,
      mousemove: handleMouseMove,
      pointerlockchange: handlePointerLockChange
    };
  }

  /**
   * Poll input states and update internal tracking.
   */
  update(): void {
    this.lastMousePos = { ...this.mousePos };
  }

  /**
   * Check if a key is currently pressed.
   * @param key - The key code to check.
   * @returns True if the key is pressed, false otherwise.
   * @throws {TypeError} If key is not a string.
   */
  isKeyDown(key: string): boolean {
    if (typeof key !== 'string') {
      throw new TypeError('Expected key to be a string');
    }
    return this.keyStates.get(key) ?? false;
  }

  /**
   * Check if a key is currently released.
   * @param key - The key code to check.
   * @returns True if the key is released, false otherwise.
   * @throws {TypeError} If key is not a string.
   */
  isKeyUp(key: string): boolean {
    return !this.isKeyDown(key);
  }

  /**
   * Get the mouse movement delta since the last update.
   * @returns An object with dx and dy properties representing the change in mouse position.
   */
  getMouseDelta(): { dx: number; dy: number } {
    return {
      dx: this.mousePos.x - this.lastMousePos.x,
      dy: this.mousePos.y - this.lastMousePos.y
    };
  }

  /**
   * Lock the pointer to the canvas for first-person style controls.
   * @throws {Error} If canvas is not initialized.
   */
  lockPointer(): void {
    if (!this.canvas) {
      throw new Error('Canvas not initialized. Call init() first.');
    }
    if (!this.isLocked) {
      this.canvas.requestPointerLock();
      this.isLocked = true;
    }
  }

  /**
   * Unlock the pointer from the canvas.
   */
  unlockPointer(): void {
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
      this.isLocked = false;
    }
  }

  /**
   * Remove all event listeners and clean up resources.
   */
  dispose(): void {
    if (this.canvas) {
      const canvas = this.canvas as unknown as { _inputHandlerListeners?: Record<string, unknown> };
      if (canvas._inputHandlerListeners) {
        const listeners = canvas._inputHandlerListeners;

        document.removeEventListener('keydown', listeners.keydown as EventListener);
        document.removeEventListener('keyup', listeners.keyup as EventListener);
        this.canvas.removeEventListener('mousemove', listeners.mousemove as EventListener);
        document.removeEventListener('pointerlockchange', listeners.pointerlockchange as EventListener);

        delete canvas._inputHandlerListeners;
      }
    }

    this.keyStates.clear();
    this.canvas = null;
  }
}
