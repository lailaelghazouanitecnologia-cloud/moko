import { Emulator, EmulatorOptions } from './emulator';
import { DISPLAY_WIDTH, DISPLAY_HEIGHT } from './display';

const PIXEL_SIZE = 10;
const TICKS_PER_FRAME = 9;

export class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private emulator: Emulator;
  private running = false;
  private lastTime = 0;
  private romInput: HTMLInputElement;
  private resetButton: HTMLButtonElement;
  private pauseButton: HTMLButtonElement;
  private stepButton: HTMLButtonElement;
  private speedSelect: HTMLSelectElement;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) throw new Error(`Canvas #${canvasId} not found`);
    this.canvas = canvas;
    this.canvas.width = DISPLAY_WIDTH * PIXEL_SIZE;
    this.canvas.height = DISPLAY_HEIGHT * PIXEL_SIZE;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.romInput = document.getElementById('rom-input') as HTMLInputElement;
    this.resetButton = document.getElementById('reset-btn') as HTMLButtonElement;
    this.pauseButton = document.getElementById('pause-btn') as HTMLButtonElement;
    this.stepButton = document.getElementById('step-btn') as HTMLButtonElement;
    this.speedSelect = document.getElementById('speed-select') as HTMLSelectElement;

    const options: EmulatorOptions = {};
    this.emulator = new Emulator(options);

    this.setupUI();
    this.setupKeyboard();
    this.renderLoop();
  }

  private setupUI(): void {
    this.romInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          const buffer = reader.result as ArrayBuffer;
          this.emulator.loadROM(buffer);
          this.emulator.reset();
          this.running = true;
          this.updateButtons();
        };
        reader.readAsArrayBuffer(file);
      }
    });

    this.resetButton.addEventListener('click', () => {
      this.emulator.reset();
      this.running = false;
      this.updateButtons();
    });

    this.pauseButton.addEventListener('click', () => {
      if (this.emulator.isRunning()) {
        this.emulator.pause();
      } else {
        this.emulator.run();
      }
      this.updateButtons();
    });

    this.stepButton.addEventListener('click', () => {
      this.emulator.step();
      this.drawDisplay();
    });

    this.speedSelect.addEventListener('change', () => {
      // Speed handled in renderLoop via TICKS_PER_FRAME
    });
  }

  private setupKeyboard(): void {
    const keyMap: Record<string, number> = {
      '1': 0x1, '2': 0x2, '3': 0x3, '4': 0xC,
      'q': 0x4, 'w': 0x5, 'e': 0x6, 'r': 0xD,
      'a': 0x7, 's': 0x8, 'd': 0x9, 'f': 0xE,
      'z': 0xA, 'x': 0x0, 'c': 0xB, 'v': 0xF
    };

    window.addEventListener('keydown', (e) => {
      const key = keyMap[e.key.toLowerCase()];
      if (key !== undefined) {
        e.preventDefault();
        this.emulator.keyPressed(key);
      }
    });
  }

  private updateButtons(): void {
    const running = this.emulator.isRunning();
    this.pauseButton.textContent = running ? 'Pause' : 'Run';
    this.stepButton.disabled = running;
  }

  private drawDisplay(): void {
    const buffer = this.emulator.getDisplayBuffer();
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#0f0';
    for (let y = 0; y < DISPLAY_HEIGHT; y++) {
      for (let x = 0; x < DISPLAY_WIDTH; x++) {
        const idx = y * DISPLAY_WIDTH + x;
        if (buffer[idx]) {
          this.ctx.fillRect(
            x * PIXEL_SIZE,
            y * PIXEL_SIZE,
            PIXEL_SIZE,
            PIXEL_SIZE
          );
        }
      }
    }
  }

  private renderLoop = (timestamp: number): void => {
    const delta = timestamp - this.lastTime;
    this.lastTime = timestamp;

    if (this.emulator.isRunning()) {
      const speed = parseInt(this.speedSelect.value, 10);
      const ticks = Math.max(1, Math.floor(TICKS_PER_FRAME * speed));
      for (let i = 0; i < ticks; i++) {
        this.emulator.step();
      }
      this.drawDisplay();
    }

    requestAnimationFrame(this.renderLoop);
  };
}
