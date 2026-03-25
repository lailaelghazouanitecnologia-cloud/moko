/**
 * Manages user input events for keyboard and mouse interactions on a canvas element.
 */
export class InputHandler {
  private readonly keyStates: Map<string, boolean> = new Map();
  private mousePos: { readonly x: number; readonly y: number } = { x: 0, y: 0 };
  private readonly listeners: Map<string, Set<(down: boolean) => void>> = new Map();
  private canvas: HTMLCanvasElement | null = null;
  private readonly moveCallbacks: Set<(pos: { x: number; y: number }) => void> = new Set();

  /**
   * Attaches the input handler to the specified canvas element.
   * @param canvas - The canvas element to bind input events to.
   * @throws {TypeError} If canvas is not an instance of HTMLCanvasElement.
   */
  attach(canvas: HTMLCanvasElement): void {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError('Expected canvas to be an instance of HTMLCanvasElement');
    }
    this.detach();
    this.canvas = canvas;
    canvas.addEventListener('keydown', this.handleKeyDown);
    canvas.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.tabIndex = 1;
    canvas.focus();
  }

  /**
   * Detaches the input handler from the current canvas and removes all event listeners.
   */
  detach(): void {
    if (!this.canvas) return;
    this.canvas.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas = null;
  }

  /**
   * Checks if a specific key is currently pressed.
   * @param key - The key to check.
   * @returns `true` if the key is pressed, `false` otherwise.
   * @throws {TypeError} If key is not a string.
   */
  isPressed(key: string): boolean {
    if (typeof key !== 'string') {
      throw new TypeError('Expected key to be a string');
    }
    return this.keyStates.get(key) ?? false;
  }

  /**
   * Registers a callback to be invoked when the specified key is pressed or released.
   * @param key - The key to listen to.
   * @param cb - The callback function receiving the key state (`true` for pressed, `false` for released).
   * @throws {TypeError} If key is not a string or cb is not a function.
   */
  onKey(key: string, cb: (down: boolean) => void): void {
    if (typeof key !== 'string') {
      throw new TypeError('Expected key to be a string');
    }
    if (typeof cb !== 'function') {
      throw new TypeError('Expected cb to be a function');
    }
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(cb);
  }

  /**
   * Registers a callback to be invoked on mouse movement over the canvas.
   * @param cb - The callback function receiving the mouse position relative to the canvas.
   * @throws {TypeError} If cb is not a function.
   */
  onMove(cb: (pos: { x: number; y: number }) => void): void {
    if (typeof cb !== 'function') {
      throw new TypeError('Expected cb to be a function');
    }
    this.moveCallbacks.add(cb);
  }

  /**
   * Updates the input state. Since events are handled asynchronously, this is a no-op for compatibility.
   */
  update(): void {
    // polling handled by events; no-op for compatibility
  }

  private readonly handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key;
    this.keyStates.set(key, true);
    this.notifyKeyListeners(key, true);
  };

  private readonly handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key;
    this.keyStates.set(key, false);
    this.notifyKeyListeners(key, false);
  };

  private readonly handleMouseMove = (e: MouseEvent) => {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    this.notifyMoveListeners();
  };

  private notifyKeyListeners(key: string, down: boolean): void {
    const cbs = this.listeners.get(key);
    if (!cbs) return;
    cbs.forEach(cb => cb(down));
  }

  private notifyMoveListeners(): void {
    this.moveCallbacks.forEach(cb => cb(this.mousePos));
  }
}
