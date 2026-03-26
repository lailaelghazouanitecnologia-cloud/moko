import { IMemory, Memory } from '../memory';
import { Display, IDisplay } from '../display';
import { IKeypad, Keypad } from '../keypad';
import { ITimers, Timers } from '../timers';
import { ICpu } from './icpu';

export class Cpu implements ICpu {
  readonly ram: Uint8Array;
  readonly v: Uint8Array;
  i: number;
  pc: number;
  sp: number;
  readonly stack: Uint16Array;
  delayTimer: number;
  soundTimer: number;
  readonly video: Uint8Array;
  readonly keypadPressed: Uint8Array;
  readonly keypadWaiting: Uint8Array;
  quirks: {
    shiftQuirk: boolean;
    loadStoreQuirk: boolean;
    jumpQuirk: boolean;
    clipQuirk: boolean;
    logicQuirk: boolean;
  };
  halted: boolean;
  breakpoint: number;

  constructor() {
    this.ram = new Uint8Array(4096);
    this.v = new Uint8Array(16);
    this.i = 0;
    this.pc = 0x200;
    this.sp = 0;
    this.stack = new Uint16Array(16);
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.video = new Uint8Array(64 * 32);
    this.keypadPressed = new Uint8Array(16);
    this.keypadWaiting = new Uint8Array(16);
    this.quirks = {
      shiftQuirk: false,
      loadStoreQuirk: false,
      jumpQuirk: false,
      clipQuirk: false,
      logicQuirk: false
    };
    this.halted = false;
    this.breakpoint = -1;
  }

  fetch(): number {
    const hi = this.ram[this.pc] << 8;
    const lo = this.ram[this.pc + 1];
    this.pc += 2;
    return hi | lo;
  }

  execute(opcode: number): void {
    if (!Number.isInteger(opcode) || opcode < 0 || opcode > 0xFFFF) {
      throw new RangeError('Opcode must be a 16-bit unsigned integer');
    }

    const nnn = opcode & 0x0FFF;
    const nn = opcode & 0x00FF;
    const n = opcode & 0x000F;
    const x = (opcode & 0x0F00) >> 8;
    const y = (opcode & 0x00F0) >> 4;

    switch (opcode & 0xF000) {
      case 0x0000:
        switch (nn) {
          case 0x00E0:
            this.video.fill(0);
            break;
          case 0x00EE:
            this.pc = this.stack[--this.sp];
            break;
        }
        break;
      case 0x1000:
        this.pc = nnn;
        break;
      case 0x2000:
        this.stack[this.sp++] = this.pc;
        this.pc = nnn;
        break;
      case 0x3000:
        if (this.v[x] === nn) this.pc += 2;
        break;
      case 0x4000:
        if (this.v[x] !== nn) this.pc += 2;
        break;
      case 0x5000:
        if (this.v[x] === this.v[y]) this.pc += 2;
        break;
      case 0x6000:
        this.v[x] = nn;
        break;
      case 0x7000:
        this.v[x] += nn;
        break;
      case 0x8000:
        switch (n) {
          case 0x0:
            this.v[x] = this.v[y];
            break;
          case 0x1:
            this.v[x] |= this.v[y];
            break;
          case 0x2:
            this.v[x] &= this.v[y];
            break;
          case 0x3:
            this.v[x] ^= this.v[y];
            break;
          case 0x4:
            const sum = this.v[x] + this.v[y];
            this.v[0xF] = sum > 255 ? 1 : 0;
            this.v[x] = sum & 0xFF;
            break;
          case 0x5:
            this.v[0xF] = this.v[x] >= this.v[y] ? 1 : 0;
            this.v[x] -= this.v[y];
            break;
          case 0x6:
            if (!this.quirks.shiftQuirk) {
              this.v[0xF] = this.v[x] & 1;
              this.v[x] >>= 1;
            } else {
              this.v[0xF] = this.v[y] & 1;
              this.v[x] = this.v[y] >> 1;
            }
            break;
          case 0x7:
            this.v[0xF] = this.v[y] >= this.v[x] ? 1 : 0;
            this.v[x] = this.v[y] - this.v[x];
            break;
          case 0xE:
            if (!this.quirks.shiftQuirk) {
              this.v[0xF] = (this.v[x] & 0x80) >> 7;
              this.v[x] <<= 1;
            } else {
              this.v[0xF] = (this.v[y] & 0x80) >> 7;
              this.v[x] = this.v[y] << 1;
            }
            break;
        }
        break;
      case 0x9000:
        if (n === 0) {
          if (this.v[x] !== this.v[y]) this.pc += 2;
        }
        break;
      case 0xA000:
        this.i = nnn;
        break;
      case 0xB000:
        this.pc = nnn + (this.quirks.jumpQuirk ? this.v[0] : this.v[x]);
        break;
      case 0xC000:
        this.v[x] = Math.floor(Math.random() * 256) & nn;
        break;
      case 0xD000:
        this.v[0xF] = 0;
        for (let row = 0; row < n; row++) {
          const sprite = this.ram[this.i + row];
          for (let col = 0; col < 8; col++) {
            const px = (this.v[x] + col) % 64;
            const py = (this.v[y] + row) % 32;
            const idx = py * 64 + px;
            const pixel = (sprite >> (7 - col)) & 1;
            if (pixel && this.video[idx]) this.v[0xF] = 1;
            this.video[idx] ^= pixel;
          }
        }
        break;
      case 0xE000:
        switch (nn) {
          case 0x9E:
            if (this.keypadPressed[this.v[x]]) this.pc += 2;
            break;
          case 0xA1:
            if (!this.keypadPressed[this.v[x]]) this.pc += 2;
            break;
        }
        break;
      case 0xF000:
        switch (nn) {
          case 0x07:
            this.v[x] = this.delayTimer;
            break;
          case 0x0A:
            this.keypadWaiting[x] = 1;
            break;
          case 0x15:
            this.delayTimer = this.v[x];
            break;
          case 0x18:
            this.soundTimer = this.v[x];
            break;
          case 0x1E:
            this.i += this.v[x];
            break;
          case 0x29:
            this.i = this.v[x] * 5;
            break;
          case 0x33:
            this.ram[this.i] = Math.floor(this.v[x] / 100);
            this.ram[this.i + 1] = Math.floor((this.v[x] % 100) / 10);
            this.ram[this.i + 2] = this.v[x] % 10;
            break;
          case 0x55:
            for (let r = 0; r <= x; r++) {
              this.ram[this.i + r] = this.v[r];
            }
            if (!this.quirks.loadStoreQuirk) this.i += x + 1;
            break;
          case 0x65:
            for (let r = 0; r <= x; r++) {
              this.v[r] = this.ram[this.i + r];
            }
            if (!this.quirks.loadStoreQuirk) this.i += x + 1;
            break;
        }
        break;
    }
  }

  step(): void {
    if (this.halted) return;
    const opcode = this.fetch();
    this.execute(opcode);
  }

  reset(): void {
    this.ram.fill(0);
    this.v.fill(0);
    this.i = 0;
    this.pc = 0x200;
    this.sp = 0;
    this.stack.fill(0);
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.video.fill(0);
    this.keypadPressed.fill(0);
    this.keypadWaiting.fill(0);
    this.halted = false;
    this.breakpoint = -1;
  }

  setQuirks(mode: 'vip' | 'schip'): void {
    if (mode !== 'vip' && mode !== 'schip') {
      throw new TypeError("Mode must be 'vip' or 'schip'");
    }
    if (mode === 'vip') {
      this.quirks.shiftQuirk = false;
      this.quirks.loadStoreQuirk = false;
      this.quirks.jumpQuirk = false;
      this.quirks.clipQuirk = false;
      this.quirks.logicQuirk = false;
    } else {
      this.quirks.shiftQuirk = true;
      this.quirks.loadStoreQuirk = true;
      this.quirks.jumpQuirk = true;
      this.quirks.clipQuirk = true;
      this.quirks.logicQuirk = true;
    }
  }
}
