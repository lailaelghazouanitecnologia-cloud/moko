import { IMemory } from '../memory';
import { IDisplay } from '../display';
import { IInput } from '../input';
import { ITimers } from '../timers';
import { ICpu } from './icpu';
import { Uint8 } from '../input/iinput';

export class Cpu implements ICpu {
  public readonly V: Uint8Array;
  public I: number;
  public PC: number;
  public SP: number;
  public readonly stack: Uint16Array;
  public delayTimer: number;
  public soundTimer: number;
  public opcode: number;

  private readonly memory: IMemory;
  private readonly display: IDisplay;
  private readonly input: IInput;
  private readonly timers: ITimers;

  constructor(memory: IMemory, display: IDisplay, input: IInput, timers: ITimers) {
    this.memory = memory;
    this.display = display;
    this.input = input;
    this.timers = timers;
    this.V = new Uint8Array(16);
    this.I = 0;
    this.PC = 0x200;
    this.SP = 0;
    this.stack = new Uint16Array(16);
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.opcode = 0;
  }

  public fetch(): number {
    const high = this.memory.read(this.PC);
    const low = this.memory.read(this.PC + 1);
    this.PC += 2;
    return (high << 8) | low;
  }

  public decode(opcode: number): { instruction: string; args: any[] } {
    const nibble = (opcode & 0xF000) >> 12;
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;
    const n = opcode & 0x000F;
    const kk = opcode & 0x00FF;
    const nnn = opcode & 0x0FFF;

    switch (nibble) {
      case 0x0:
        if (opcode === 0x00E0) return { instruction: 'CLS', args: [] };
        if (opcode === 0x00EE) return { instruction: 'RET', args: [] };
        return { instruction: 'SYS', args: [nnn] };
      case 0x1:
        return { instruction: 'JP', args: [nnn] };
      case 0x2:
        return { instruction: 'CALL', args: [nnn] };
      case 0x3:
        return { instruction: 'SE', args: [x, kk] };
      case 0x4:
        return { instruction: 'SNE', args: [x, kk] };
      case 0x5:
        return { instruction: 'SE', args: [x, y] };
      case 0x6:
        return { instruction: 'LD', args: [x, kk] };
      case 0x7:
        return { instruction: 'ADD', args: [x, kk] };
      case 0x8:
        switch (n) {
          case 0x0: return { instruction: 'LD', args: [x, y] };
          case 0x1: return { instruction: 'OR', args: [x, y] };
          case 0x2: return { instruction: 'AND', args: [x, y] };
          case 0x3: return { instruction: 'XOR', args: [x, y] };
          case 0x4: return { instruction: 'ADD', args: [x, y] };
          case 0x5: return { instruction: 'SUB', args: [x, y] };
          case 0x6: return { instruction: 'SHR', args: [x] };
          case 0x7: return { instruction: 'SUBN', args: [x, y] };
          case 0xE: return { instruction: 'SHL', args: [x] };
        }
        break;
      case 0x9:
        return { instruction: 'SNE', args: [x, y] };
      case 0xA:
        return { instruction: 'LD', args: ['I', nnn] };
      case 0xB:
        return { instruction: 'JP', args: ['V0', nnn] };
      case 0xC:
        return { instruction: 'RND', args: [x, kk] };
      case 0xD:
        return { instruction: 'DRW', args: [x, y, n] };
      case 0xE:
        if (kk === 0x9E) return { instruction: 'SKP', args: [x] };
        if (kk === 0xA1) return { instruction: 'SKNP', args: [x] };
        break;
      case 0xF:
        if (kk === 0x07) return { instruction: 'LD', args: [x, 'DT'] };
        if (kk === 0x0A) return { instruction: 'LD', args: [x, 'K'] };
        if (kk === 0x15) return { instruction: 'LD', args: ['DT', x] };
        if (kk === 0x18) return { instruction: 'LD', args: ['ST', x] };
        if (kk === 0x1E) return { instruction: 'ADD', args: ['I', x] };
        if (kk === 0x29) return { instruction: 'LD', args: ['F', x] };
        if (kk === 0x33) return { instruction: 'LD', args: ['B', x] };
        if (kk === 0x55) return { instruction: 'LD', args: ['[I]', x] };
        if (kk === 0x65) return { instruction: 'LD', args: [x, '[I]'] };
        break;
    }
    return { instruction: 'NOP', args: [] };
  }

  public execute(opcode: number): void {
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
          this.SP--;
          this.PC = this.stack[this.SP];
        }
        break;
      case 0x1:
        this.PC = nnn;
        break;
      case 0x2:
        this.stack[this.SP] = this.PC;
        this.SP++;
        this.PC = nnn;
        break;
      case 0x3:
        if (this.V[x] === kk) this.PC += 2;
        break;
      case 0x4:
        if (this.V[x] !== kk) this.PC += 2;
        break;
      case 0x5:
        if (this.V[x] === this.V[y]) this.PC += 2;
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
            this.V[0xF] = this.V[x] > this.V[y] ? 1 : 0;
            this.V[x] = (this.V[x] - this.V[y]) & 0xFF;
            break;
          case 0x6:
            this.V[0xF] = this.V[x] & 0x1;
            this.V[x] >>= 1;
            break;
          case 0x7:
            this.V[0xF] = this.V[y] > this.V[x] ? 1 : 0;
            this.V[x] = (this.V[y] - this.V[x]) & 0xFF;
            break;
          case 0xE:
            this.V[0xF] = (this.V[x] & 0x80) >> 7;
            this.V[x] = (this.V[x] << 1) & 0xFF;
            break;
        }
        break;
      case 0x9:
        if (this.V[x] !== this.V[y]) this.PC += 2;
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
          const spriteData = new Uint8Array(n);
          for (let i = 0; i < n; i++) {
            spriteData[i] = this.memory.read(this.I + i);
          }
          this.V[0xF] = this.display.drawSprite(this.V[x], this.V[y], spriteData, n);
        }
        break;
      case 0xE:
        if (kk === 0x9E) {
          if (this.input.isKeyPressed(this.V[x])) this.PC += 2;
        } else if (kk === 0xA1) {
          if (!this.input.isKeyPressed(this.V[x])) this.PC += 2;
        }
        break;
      case 0xF:
        switch (kk) {
          case 0x07:
            this.V[x] = this.timers.getDelayTimer();
            break;
          case 0x0A:
            this.V[x] = this.input.waitForKeyPress();
            break;
          case 0x15:
            this.timers.setDelayTimer(this.V[x]);
            break;
          case 0x18:
            this.timers.setSoundTimer(this.V[x]);
            break;
          case 0x1E:
            this.I += this.V[x];
            break;
          case 0x29:
            this.I = this.V[x] * 5;
            break;
          case 0x33:
            {
              const value = this.V[x];
              this.memory.write(this.I, Math.floor(value / 100));
              this.memory.write(this.I + 1, Math.floor((value % 100) / 10));
              this.memory.write(this.I + 2, value % 10);
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
        }
        break;
    }
  }

  public step(): boolean {
    try {
      this.opcode = this.fetch();
      this.execute(this.opcode);
      return true;
    } catch {
      return false;
    }
  }

  public reset(): void {
    this.V.fill(0);
    this.I = 0;
    this.PC = 0x200;
    this.SP = 0;
    this.stack.fill(0);
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.opcode = 0;
  }

  public getRegister(index: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15): number {
    return this.V[index];
  }

  public setRegister(index: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15, value: number): void {
    this.V[index] = value & 0xFF;
  }

  public getI(): number {
    return this.I;
  }

  public setI(value: number): void {
    this.I = value & 0xFFF;
  }

  public getPC(): number {
    return this.PC;
  }

  public get registers(): Uint8Array {
    return this.V;
  }
}
