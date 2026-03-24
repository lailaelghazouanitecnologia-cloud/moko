import { Memory } from './memory';
import { Registers } from './registers';
import { Instruction, decodeInstruction } from './instruction';
import { Display } from './display';
import { Keyboard } from './keyboard';
import { Timers } from './timers';

export class CPU {
  private memory: Memory;
  private registers: Registers;
  private display: Display;
  private keyboard: Keyboard;
  private timers: Timers;
  private pc: number;
  private stack: number[];
  private halted: boolean;
  private waitingForKey: boolean;
  private keyRegister: number;

  constructor(memory: Memory, registers: Registers, display: Display, keyboard: Keyboard, timers: Timers) {
    this.memory = memory;
    this.registers = registers;
    this.display = display;
    this.keyboard = keyboard;
    this.timers = timers;
    this.pc = 0x200;
    this.stack = [];
    this.halted = false;
    this.waitingForKey = false;
    this.keyRegister = 0;
  }

  public reset(): void {
    this.pc = 0x200;
    this.stack = [];
    this.halted = false;
    this.waitingForKey = false;
    this.keyRegister = 0;
  }

  public isHalted(): boolean {
    return this.halted;
  }

  public isWaitingForKey(): boolean {
    return this.waitingForKey;
  }

  public keyPressed(key: number): void {
    if (this.waitingForKey) {
      this.registers.v[this.keyRegister] = key;
      this.waitingForKey = false;
    }
  }

  public cycle(): void {
    if (this.halted || this.waitingForKey) return;

    const opcode = this.fetch();
    const instruction = decodeInstruction(opcode);
    this.execute(instruction);
  }

  private fetch(): number {
    const high = this.memory.readByte(this.pc);
    const low = this.memory.readByte(this.pc + 1);
    this.pc += 2;
    return (high << 8) | low;
  }

  private execute(instruction: Instruction): void {
    const opcode = instruction.opcode;
    const nnn = opcode & 0x0FFF;
    const nn = opcode & 0x00FF;
    const n = opcode & 0x000F;
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    const kk = opcode & 0x00FF;

    switch (opcode & 0xF000) {
      case 0x0000:
        switch (nn) {
          case 0x00E0:
            this.display.clear();
            break;
          case 0x00EE:
            this.pc = this.stack.pop()!;
            break;
          default:
            this.illegalOpcode(opcode);
        }
        break;

      case 0x1000:
        this.pc = nnn;
        break;

      case 0x2000:
        this.stack.push(this.pc);
        this.pc = nnn;
        break;

      case 0x3000:
        if (this.registers.v[x] === kk) this.pc += 2;
        break;

      case 0x4000:
        if (this.registers.v[x] !== kk) this.pc += 2;
        break;

      case 0x5000:
        if (this.registers.v[x] === this.registers.v[y]) this.pc += 2;
        break;

      case 0x6000:
        this.registers.v[x] = kk;
        break;

      case 0x7000:
        this.registers.v[x] = (this.registers.v[x] + kk) & 0xFF;
        break;

      case 0x8000:
        switch (n) {
          case 0x0:
            this.registers.v[x] = this.registers.v[y];
            break;
          case 0x1:
            this.registers.v[x] |= this.registers.v[y];
            break;
          case 0x2:
            this.registers.v[x] &= this.registers.v[y];
            break;
          case 0x3:
            this.registers.v[x] ^= this.registers.v[y];
            break;
          case 0x4:
            const sum = this.registers.v[x] + this.registers.v[y];
            this.registers.v[0xF] = sum > 0xFF ? 1 : 0;
            this.registers.v[x] = sum & 0xFF;
            break;
          case 0x5:
            this.registers.v[0xF] = this.registers.v[x] >= this.registers.v[y] ? 1 : 0;
            this.registers.v[x] = (this.registers.v[x] - this.registers.v[y]) & 0xFF;
            break;
          case 0x6:
            this.registers.v[0xF] = this.registers.v[x] & 0x1;
            this.registers.v[x] >>= 1;
            break;
          case 0x7:
            this.registers.v[0xF] = this.registers.v[y] >= this.registers.v[x] ? 1 : 0;
            this.registers.v[x] = (this.registers.v[y] - this.registers.v[x]) & 0xFF;
            break;
          case 0xE:
            this.registers.v[0xF] = (this.registers.v[x] & 0x80) >> 7;
            this.registers.v[x] = (this.registers.v[x] << 1) & 0xFF;
            break;
          default:
            this.illegalOpcode(opcode);
        }
        break;

      case 0x9000:
        if (this.registers.v[x] !== this.registers.v[y]) this.pc += 2;
        break;

      case 0xA000:
        this.registers.i = nnn;
        break;

      case 0xB000:
        this.pc = nnn + this.registers.v[0];
        break;

      case 0xC000:
        this.registers.v[x] = Math.floor(Math.random() * 0x100) & kk;
        break;

      case 0xD000:
        const vx = this.registers.v[x] % Display.WIDTH;
        const vy = this.registers.v[y] % Display.HEIGHT;
        this.registers.v[0xF] = this.display.drawSprite(vx, vy, this.registers.i, n, this.memory) ? 1 : 0;
        break;

      case 0xE000:
        switch (nn) {
          case 0x009E:
            if (this.keyboard.isKeyPressed(this.registers.v[x])) this.pc += 2;
            break;
          case 0x00A1:
            if (!this.keyboard.isKeyPressed(this.registers.v[x])) this.pc += 2;
            break;
          default:
            this.illegalOpcode(opcode);
        }
        break;

      case 0xF000:
        switch (nn) {
          case 0x0007:
            this.registers.v[x] = this.timers.getDelayTimer();
            break;
          case 0x000A:
            this.waitingForKey = true;
            this.keyRegister = x;
            break;
          case 0x0015:
            this.timers.setDelayTimer(this.registers.v[x]);
            break;
          case 0x0018:
            this.timers.setSoundTimer(this.registers.v[x]);
            break;
          case 0x001E:
            this.registers.i = (this.registers.i + this.registers.v[x]) & 0xFFFF;
            break;
          case 0x0029:
            this.registers.i = this.registers.v[x] * 5;
            break;
          case 0x0033:
            const val = this.registers.v[x];
            this.memory.writeByte(this.registers.i, Math.floor(val / 100));
            this.memory.writeByte(this.registers.i + 1, Math.floor((val % 100) / 10));
            this.memory.writeByte(this.registers.i + 2, val % 10);
            break;
          case 0x0055:
            for (let i = 0; i <= x; i++) {
              this.memory.writeByte(this.registers.i + i, this.registers.v[i]);
            }
            break;
          case 0x0065:
            for (let i = 0; i <= x; i++) {
              this.registers.v[i] = this.memory.readByte(this.registers.i + i);
            }
            break;
          default:
            this.illegalOpcode(opcode);
        }
        break;

      default:
        this.illegalOpcode(opcode);
    }
  }

  private illegalOpcode(opcode: number): void {
    this.halted = true;
    throw new Error(`Illegal opcode: 0x${opcode.toString(16).padStart(4, '0')}`);
  }
}
