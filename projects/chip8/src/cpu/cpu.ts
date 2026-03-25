import { IMemory, Memory } from '../memory'
import { Display, IDisplay } from '../display'
import { IKeyboard, Keyboard } from '../keyboard'
import { ICPU } from './icpu'

export class CPU implements ICPU {
  readonly v: Uint8Array
  i: number
  pc: number
  sp: number
  readonly stack: Uint16Array
  delay: number
  sound: number

  constructor(
    private readonly memory: IMemory,
    private readonly display: IDisplay,
    private readonly keyboard: IKeyboard
  ) {
    this.v = new Uint8Array(16)
    this.i = 0
    this.pc = 0x200
    this.sp = 0
    this.stack = new Uint16Array(16)
    this.delay = 0
    this.sound = 0
  }

  reset(): void {
    this.v.fill(0)
    this.i = 0
    this.pc = 0x200
    this.sp = 0
    this.stack.fill(0)
    this.delay = 0
    this.sound = 0
  }

  fetch(): number {
    const hi = this.memory.read(this.pc)
    const lo = this.memory.read(this.pc + 1)
    this.pc += 2
    return (hi << 8) | lo
  }

  decode(opcode: number): number {
    return opcode
  }

  execute(opcode: number): void {
    if (!Number.isInteger(opcode) || opcode < 0 || opcode > 0xFFFF) {
      throw new RangeError('Opcode must be a 16-bit unsigned integer')
    }

    const nnn = opcode & 0x0FFF
    const nn = opcode & 0x00FF
    const n = opcode & 0x000F
    const x = (opcode & 0x0F00) >> 8
    const y = (opcode & 0x00F0) >> 4

    switch (opcode & 0xF000) {
      case 0x0000:
        switch (nn) {
          case 0x00E0:
            this.display.clear()
            break
          case 0x00EE:
            this.pc = this.popStack()
            break
        }
        break
      case 0x1000:
        this.pc = nnn
        break
      case 0x2000:
        this.pushStack(this.pc)
        this.pc = nnn
        break
      case 0x3000:
        if (this.v[x] === nn) this.pc += 2
        break
      case 0x4000:
        if (this.v[x] !== nn) this.pc += 2
        break
      case 0x5000:
        if (this.v[x] === this.v[y]) this.pc += 2
        break
      case 0x6000:
        this.v[x] = nn
        break
      case 0x7000:
        this.v[x] += nn
        break
      case 0x8000:
        switch (n) {
          case 0x0:
            this.v[x] = this.v[y]
            break
          case 0x1:
            this.v[x] |= this.v[y]
            break
          case 0x2:
            this.v[x] &= this.v[y]
            break
          case 0x3:
            this.v[x] ^= this.v[y]
            break
          case 0x4:
            const sum = this.v[x] + this.v[y]
            this.v[0xF] = sum > 0xFF ? 1 : 0
            this.v[x] = sum & 0xFF
            break
          case 0x5:
            this.v[0xF] = this.v[x] >= this.v[y] ? 1 : 0
            this.v[x] -= this.v[y]
            break
          case 0x6:
            this.v[0xF] = this.v[x] & 1
            this.v[x] >>= 1
            break
          case 0x7:
            this.v[0xF] = this.v[y] >= this.v[x] ? 1 : 0
            this.v[x] = this.v[y] - this.v[x]
            break
          case 0xE:
            this.v[0xF] = (this.v[x] & 0x80) >> 7
            this.v[x] <<= 1
            break
        }
        break
      case 0x9000:
        if (this.v[x] !== this.v[y]) this.pc += 2
        break
      case 0xA000:
        this.i = nnn
        break
      case 0xB000:
        this.pc = nnn + this.v[0]
        break
      case 0xC000:
        this.v[x] = Math.floor(Math.random() * 0x100) & nn
        break
      case 0xD000:
        const vx = this.v[x] % this.display.width
        const vy = this.v[y] % this.display.height
        this.v[0xF] = 0
        for (let row = 0; row < n; row++) {
          const sprite = this.memory.read(this.i + row)
          for (let col = 0; col < 8; col++) {
            if ((sprite & (0x80 >> col)) !== 0) {
              const px = vx + col
              const py = vy + row
              if (px < this.display.width && py < this.display.height) {
                const old = this.display.getPixel(px, py)
                this.display.setPixel(px, py, !old)
                if (old) this.v[0xF] = 1
              }
            }
          }
        }
        break
      case 0xE000:
        switch (nn) {
          case 0x9E:
            if (this.keyboard.isPressed(this.v[x])) this.pc += 2
            break
          case 0xA1:
            if (!this.keyboard.isPressed(this.v[x])) this.pc += 2
            break
        }
        break
      case 0xF000:
        switch (nn) {
          case 0x07:
            this.v[x] = this.delay
            break
          case 0x0A:
            const key = this.keyboard.getPressed()[0]
            if (key !== undefined) {
              this.v[x] = key
            } else {
              this.pc -= 2
            }
            break
          case 0x15:
            this.delay = this.v[x]
            break
          case 0x18:
            this.sound = this.v[x]
            break
          case 0x1E:
            this.i += this.v[x]
            break
          case 0x29:
            this.i = 0x50 + (this.v[x] & 0x0F) * 5
            break
          case 0x33:
            const val = this.v[x]
            this.memory.write(this.i, Math.floor(val / 100))
            this.memory.write(this.i + 1, Math.floor((val % 100) / 10))
            this.memory.write(this.i + 2, val % 10)
            break
          case 0x55:
            for (let r = 0; r <= x; r++) {
              this.memory.write(this.i + r, this.v[r])
            }
            break
          case 0x65:
            for (let r = 0; r <= x; r++) {
              this.v[r] = this.memory.read(this.i + r)
            }
            break
        }
        break
    }
  }

  cycle(): void {
    const opcode = this.fetch()
    this.execute(opcode)
  }

  updateTimers(): void {
    if (this.delay > 0) this.delay--
    if (this.sound > 0) this.sound--
  }

  pushStack(addr: number): void {
    if (!Number.isInteger(addr) || addr < 0 || addr > 0xFFFF) {
      throw new RangeError('Address must be a 16-bit unsigned integer')
    }
    if (this.sp >= this.stack.length) {
      throw new RangeError('Stack overflow')
    }
    this.stack[this.sp] = addr
    this.sp++
  }

  popStack(): number {
    if (this.sp <= 0) {
      throw new RangeError('Stack underflow')
    }
    this.sp--
    return this.stack[this.sp]
  }
}
