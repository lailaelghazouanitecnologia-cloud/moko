import { IMemory, Memory } from '../memory'
import { Display, IDisplay } from '../display'
import { IKeypad, Keypad } from '../keypad'
import { ITimers, Timers } from '../timers'
import { ICpu } from './icpu'

export class Cpu implements ICpu {
  readonly ram: Uint8Array
  readonly v: Uint8Array
  i: number
  pc: number
  sp: number
  readonly stack: Uint16Array
  delayTimer: number
  soundTimer: number
  readonly framebuffer: Uint8Array
  readonly keypad: Uint16Array

  constructor(
    private readonly memory: IMemory,
    private readonly display: IDisplay,
    private readonly keypadInput: IKeypad,
    private readonly timers: ITimers
  ) {
    this.ram = new Uint8Array(4096)
    this.v = new Uint8Array(16)
    this.i = 0
    this.pc = 0x200
    this.sp = 0
    this.stack = new Uint16Array(16)
    this.delayTimer = 0
    this.soundTimer = 0
    this.framebuffer = new Uint8Array(64 * 32)
    this.keypad = new Uint16Array(16)
  }

  /**
   * Fetches the next 16-bit opcode from memory (big-endian).
   * Automatically increments the program counter by 2.
   * @returns The fetched opcode as a 16-bit number.
   */
  fetch(): number {
    const hi = this.ram[this.pc] << 8
    const lo = this.ram[this.pc + 1]
    this.pc += 2
    return hi | lo
  }

  execute(opcode: number): void {
    if (!Number.isInteger(opcode) || opcode < 0 || opcode > 0xFFFF) {
      throw new TypeError('Opcode must be a 16-bit unsigned integer')
    }
    const nibble = (opcode & 0xF000) >> 12
    switch (nibble) {
      case 0x0:
        if (opcode === 0x00E0) this.op00E0()
        else if (opcode === 0x00EE) this.op00EE()
        break
      case 0x1:
        this.op1nnn(opcode & 0x0FFF)
        break
      case 0x2:
        this.op2nnn(opcode & 0x0FFF)
        break
      case 0x3:
        this.op3xkk((opcode & 0x0F00) >> 8, opcode & 0x00FF)
        break
      case 0x4:
        this.op4xkk((opcode & 0x0F00) >> 8, opcode & 0x00FF)
        break
      case 0x5:
        this.op5xy0((opcode & 0x0F00) >> 8, (opcode & 0x00F0) >> 4)
        break
      case 0x6:
        this.op6xkk((opcode & 0x0F00) >> 8, opcode & 0x00FF)
        break
    }
  }

  op00E0(): void {
    this.framebuffer.fill(0)
  }

  op00EE(): void {
    if (this.sp <= 0) {
      throw new RangeError('Stack underflow')
    }
    this.sp--
    this.pc = this.stack[this.sp]
  }

  op1nnn(nnn: number): void {
    if (!Number.isInteger(nnn) || nnn < 0 || nnn > 0xFFF) {
      throw new TypeError('Address must be a 12-bit unsigned integer')
    }
    this.pc = nnn
  }

  op2nnn(nnn: number): void {
    if (!Number.isInteger(nnn) || nnn < 0 || nnn > 0xFFF) {
      throw new TypeError('Address must be a 12-bit unsigned integer')
    }
    if (this.sp >= this.stack.length) {
      throw new RangeError('Stack overflow')
    }
    this.stack[this.sp] = this.pc
    this.sp++
    this.pc = nnn
  }

  op3xkk(x: number, kk: number): void {
    if (!Number.isInteger(x) || x < 0 || x > 15) {
      throw new TypeError('Register index must be between 0 and 15')
    }
    if (!Number.isInteger(kk) || kk < 0 || kk > 255) {
      throw new TypeError('kk must be an 8-bit unsigned integer')
    }
    if (this.v[x] === kk) this.pc += 2
  }

  op4xkk(x: number, kk: number): void {
    if (!Number.isInteger(x) || x < 0 || x > 15) {
      throw new TypeError('Register index must be between 0 and 15')
    }
    if (!Number.isInteger(kk) || kk < 0 || kk > 255) {
      throw new TypeError('kk must be an 8-bit unsigned integer')
    }
    if (this.v[x] !== kk) this.pc += 2
  }

  op5xy0(x: number, y: number): void {
    if (!Number.isInteger(x) || x < 0 || x > 15) {
      throw new TypeError('Register index x must be between 0 and 15')
    }
    if (!Number.isInteger(y) || y < 0 || y > 15) {
      throw new TypeError('Register index y must be between 0 and 15')
    }
    if (this.v[x] === this.v[y]) this.pc += 2
  }

  op6xkk(x: number, kk: number): void {
    if (!Number.isInteger(x) || x < 0 || x > 15) {
      throw new TypeError('Register index must be between 0 and 15')
    }
    if (!Number.isInteger(kk) || kk < 0 || kk > 255) {
      throw new TypeError('kk must be an 8-bit unsigned integer')
    }
    this.v[x] = kk
  }

  get V(): Uint8Array { return this.v }
  get I(): number { return this.i }
  get PC(): number { return this.pc }
  get SP(): number { return this.sp }
}
