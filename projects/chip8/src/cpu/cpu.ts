import { IMemory } from '../memory';
import { IDisplay } from '../display';
import { IInput } from '../input';
import { ITimer } from '../timer';
import { ICpu } from './icpu';

/**
 * CHIP-8 CPU implementation with 35 opcodes.
 * Handles instruction fetch, decode, execute, and timer updates.
 */
export class Cpu implements ICpu {
  private readonly V: number[];
  private I: number;
  private PC: number;
  private SP: number;
  private readonly stack: number[];
  private readonly memory: IMemory;
  private readonly display: IDisplay;
  private readonly input: IInput;
  private readonly timer: ITimer;

  constructor(memory: IMemory, display: IDisplay, input: IInput, timer: ITimer) {
    this.V = new Array(16).fill(0);
    this.I = 0;
    this.PC = 0x200;
    this.SP = 0;
    this.stack = new Array(16).fill(0);
    this.memory = memory;
    this.display = display;
    this.input = input;
    this.timer = timer;
  }

  /**
   * Fetches the next 16-bit opcode from memory at the current PC.
   * Automatically increments PC by 2.
   * @returns The 16-bit opcode
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

    const nnn = opcode & 0xFFF;
    const nn = opcode & 0xFF;
    const n = opcode & 0xF;
    const x = (opcode >> 8) & 0xF;
    const y = (opcode >> 4) & 0xF;

    switch (opcode & 0xF000) {
      case 0x0000:
        switch (nn) {
          case 0x00E0:
            this.display.clear();
            break;
          case 0x00EE:
            this.SP--;
            this.PC = this.stack[this.SP];
            break;
        }
        break;
      case 0x1000:
        this.PC = nnn;
        break;
      case 0x2000:
        this.stack[this.SP] = this.PC;
        this.SP++;
        this.PC = nnn;
        break;
      case 0x3000:
        if (this.V[x] === nn) {
          this.PC += 2;
        }
        break;
      case 0x4000:
        if (this.V[x] !== nn) {
          this.PC += 2;
        }
        break;
      case 0x5000:
        if (this.V[x] === this.V[y]) {
          this.PC += 2;
        }
        break;
      case 0x6000:
        this.V[x] = nn;
        break;
      case 0x7000:
        this.V[x] = (this.V[x] + nn) & 0xFF;
        break;
      case 0x8000:
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
        }
        break;
      case 0x9000:
        if (n === 0) {
          if (this.V[x] !== this.V[y]) {
            this.PC += 2;
          }
        }
        break;
      case 0xA000:
        this.I = nnn;
        break;
      case 0xB000:
        this.PC = nnn + this.V[0];
        break;
      case 0xC000:
        this.V[x] = Math.floor(Math.random() * 0x100) & nn;
        break;
      case 0xD000:
        this.V[0xF] = 0;
        for (let row = 0; row < n; row++) {
          const spriteByte = this.memory.read(this.I + row);
          const collision = this.display.drawSprite(this.V[x], this.V[y] + row, new Uint8Array([spriteByte]), 1);
          if (collision) {
            this.V[0xF] = 1;
          }
        }
        break;
      case 0xE000:
        switch (nn) {
          case 0x9E:
            if (this.input.isPressed(this.V[x])) {
              this.PC += 2;
            }
            break;
          case 0xA1:
            if (!this.input.isPressed(this.V[x])) {
              this.PC += 2;
            }
            break;
        }
        break;
      case 0xF000:
        switch (nn) {
          case 0x07:
            this.V[x] = this.timer.getDelay();
            break;
          case 0x0A:
            this.V[x] = this.input.waitForPress();
            break;
          case 0x15:
            this.timer.setDelay(this.V[x]);
            break;
          case 0x18:
            this.timer.setSound(this.V[x]);
            break;
          case 0x1E:
            this.I += this.V[x];
            break;
          case 0x29:
            this.I = this.V[x] * 5;
            break;
          case 0x33:
            const value = this.V[x];
            this.memory.write(this.I, Math.floor(value / 100));
            this.memory.write(this.I + 1, Math.floor((value % 100) / 10));
            this.memory.write(this.I + 2, value % 10);
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
        }
        break;
    }
  }

  step(): void {
    const opcode = this.fetch();
    this.execute(opcode);
    this.timer.tick();
  }

  /**
   * Resets the CPU state to initial values.
   * Clears registers, stack, and sets PC to 0x200.
   */
  reset(): void {
    this.V.fill(0);
    this.I = 0;
    this.PC = 0x200;
    this.SP = 0;
    this.stack.fill(0);
  }

  getPC(): number {
    return this.PC;
  }

  getRegister(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index > 15) {
      throw new RangeError('Register index must be an integer between 0 and 15');
    }
    return this.V[index];
  }
}
