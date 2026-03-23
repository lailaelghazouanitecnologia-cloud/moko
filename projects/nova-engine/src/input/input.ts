export class Input {
  private keys: Set<string> = new Set();
  private prevMouseX = 0;
  private prevMouseY = 0;
  private mouseDx = 0;
  private mouseDy = 0;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.hookKeyboard();
    this.hookMouse();
  }

  private hookKeyboard() {
    window.addEventListener('keydown', e => this.keys.add(e.code));
    window.addEventListener('keyup', e => this.keys.delete(e.code));
  }

  private hookMouse() {
    this.canvas.addEventListener('mousemove', e => {
      const x = e.clientX;
      const y = e.clientY;
      this.mouseDx = x - this.prevMouseX;
      this.mouseDy = y - this.prevMouseY;
      this.prevMouseX = x;
      this.prevMouseY = y;
    });
    this.canvas.addEventListener('mouseenter', e => {
      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    });
  }

  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  getMouseDelta(out?: { x: number; y: number }): { x: number; y: number } {
    const res = out || { x: 0, y: 0 };
    res.x = this.mouseDx;
    res.y = this.mouseDy;
    this.mouseDx = 0;
    this.mouseDy = 0;
    return res;
  }
}
