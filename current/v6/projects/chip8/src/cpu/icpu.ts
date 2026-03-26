export interface ICpu {
  readonly registers: Uint8Array;
  readonly I: number;
  readonly PC: number;
  readonly delayTimer: number;
  readonly soundTimer: number;
  readonly stack: Uint16Array;
  readonly stackPointer: number;

  fetch(): number;
  decode(opcode: number): { X: number; Y: number; N: number; NN: number; NNN: number };
  execute(opcode: number): void;
  execute0NNN(opcode: number): void;
  execute00E0(): void;
  execute00EE(): void;
  execute1NNN(opcode: number): void;
  execute2NNN(opcode: number): void;
  execute3XNN(opcode: number): void;
  execute4XNN(opcode: number): void;
  updateTimers(): void;
}

export interface IMemory {
  read(address: number): number;
  write(address: number, value: number): void;
  readWord(address: number): number;
  writeWord(address: number, value: number): void;
  loadRom(data: Uint8Array): void;
  reset(): void;
}

export interface IDisplay {
  drawSprite(x: number, y: number, spriteData: Uint8Array, height: number): boolean;
  clear(): void;
  getPixel(x: number, y: number): boolean;
  setPixel(x: number, y: number, state: boolean): void;
  refresh(): void;
  getWidth(): number;
  getHeight(): number;
}

export interface IInput {
  isKeyPressed(key: number): boolean;
  waitForKey(): number;
  keyDown(key: number): void;
  keyUp(key: number): void;
  reset(): void;
}

export interface ISound {
  play(): void;
  stop(): void;
  setFrequency(hz: number): void;
  isPlaying(): boolean;
}

export interface ITimer {
  start(): void;
  stop(): void;
  tick(): void;
}

export class Cpu implements ICpu {
  private readonly memory: IMemory;
  private readonly display: IDisplay;
  private readonly input: IInput;
  private readonly sound: ISound;
  private readonly _registers: Uint8Array;
  private _I: number;
  private _PC: number;
  private _delayTimer: number;
  private _soundTimer: number;
  private readonly _stack: Uint16Array;
  private _stackPointer: number;

  constructor(memory: IMemory, display: IDisplay, input: IInput, sound: ISound) {
    this.memory = memory;
    this.display = display;
    this.input = input;
    this.sound = sound;
    this._registers = new Uint8Array(16);
    this._I = 0;
    this._PC = 0x200;
    this._delayTimer = 0;
    this._soundTimer = 0;
    this._stack = new Uint16Array(16);
    this._stackPointer = 0;
  }

  get registers(): Uint8Array {
    return this._registers;
  }

  get I(): number {
    return this._I;
  }

  get PC(): number {
    return this._PC;
  }

  get delayTimer(): number {
    return this._delayTimer;
  }

  get soundTimer(): number {
    return this._soundTimer;
  }

  get stack(): Uint16Array {
    return this._stack;
  }

  get stackPointer(): number {
    return this._stackPointer;
  }

  fetch(): number {
    const word = this.memory.readWord(this._PC);
    this._PC += 2;
    return word;
  }

  decode(opcode: number): { X: number; Y: number; N: number; NN: number; NNN: number } {
    const X = (opcode >> 8) & 0xF;
    const Y = (opcode >> 4) & 0xF;
    const N = opcode & 0xF;
    const NN = opcode & 0xFF;
    const NNN = opcode & 0xFFF;
    return { X, Y, N, NN, NNN };
  }

  execute(opcode: number): void {
    const nibbled = (opcode >> 12) & 0xF;
    
    switch (nibbled) {
      case 0x0:
        if (opcode === 0x00E0) {
          this.execute00E0();
        } else if (opcode === 0x00EE) {
          this.execute00EE();
        } else {
          this.execute0NNN(opcode);
        }
        break;
      case 0x1:
        this.execute1NNN(opcode);
        break;
      case 0x2:
        this.execute2NNN(opcode);
        break;
      case 0x3:
        this.execute3XNN(opcode);
        break;
      case 0x4:
        this.execute4XNN(opcode);
        break;
      case 0x5:
        if ((opcode & 0xF) === 0) {
          const { X, Y } = this.decode(opcode);
          if (this._registers[X] === this._registers[Y]) {
            this._PC += 2;
          }
        }
        break;
      case 0x6:
        {
          const { X, NN } = this.decode(opcode);
          this._registers[X] = NN;
        }
        break;
      case 0x7:
        {
          const { X, NN } = this.decode(opcode);
          this._registers[X] += NN;
        }
        break;
      case 0x8:
        {
          const { X, Y, N } = this.decode(opcode);
          switch (N) {
            case 0x0:
              this._registers[X] = this._registers[Y];
              break;
            case 0x1:
              this._registers[X] |= this._registers[Y];
              break;
            case 0x2:
              this._registers[X] &= this._registers[Y];
              break;
            case 0x3:
              this._registers[X] ^= this._registers[Y];
              break;
            case 0x4:
              {
                const sum = this._registers[X] + this._registers[Y];
                this._registers[0xF] = sum > 0xFF ? 1 : 0;
                this._registers[X] = sum & 0xFF;
              }
              break;
            case 0x5:
              this._registers[0xF] = this._registers[X] >= this._registers[Y] ? 1 : 0;
              this._registers[X] -= this._registers[Y];
              break;
            case 0x6:
              this._registers[0xF] = this._registers[X] & 0x1;
              this._registers[X] >>= 1;
              break;
            case 0x7:
              this._registers[0xF] = this._registers[Y] >= this._registers[X] ? 1 : 0;
              this._registers[X] = this._registers[Y] - this._registers[X];
              break;
            case 0xE:
              this._registers[0xF] = (this._registers[X] & 0x80) >> 7;
              this._registers[X] <<= 1;
              break;
          }
        }
        break;
      case 0x9:
        if ((opcode & 0xF) === 0) {
          const { X, Y } = this.decode(opcode);
          if (this._registers[X] !== this._registers[Y]) {
            this._PC += 2;
          }
        }
        break;
      case 0xA:
        {
          const { NNN } = this.decode(opcode);
          this._I = NNN;
        }
        break;
      case 0xB:
        {
          const { NNN } = this.decode(opcode);
          this._PC = NNN + this._registers[0];
        }
        break;
      case 0xC:
        {
          const { X, NN } = this.decode(opcode);
          this._registers[X] = Math.floor(Math.random() * 0x100) & NN;
        }
        break;
      case 0xD:
        {
          const { X, Y, N } = this.decode(opcode);
          const x = this._registers[X] % 64;
          const y = this._registers[Y] % 32;
          const spriteData = new Uint8Array(N);
          for (let i = 0; i < N; i++) {
            spriteData[i] = this.memory.read(this._I + i);
          }
          const collision = this.display.drawSprite(x, y, spriteData, N);
          this._registers[0xF] = collision ? 1 : 0;
        }
        break;
      case 0xE:
        {
          const { X, NN } = this.decode(opcode);
          if (NN === 0x9E) {
            if (this.input.isKeyPressed(this._registers[X])) {
              this._PC += 2;
            }
          } else if (NN === 0xA1) {
            if (!this.input.isKeyPressed(this._registers[X])) {
              this._PC += 2;
            }
          }
        }
        break;
      case 0xF:
        {
          const { X, NN } = this.decode(opcode);
          switch (NN) {
            case 0x07:
              this._registers[X] = this._delayTimer;
              break;
            case 0x0A:
              this._registers[X] = this.input.waitForKey();
              break;
            case 0x15:
              this._delayTimer = this._registers[X];
              break;
            case 0x18:
              this._soundTimer = this._registers[X];
              if (this._soundTimer > 0) {
                this.sound.play();
              }
              break;
            case 0x1E:
              this._I += this._registers[X];
              break;
            case 0x29:
              this._I = this._registers[X] * 5;
              break;
            case 0x33:
              {
                const value = this._registers[X];
                this.memory.write(this._I, Math.floor(value / 100));
                this.memory.write(this._I + 1, Math.floor((value % 100) / 10));
                this.memory.write(this._I + 2, value % 10);
              }
              break;
            case 0x55:
              for (let i = 0; i <= X; i++) {
                this.memory.write(this._I + i, this._registers[i]);
              }
              break;
            case 0x65:
              for (let i = 0; i <= X; i++) {
                this._registers[i] = this.memory.read(this._I + i);
              }
              break;
          }
        }
        break;
    }
  }

  execute0NNN(opcode: number): void {
    // NOP - execute machine language subroutine
  }

  execute00E0(): void {
    this.display.clear();
  }

  execute00EE(): void {
    this._stackPointer--;
    this._PC = this._stack[this._stackPointer];
  }

  execute1NNN(opcode: number): void {
    const { NNN } = this.decode(opcode);
    this._PC = NNN;
  }

  execute2NNN(opcode: number): void {
    const { NNN } = this.decode(opcode);
    this._stack[this._stackPointer] = this._PC;
    this._stackPointer++;
    this._PC = NNN;
  }

  execute3XNN(opcode: number): void {
    const { X, NN } = this.decode(opcode);
    if (this._registers[X] === NN) {
      this._PC += 2;
    }
  }

  execute4XNN(opcode: number): void {
    const { X, NN } = this.decode(opcode);
    if (this._registers[X] !== NN) {
      this._PC += 2;
    }
  }

  updateTimers(): void {
    if (this._delayTimer > 0) {
      this._delayTimer--;
    }
    if (this._soundTimer > 0) {
      this._soundTimer--;
      if (this._soundTimer === 0) {
        this.sound.stop();
      }
    }
  }
}

export class Memory implements IMemory {
  private readonly ram: Uint8Array;

  constructor() {
    this.ram = new Uint8Array(4096);
    this.loadFonts();
  }

  read(address: number): number {
    return this.ram[address & 0xFFF];
  }

  write(address: number, value: number): void {
    this.ram[address & 0xFFF] = value & 0xFF;
  }

  readWord(address: number): number {
    const high = this.read(address) << 8;
    const low = this.read(address + 1);
    return high | low;
  }

  writeWord(address: number, value: number): void {
    this.write(address, (value >> 8) & 0xFF);
    this.write(address + 1, value & 0xFF);
  }

  loadRom(data: Uint8Array): void {
    for (let i = 0; i < data.length; i++) {
      this.write(0x200 + i, data[i]);
    }
  }

  reset(): void {
    this.ram.fill(0);
    this.loadFonts();
  }

  private loadFonts(): void {
    const fonts = [
      0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
      0x20, 0x60, 0x20, 0x20, 0x70, // 1
      0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
      0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
      0x90, 0x90, 0xF0, 0x10, 0x10, // 4
      0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
      0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
      0xF0, 0x10, 0x20, 0x40, 0x40, // 7
      0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
      0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
      0xF0, 0x90, 0xF0, 0x90, 0x90, // A
      0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
      0xF0, 0x80, 0x80, 0x80, 0xF0, // C
      0xE0, 0x90, 0x90, 0x90, 0xE0, // D
      0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
      0xF0, 0x80, 0xF0, 0x80, 0x80  // F
    ];
    for (let i = 0; i < fonts.length; i++) {
      this.ram[i] = fonts[i];
    }
  }
}

export class Display implements IDisplay {
  private readonly framebuffer: boolean[][];
  private readonly width: number;
  private readonly height: number;

  constructor() {
    this.width = 64;
    this.height = 32;
    this.framebuffer = Array(this.height).fill(null).map(() => Array(this.width).fill(false));
  }

  drawSprite(x: number, y: number, spriteData: Uint8Array, height: number): boolean {
    let collision = false;
    
    for (let row = 0; row < height; row++) {
      const spriteByte = spriteData[row];
      for (let col = 0; col < 8; col++) {
        if ((spriteByte & (0x80 >> col)) !== 0) {
          const px = (x + col) % this.width;
          const py = (y + row) % this.height;
          const oldPixel = this.framebuffer[py][px];
          this.framebuffer[py][px] = !oldPixel;
          if (oldPixel) {
            collision = true;
          }
        }
      }
    }
    
    return collision;
  }

  clear(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.framebuffer[y][x] = false;
      }
    }
  }

  getPixel(x: number, y: number): boolean {
    return this.framebuffer[y & 0x1F][x & 0x3F];
  }

  setPixel(x: number, y: number, state: boolean): void {
    this.framebuffer[y & 0x1F][x & 0x3F] = state;
  }

  refresh(): void {
    // Notify display updated
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}

export class Input implements IInput {
  private readonly keys: boolean[];

  constructor() {
    this.keys = Array(16).fill(false);
  }

  isKeyPressed(key: number): boolean {
    return this.keys[key & 0xF];
  }

  waitForKey(): number {
    while (true) {
      for (let i = 0; i < 16; i++) {
        if (this.keys[i]) {
          return i;
        }
      }
    }
  }

  keyDown(key: number): void {
    this.keys[key & 0xF] = true;
  }

  keyUp(key: number): void {
    this.keys[key & 0xF] = false;
  }

  reset(): void {
    this.keys.fill(false);
  }
}

export class Sound implements ISound {
  private audioContext: AudioContext | null;
  private oscillator: OscillatorNode | null;
  private gainNode: GainNode | null;
  private frequency: number;
  private playing: boolean;

  constructor() {
    this.audioContext = null;
    this.oscillator = null;
    this.gainNode = null;
    this.frequency = 440;
    this.playing = false;
  }

  play(): void {
    if (this.playing) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();
      
      this.oscillator.type = 'square';
      this.oscillator.frequency.value = this.frequency;
      this.gainNode.gain.value = 0.1;
      
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      
      this.oscillator.start();
      this.playing = true;
    } catch {
      // Audio not supported
    }
  }

  stop(): void {
    if (!this.playing) return;
    
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.playing = false;
  }

  setFrequency(hz: number): void {
    this.frequency = hz;
    if (this.oscillator) {
      this.oscillator.frequency.value = hz;
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }
}

export class Timer implements ITimer {
  private readonly cpu: ICpu;
  private intervalId: number | null;

  constructor(cpu: ICpu) {
    this.cpu = cpu;
    this.intervalId = null;
  }

  start(): void {
    if (this.intervalId !== null) return;
    this.intervalId = window.setInterval(() => this.tick(), 1000 / 60);
  }

  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  tick(): void {
    this.cpu.updateTimers();
  }
}
