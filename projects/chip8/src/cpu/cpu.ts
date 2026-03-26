import { IMemory } from '../memory';
import { IDisplay } from '../display';
import { IInput } from '../input';
import { ITimers } from '../timers';
import { ISound } from '../sound';
import { ICPU } from './icpu';

export class CPU implements ICPU {
  private readonly memory: IMemory;
  private readonly display: IDisplay;
  private readonly input: IInput;
  private readonly timers: ITimers;
  private readonly sound: ISound;
  private readonly V: Uint8Array;
  private I: number;
  private PC: number;
  private SP: number;
  private readonly stack: Uint16Array;

  constructor(memory: IMemory, display: IDisplay, input: IInput, timers: ITimers, sound: ISound) {
    this.memory = memory;
    this.display = display;
    this.input = input;
    this.timers = timers;
    this.sound = sound;
    this.V = new Uint8Array(16);
    this.I = 0;
    this.PC = 0x200;
    this.SP = 0;
    this.stack = new Uint16Array(16);
  }

  /**
   * Fetch the next 16-bit big-endian instruction from memory.
   * Advances the program counter by 2 bytes.
   * @returns The fetched opcode.
   */
  fetch(): number {
    const high = this.memory.read(this.PC);
    const low = this.memory.read(this.PC + 1);
    this.PC += 2;
    return (high << 8) | low;
  }

  execute(opcode: number): void {
    if (!Number.isInteger(opcode) || opcode < 0 || opcode > 0xFFFF) {
      throw new TypeError('Opcode must be a 16-bit unsigned integer');
    }

    const nibble = (opcode & 0xF000) >> 12;
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    const n = opcode & 0x000F;
    const kk = opcode & 0x00FF;
    const nnn = opcode & 0x0FFF;

    switch (nibble) {
      case 0x0:
        if (opcode === 0x00E0) {
          this.display.clear();
        } else if (opcode === 0x00EE) {
          if (this.SP === 0) {
            throw new RangeError('Stack underflow');
          }
          this.SP--;
          this.PC = this.stack[this.SP];
        }
        break;
      case 0x1:
        this.PC = nnn;
        break;
      case 0x2:
        if (this.SP >= this.stack.length) {
          throw new RangeError('Stack overflow');
        }
        this.stack[this.SP] = this.PC;
        this.SP++;
        this.PC = nnn;
        break;
      case 0x3:
        if (this.V[x] === kk) {
          this.PC += 2;
        }
        break;
      case 0x4:
        if (this.V[x] !== kk) {
          this.PC += 2;
        }
        break;
      case 0x5:
        if (this.V[x] === this.V[y]) {
          this.PC += 2;
        }
        break;
      case 0x6:
        this.V[x] = kk;
        break;
      case 0x7:
        this.V[x] = (this.V[x] + kk) & 0xFF;
        break;
      case 0x8:
        switch (n) {
          case 0x0:
            this.V[x] = this.V[y];
            break;
          case 0x1:
            this.V[x] |= this.V[y];
            break;
          case 0x2:
            this.V[x] &= this.V[y];
            break;
          case 0x3:
            this.V[x] ^= this.V[y];
            break;
          case 0x4:
            const sum = this.V[x] + this.V[y];
            this.V[0xF] = sum > 0xFF ? 1 : 0;
            this.V[x] = sum & 0xFF;
            break;
          case 0x5:
            this.V[0xF] = this.V[x] >= this.V[y] ? 1 : 0;
            this.V[x] = (this.V[x] - this.V[y]) & 0xFF;
            break;
          case 0x6:
            this.V[0xF] = this.V[x] & 0x1;
            this.V[x] >>= 1;
            break;
          case 0x7:
            this.V[0xF] = this.V[y] >= this.V[x] ? 1 : 0;
            this.V[x] = (this.V[y] - this.V[x]) & 0xFF;
            break;
          case 0xE:
            this.V[0xF] = (this.V[x] & 0x80) >> 7;
            this.V[x] = (this.V[x] << 1) & 0xFF;
            break;
          default:
            throw new RangeError(`Unknown 0x8 opcode: ${n}`);
        }
        break;
      case 0x9:
        if (this.V[x] !== this.V[y]) {
          this.PC += 2;
        }
        break;
      case 0xA:
        this.I = nnn;
        break;
      case 0xB:
        this.PC = nnn + this.V[0];
        break;
      case 0xC:
        this.V[x] = Math.floor(Math.random() * 0x100) & kk;
        break;
      case 0xD:
        {
          const bytes = new Uint8Array(n);
          for (let i = 0; i < n; i++) {
            bytes[i] = this.memory.read(this.I + i);
          }
          this.V[0xF] = this.display.drawSprite(this.V[x], this.V[y], bytes, n);
        }
        break;
      case 0xE:
        if (kk === 0x9E) {
          if (this.input.isPressed(this.V[x])) {
            this.PC += 2;
          }
        } else if (kk === 0xA1) {
          if (!this.input.isPressed(this.V[x])) {
            this.PC += 2;
          }
        } else {
          throw new RangeError(`Unknown 0xE opcode: ${kk}`);
        }
        break;
      case 0xF:
        switch (kk) {
          case 0x07:
            this.V[x] = (this.timers as any).getDelayTimer();
            break;
          case 0x0A:
            this.input.waitKey().then(key => {
              this.V[x] = key;
            });
            break;
          case 0x15:
            (this.timers as any).setDelayTimer(this.V[x]);
            break;
          case 0x18:
            (this.timers as any).setSoundTimer(this.V[x]);
            break;
          case 0x1E:
            this.I = (this.I + this.V[x]) & 0xFFF;
            break;
          case 0x29:
            this.I = this.V[x] * 5;
            break;
          case 0x33:
            {
              const val = this.V[x];
              this.memory.write(this.I, Math.floor(val / 100));
              this.memory.write(this.I + 1, Math.floor((val % 100) / 10));
              this.memory.write(this.I + 2, val % 10);
            }
            break;
          case 0x55:
            for (let i = 0; i <= x; i++) {
              this.memory.write(this.I + i, this.V[i]);
            }
            break;
          case 0x65:
            for (let i = 0; i <= x; i++) {
              this.V[i] = this.memory.read(this.I + i);
            }
            break;
          default:
            throw new RangeError(`Unknown 0xF opcode: ${kk}`);
        }
        break;
      default:
        throw new RangeError(`Unknown opcode: ${opcode.toString(16).padStart(4, '0')}`);
    }
  }

  step(): void {
    const opcode = this.fetch();
    this.execute(opcode);
  }

  getRegister(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index > 15) {
      throw new RangeError('Register index must be an integer between 0 and 15');
    }
    return this.V[index];
  }

  setRegister(index: number, value: number): void {
    if (!Number.isInteger(index) || index < 0 || index > 15) {
      throw new RangeError('Register index must be an integer between 0 and 15');
    }
    if (!Number.isInteger(value) || value < 0 || value > 0xFF) {
      throw new RangeError('Value must be an 8-bit unsigned integer');
    }
    this.V[index] = value;
  }

  getI(): number {
    return this.I;
  }

  setI(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xFFF) {
      throw new RangeError('I must be a 12-bit unsigned integer');
    }
    this.I = value;
  }

  getPC(): number {
    return this.PC;
  }

  setPC(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xFFFF) {
      throw new RangeError('PC must be a 16-bit unsigned integer');
    }
    this.PC = value;
  }

  getSP(): number {
    return this.SP;
  }
}
