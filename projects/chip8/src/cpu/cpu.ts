import { IMemory } from '../memory';
import { IDisplay } from '../display';
import { IInput } from '../input';
import { ISound } from '../sound';
import { ICpu } from './icpu';

/**
 * CHIP-8 CPU implementation with 35 opcodes.
 * Handles fetch-decode-execute cycle and timer updates.
 */
export class Cpu implements ICpu {
  private readonly memory: IMemory;
  private readonly display: IDisplay;
  private readonly input: IInput;
  private readonly sound: ISound;
  private readonly timer: { update: () => void };

  private readonly registers: Uint8Array;
  private pc: number;
  private i: number;
  private readonly stack: Uint16Array;
  private sp: number;
  private delayTimer: number;
  private soundTimer: number;

  constructor(
    memory: IMemory,
    display: IDisplay,
    input: IInput,
    sound: ISound,
    timer: { update: () => void }
  ) {
    if (!timer || typeof timer.update !== 'function') {
      throw new TypeError('timer with update method is required');
    }

    this.memory = memory;
    this.display = display;
    this.input = input;
    this.sound = sound;
    this.timer = timer;

    this.registers = new Uint8Array(16);
    this.pc = 0x200;
    this.i = 0;
    this.stack = new Uint16Array(16);
    this.sp = 0;
    this.delayTimer = 0;
    this.soundTimer = 0;
  }

  /**
   * Fetch the next 16-bit opcode from memory.
   * Advances the program counter by 2 bytes.
   * @returns The fetched opcode.
   */
  fetch(): number {
    const high = this.memory.read(this.pc);
    const low = this.memory.read(this.pc + 1);
    this.pc += 2;
    return (high << 8) | low;
  }

  async execute(opcode: number): Promise<void> {
    if (!Number.isInteger(opcode) || opcode < 0 || opcode > 0xFFFF) {
      throw new RangeError('opcode must be a 16-bit integer');
    }

    const nnn = opcode & 0xFFF;
    const nn = opcode & 0xFF;
    const n = opcode & 0xF;
    const x = (opcode >> 8) & 0xF;
    const y = (opcode >> 4) & 0xF;

    switch (opcode & 0xF000) {
      case 0x0000:
        switch (opcode) {
          case 0x00E0:
            this.display.clear();
            break;
          case 0x00EE:
            this.sp--;
            this.pc = this.stack[this.sp];
            break;
        }
        break;
      case 0x1000:
        this.pc = nnn;
        break;
      case 0x2000:
        this.stack[this.sp] = this.pc;
        this.sp++;
        this.pc = nnn;
        break;
      case 0x3000:
        if (this.registers[x] === nn) {
          this.pc += 2;
        }
        break;
      case 0x4000:
        if (this.registers[x] !== nn) {
          this.pc += 2;
        }
        break;
      case 0x5000:
        if (this.registers[x] === this.registers[y]) {
          this.pc += 2;
        }
        break;
      case 0x6000:
        this.registers[x] = nn;
        break;
      case 0x7000:
        this.registers[x] = (this.registers[x] + nn) & 0xFF;
        break;
      case 0x8000:
        switch (n) {
          case 0x0:
            this.registers[x] = this.registers[y];
            break;
          case 0x1:
            this.registers[x] |= this.registers[y];
            break;
          case 0x2:
            this.registers[x] &= this.registers[y];
            break;
          case 0x3:
            this.registers[x] ^= this.registers[y];
            break;
          case 0x4:
            const sum = this.registers[x] + this.registers[y];
            this.registers[0xF] = sum > 0xFF ? 1 : 0;
            this.registers[x] = sum & 0xFF;
            break;
          case 0x5:
            this.registers[0xF] = this.registers[x] >= this.registers[y] ? 1 : 0;
            this.registers[x] = (this.registers[x] - this.registers[y]) & 0xFF;
            break;
          case 0x6:
            this.registers[0xF] = this.registers[x] & 0x1;
            this.registers[x] >>= 1;
            break;
          case 0x7:
            this.registers[0xF] = this.registers[y] >= this.registers[x] ? 1 : 0;
            this.registers[x] = (this.registers[y] - this.registers[x]) & 0xFF;
            break;
          case 0xE:
            this.registers[0xF] = (this.registers[x] & 0x80) >> 7;
            this.registers[x] = (this.registers[x] << 1) & 0xFF;
            break;
        }
        break;
      case 0x9000:
        if (this.registers[x] !== this.registers[y]) {
          this.pc += 2;
        }
        break;
      case 0xA000:
        this.i = nnn;
        break;
      case 0xB000:
        this.pc = nnn + this.registers[0];
        break;
      case 0xC000:
        this.registers[x] = Math.floor(Math.random() * 0x100) & nn;
        break;
      case 0xD000: {
        const sprite = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          sprite[i] = this.memory.read(this.i + i);
        }
        const collision = this.display.drawSprite(
          this.registers[x] & 63,
          this.registers[y] & 31,
          sprite
        );
        this.registers[0xF] = collision ? 1 : 0;
        break;
      }
      case 0xE000:
        switch (nn) {
          case 0x9E:
            if (this.input.isKeyPressed(this.registers[x])) {
              this.pc += 2;
            }
            break;
          case 0xA1:
            if (!this.input.isKeyPressed(this.registers[x])) {
              this.pc += 2;
            }
            break;
        }
        break;
      case 0xF000:
        switch (nn) {
          case 0x07:
            this.registers[x] = this.delayTimer;
            break;
          case 0x0A:
            this.registers[x] = await this.input.waitKey();
            break;
          case 0x15:
            this.delayTimer = this.registers[x];
            break;
          case 0x18:
            this.soundTimer = this.registers[x];
            if (this.soundTimer > 0) {
              this.sound.play();
            }
            break;
          case 0x1E:
            this.i = (this.i + this.registers[x]) & 0xFFFF;
            break;
          case 0x29:
            this.i = (this.memory as any).getFontAddress(this.registers[x] & 0xF);
            break;
          case 0x33: {
            const value = this.registers[x];
            this.memory.write(this.i, Math.floor(value / 100));
            this.memory.write(this.i + 1, Math.floor((value % 100) / 10));
            this.memory.write(this.i + 2, value % 10);
            break;
          }
          case 0x55:
            for (let i = 0; i <= x; i++) {
              this.memory.write(this.i + i, this.registers[i]);
            }
            break;
          case 0x65:
            for (let i = 0; i <= x; i++) {
              this.registers[i] = this.memory.read(this.i + i);
            }
            break;
        }
        break;
    }
  }

  async step(): Promise<void> {
    const opcode = this.fetch();
    await this.execute(opcode);
    this.timer.update();
  }

  /**
   * Reset the CPU to its initial state.
   * Clears registers, stack, and timers.
   */
  reset(): void {
    this.registers.fill(0);
    this.pc = 0x200;
    this.i = 0;
    this.sp = 0;
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.stack.fill(0);
  }

  getRegister(index: number): number {
    if (!Number.isInteger(index) || index < 0 || index > 15) {
      throw new RangeError('register index must be an integer between 0 and 15');
    }
    return this.registers[index];
  }

  setRegister(index: number, value: number): void {
    if (!Number.isInteger(index) || index < 0 || index > 15) {
      throw new RangeError('register index must be an integer between 0 and 15');
    }
    if (!Number.isInteger(value) || value < 0 || value > 0xFF) {
      throw new RangeError('value must be an 8-bit integer');
    }
    this.registers[index] = value & 0xFF;
  }

  getPC(): number {
    return this.pc;
  }

  setPC(address: number): void {
    if (!Number.isInteger(address) || address < 0 || address > 0xFFFF) {
      throw new RangeError('address must be a 16-bit integer');
    }
    this.pc = address & 0xFFFF;
  }

  getI(): number {
    return this.i;
  }

  setI(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 0xFFFF) {
      throw new RangeError('value must be a 16-bit integer');
    }
    this.i = value & 0xFFFF;
  }
}
