import { IMemory, Memory } from '../memory'
import { Display, IDisplay } from '../display'
import { IInput, Input } from '../input'
import { ITimers, Timers } from '../timers'
import { ICpu } from './icpu'

export class Cpu implements ICpu {
  ram: Uint8Array
  framebuffer: Uint8Array
  V: Uint8Array
  I: number
  PC: number
  SP: number
  stack: Uint16Array
  delay_timer: number
  sound_timer: number
  keypad: Uint8Array

  private readonly memory: IMemory
  private readonly display: IDisplay
  private readonly input: IInput
  private readonly timers: ITimers

  constructor(
    memory: IMemory = new Memory(),
    display: IDisplay = new Display() as IDisplay,
    input: IInput = new Input(),
    timers: ITimers = new Timers()
  ) {
    this.memory = memory
    this.display = display
    this.input = input
    this.timers = timers

    this.ram = new Uint8Array(4096)
    this.framebuffer = new Uint8Array(512)
    this.V = new Uint8Array(16)
    this.I = 0
    this.PC = 0x200
    this.SP = 0
    this.stack = new Uint16Array(16)
    this.delay_timer = 0
    this.sound_timer = 0
    this.keypad = this.input.keypad
  }

  fetch(): number {
    if (this.PC < 0 || this.PC >= this.ram.length - 1) {
      throw new RangeError('PC out of bounds')
    }
    const high = this.ram[this.PC] << 8
    const low = this.ram[this.PC + 1]
    this.PC += 2
    return high | low
  }

  decode(opcode: number): { nnn: number; n: number; x: number; y: number; kk: number } {
    const nnn = opcode & 0x0FFF
    const n = opcode & 0x000F
    const x = (opcode & 0x0F00) >> 8
    const y = (opcode & 0x00F0) >> 4
    const kk = opcode & 0x00FF
    return { nnn, n, x, y, kk }
  }

  execute(opcode: number): void {
    const { nnn, n, x, y, kk } = this.decode(opcode)

    switch (opcode & 0xF000) {
      case 0x0000:
        switch (opcode & 0x00FF) {
          case 0x00E0:
            this.opcode_00E0()
            break
          case 0x00EE:
            this.opcode_00EE()
            break
          default:
            break
        }
        break
      case 0x1000:
        this.opcode_1NNN(nnn)
        break
      case 0x2000:
        this.opcode_2NNN(nnn)
        break
      case 0x3000:
        this.opcode_3XKK(x, kk)
        break
      case 0x4000:
        this.opcode_4XKK(x, kk)
        break
      case 0x5000:
        if ((opcode & 0x000F) === 0) {
          this.opcode_5XY0(x, y)
        }
        break
      case 0x6000:
        this.V[x] = kk
        break
      case 0x7000:
        this.V[x] = (this.V[x] + kk) & 0xFF
        break
      case 0x8000:
        switch (opcode & 0x000F) {
          case 0x0000:
            this.V[x] = this.V[y]
            break
          case 0x0001:
            this.V[x] |= this.V[y]
            break
          case 0x0002:
            this.V[x] &= this.V[y]
            break
          case 0x0003:
            this.V[x] ^= this.V[y]
            break
          case 0x0004:
            const sum = this.V[x] + this.V[y]
            this.V[0xF] = sum > 0xFF ? 1 : 0
            this.V[x] = sum & 0xFF
            break
          case 0x0005:
            this.V[0xF] = this.V[x] >= this.V[y] ? 1 : 0
            this.V[x] = (this.V[x] - this.V[y]) & 0xFF
            break
          case 0x0006:
            this.V[0xF] = this.V[x] & 0x01
            this.V[x] >>= 1
            break
          case 0x0007:
            this.V[0xF] = this.V[y] >= this.V[x] ? 1 : 0
            this.V[x] = (this.V[y] - this.V[x]) & 0xFF
            break
          case 0x000E:
            this.V[0xF] = (this.V[x] & 0x80) >> 7
            this.V[x] = (this.V[x] << 1) & 0xFF
            break
        }
        break
      case 0x9000:
        if ((opcode & 0x000F) === 0) {
          if (this.V[x] !== this.V[y]) {
            this.PC += 2
          }
        }
        break
      case 0xA000:
        this.I = nnn
        break
      case 0xB000:
        this.PC = nnn + this.V[0]
        break
      case 0xC000:
        this.V[x] = Math.floor(Math.random() * 0x100) & kk
        break
      case 0xD000:
        {
          const height = n
          let collision = 0
          for (let row = 0; row < height; row++) {
            const spriteByte = this.ram[this.I + row]
            for (let col = 0; col < 8; col++) {
              const pixel = (spriteByte >> (7 - col)) & 1
              if (pixel === 1) {
                const xCoord = (this.V[x] + col) % 64
                const yCoord = (this.V[y] + row) % 32
                const current = this.display.get_pixel(xCoord, yCoord)
                if (current === 1) collision = 1
                this.display.set_pixel(xCoord, yCoord, current ^ 1)
              }
            }
          }
          this.V[0xF] = collision
        }
        break
      case 0xE000:
        switch (kk) {
          case 0x9E:
            if (this.keypad[this.V[x]] === 1) {
              this.PC += 2
            }
            break
          case 0xA1:
            if (this.keypad[this.V[x]] === 0) {
              this.PC += 2
            }
            break
        }
        break
      case 0xF000:
        switch (kk) {
          case 0x07:
            this.V[x] = this.delay_timer
            break
          case 0x0A:
            {
              let keyPressed = false
              for (let i = 0; i < 16; i++) {
                if (this.keypad[i] === 1) {
                  this.V[x] = i
                  keyPressed = true
                  break
                }
              }
              if (!keyPressed) {
                this.PC -= 2
              }
            }
            break
          case 0x15:
            this.delay_timer = this.V[x]
            break
          case 0x18:
            this.sound_timer = this.V[x]
            break
          case 0x1E:
            this.I = (this.I + this.V[x]) & 0xFFF
            break
          case 0x29:
            this.I = this.V[x] * 5
            break
          case 0x33:
            {
              const value = this.V[x]
              this.ram[this.I] = Math.floor(value / 100)
              this.ram[this.I + 1] = Math.floor((value % 100) / 10)
              this.ram[this.I + 2] = value % 10
            }
            break
          case 0x55:
            for (let i = 0; i <= x; i++) {
              this.ram[this.I + i] = this.V[i]
            }
            break
          case 0x65:
            for (let i = 0; i <= x; i++) {
              this.V[i] = this.ram[this.I + i]
            }
            break
        }
        break
    }
  }

  opcode_00E0(): void {
    this.display.clear()
  }

  opcode_00EE(): void {
    this.SP--
    this.PC = this.stack[this.SP]
  }

  opcode_1NNN(nnn: number): void {
    this.PC = nnn
  }

  opcode_2NNN(nnn: number): void {
    this.stack[this.SP] = this.PC
    this.SP++
    this.PC = nnn
  }

  opcode_3XKK(x: number, kk: number): void {
    if (this.V[x] === kk) {
      this.PC += 2
    }
  }

  opcode_4XKK(x: number, kk: number): void {
    if (this.V[x] !== kk) {
      this.PC += 2
    }
  }

  opcode_5XY0(x: number, y: number): void {
    if (this.V[x] === this.V[y]) {
      this.PC += 2
    }
  }
}
