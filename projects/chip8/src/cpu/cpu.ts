import { IMemory } from '../memory';
import { IDisplay } from '../display';
import { IInput } from '../input';
import { ISound } from '../sound';
import { ICpu } from './icpu';

interface DecodedOpcode {
  X: number;
  Y: number;
  N: number;
  NN: number;
  NNN: number;
}

export class Cpu implements ICpu {
  private readonly _memory: IMemory;
  private readonly _display: IDisplay;
  private readonly _input: IInput;
  private readonly _sound: ISound;
  private readonly _registers: Uint8Array;
  private _I: number;
  private _PC: number;
  private _delayTimer: number;
  private _soundTimer: number;
  private readonly _stack: Uint16Array;
  private _stackPointer: number;

  constructor(memory: IMemory, display: IDisplay, input: IInput, sound: ISound) {
    this._memory = memory;
    this._display = display;
    this._input = input;
    this._sound = sound;
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
      try {
        const opcode = this._memory.readWord(this._PC);
        this._PC += 2;
        return opcode;
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to fetch: ${message}`);
      }
  }

  decode(opcode: number): DecodedOpcode {
      try {
        return {
          X: (opcode >> 8) & 0x0F,
          Y: (opcode >> 4) & 0x0F,
          N: opcode & 0x000F,
          NN: opcode & 0x00FF,
          NNN: opcode & 0x0FFF
        };
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to decode: ${message}`);
      }
  }

  execute(opcode: number): void {
    const decoded = this.decode(opcode);
    const firstNibble = (opcode >> 12) & 0x0F;

    switch (firstNibble) {
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
        if (decoded.N === 0) {
          if (this._registers[decoded.X] === this._registers[decoded.Y]) {
            this._PC += 2;
          }
        }
        break;
      case 0x6:
        this._registers[decoded.X] = decoded.NN;
        break;
      case 0x7:
        this._registers[decoded.X] = (this._registers[decoded.X] + decoded.NN) & 0xFF;
        break;
      case 0x8:
        switch (decoded.N) {
          case 0x0:
            this._registers[decoded.X] = this._registers[decoded.Y];
            break;
          case 0x1:
            this._registers[decoded.X] = this._registers[decoded.X] | this._registers[decoded.Y];
            break;
          case 0x2:
            this._registers[decoded.X] = this._registers[decoded.X] & this._registers[decoded.Y];
            break;
          case 0x3:
            this._registers[decoded.X] = this._registers[decoded.X] ^ this._registers[decoded.Y];
            break;
          case 0x4:
            const sum = this._registers[decoded.X] + this._registers[decoded.Y];
            this._registers[0xF] = sum > 0xFF ? 1 : 0;
            this._registers[decoded.X] = sum & 0xFF;
            break;
          case 0x5:
            this._registers[0xF] = this._registers[decoded.X] >= this._registers[decoded.Y] ? 1 : 0;
            this._registers[decoded.X] = (this._registers[decoded.X] - this._registers[decoded.Y]) & 0xFF;
            break;
          case 0x6:
            this._registers[0xF] = this._registers[decoded.X] & 0x1;
            this._registers[decoded.X] = this._registers[decoded.X] >> 1;
            break;
          case 0x7:
            this._registers[0xF] = this._registers[decoded.Y] >= this._registers[decoded.X] ? 1 : 0;
            this._registers[decoded.X] = (this._registers[decoded.Y] - this._registers[decoded.X]) & 0xFF;
            break;
          case 0xE:
            this._registers[0xF] = (this._registers[decoded.X] & 0x80) >> 7;
            this._registers[decoded.X] = (this._registers[decoded.X] << 1) & 0xFF;
            break;
        }
        break;
      case 0x9:
        if (decoded.N === 0) {
          if (this._registers[decoded.X] !== this._registers[decoded.Y]) {
            this._PC += 2;
          }
        }
        break;
      case 0xA:
        this._I = decoded.NNN;
        break;
      case 0xB:
        this._PC = decoded.NNN + this._registers[0];
        break;
      case 0xC:
        this._registers[decoded.X] = Math.floor(Math.random() * 0x100) & decoded.NN;
        break;
      case 0xD:
        this._registers[0xF] = 0;
        for (let row = 0; row < decoded.N; row++) {
          const spriteByte = this._memory.read(this._I + row);
          for (let col = 0; col < 8; col++) {
            if ((spriteByte & (0x80 >> col)) !== 0) {
              const x = (this._registers[decoded.X] + col) % 64;
              const y = (this._registers[decoded.Y] + row) % 32;
              const pixel = this._display.getPixel(x, y);
              if (pixel) {
                this._registers[0xF] = 1;
              }
              this._display.setPixel(x, y, !pixel);
            }
          }
        }
        this._display.refresh();
        break;
      case 0xE:
        if (decoded.NN === 0x9E) {
          if (this._input.isKeyPressed(this._registers[decoded.X])) {
            this._PC += 2;
          }
        } else if (decoded.NN === 0xA1) {
          if (!this._input.isKeyPressed(this._registers[decoded.X])) {
            this._PC += 2;
          }
        }
        break;
      case 0xF:
        switch (decoded.NN) {
          case 0x07:
            this._registers[decoded.X] = this._delayTimer;
            break;
          case 0x0A:
            this._registers[decoded.X] = this._input.waitForKey();
            break;
          case 0x15:
            this._delayTimer = this._registers[decoded.X];
            break;
          case 0x18:
            this._soundTimer = this._registers[decoded.X];
            break;
          case 0x1E:
            this._I = (this._I + this._registers[decoded.X]) & 0xFFFF;
            break;
          case 0x29:
            this._I = this._registers[decoded.X] * 5;
            break;
          case 0x33:
            const value = this._registers[decoded.X];
            this._memory.write(this._I, Math.floor(value / 100));
            this._memory.write(this._I + 1, Math.floor((value % 100) / 10));
            this._memory.write(this._I + 2, value % 10);
            break;
          case 0x55:
            for (let i = 0; i <= decoded.X; i++) {
              this._memory.write(this._I + i, this._registers[i]);
            }
            break;
          case 0x65:
            for (let i = 0; i <= decoded.X; i++) {
              this._registers[i] = this._memory.read(this._I + i);
            }
            break;
        }
        break;
    }
  }

  execute0NNN(opcode: number): void {
    // NOP - machine language subroutine not implemented
  }

  execute00E0(): void {
    this._display.clear();
  }

  execute00EE(): void {
    this._stackPointer--;
    this._PC = this._stack[this._stackPointer];
  }

  execute1NNN(opcode: number): void {
    const decoded = this.decode(opcode);
    this._PC = decoded.NNN;
  }

  execute2NNN(opcode: number): void {
    const decoded = this.decode(opcode);
    this._stack[this._stackPointer] = this._PC;
    this._stackPointer++;
    this._PC = decoded.NNN;
  }

  execute3XNN(opcode: number): void {
    const decoded = this.decode(opcode);
    if (this._registers[decoded.X] === decoded.NN) {
      this._PC += 2;
    }
  }

  execute4XNN(opcode: number): void {
    const decoded = this.decode(opcode);
    if (this._registers[decoded.X] !== decoded.NN) {
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
        this._sound.stop();
      } else if (!this._sound.isPlaying()) {
        this._sound.play();
      }
    }
  }

  v(index: number): number {
    return this._registers[index];
  }

  setV(index: number, value: number): void {
    this._registers[index] = value & 0xFF;
  }

  i(): number {
    return this._I;
  }

  setI(value: number): void {
    this._I = value & 0xFFFF;
  }

  pc(): number {
    return this._PC;
  }

  setPc(value: number): void {
    this._PC = value & 0xFFFF;
  }

  sp(): number {
    return this._stackPointer;
  }

  setSp(value: number): void {
    this._stackPointer = value & 0xF;
  }

  display(): IDisplay {
    return this._display;
  }

  input(): IInput {
    return this._input;
  }

  memory(): IMemory {
    return this._memory;
  }

  sound(): ISound {
    return this._sound;
  }

  reset(): void {
    this._registers.fill(0);
    this._I = 0;
    this._PC = 0x200;
    this._delayTimer = 0;
    this._soundTimer = 0;
    this._stack.fill(0);
    this._stackPointer = 0;
  }
}
