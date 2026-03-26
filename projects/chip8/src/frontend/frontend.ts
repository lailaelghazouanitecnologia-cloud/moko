import { Cpu, ICpu } from '../cpu'
import { Display, IDisplay } from '../display'
import { ITimers, Timers } from '../timers'
import { IFrontend } from './ifrontend'
import { IMemory, Memory } from '../memory'
import { IInput, Input } from '../input'

export class Frontend implements IFrontend {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly audioCtx: AudioContext
  private oscillator: OscillatorNode | null = null
  private readonly gainNode: GainNode
  private isRunning = false
  private speed = 1
  private traceLog = false
  private cpu: ICpu | null = null
  private display: IDisplay | null = null
  private timers: ITimers | null = null
  private animationFrameId = 0
  private lastFrameTime = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')
    this.ctx = ctx
    this.audioCtx = new AudioContext()
    this.gainNode = this.audioCtx.createGain()
    this.gainNode.gain.value = 0.1
    this.gainNode.connect(this.audioCtx.destination)
    this.setupCanvas()
  }

  private setupCanvas(): void {
    this.canvas.width = 640
    this.canvas.height = 320
    this.ctx.imageSmoothingEnabled = false
  }

  draw_framebuffer(buffer: Uint8Array): void {
    if (buffer.length !== 256) {
      throw new RangeError('Expected buffer length to be 256 bytes for 64x32 1-bit display')
    }

    const imageData = this.ctx.createImageData(64, 32)
    const data = imageData.data
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 64; x++) {
        const byteIndex = (y * 64 + x) >> 3
        const bitIndex = 7 - (x & 7)
        const pixel = (buffer[byteIndex] >> bitIndex) & 1
        const color = pixel ? 255 : 0
        const idx = (y * 64 + x) * 4
        data[idx] = color
        data[idx + 1] = color
        data[idx + 2] = color
        data[idx + 3] = 255
      }
    }
    this.ctx.putImageData(imageData, 0, 0)
    this.ctx.drawImage(this.canvas, 0, 0, 64, 32, 0, 0, 640, 320)
  }

  play_beep(): void {
    if (this.oscillator) return
    this.oscillator = this.audioCtx.createOscillator()
    this.oscillator.type = 'square'
    this.oscillator.frequency.value = 440
    this.oscillator.connect(this.gainNode)
    this.oscillator.start()
  }

  stop_beep(): void {
    if (!this.oscillator) return
    this.oscillator.stop()
    this.oscillator = null
  }

  load_rom(data: Uint8Array): void {
    this.load_rom_data(data)
  }

  private load_rom_data(data: Uint8Array): void {
    if (data.length === 0) {
      throw new RangeError('ROM data cannot be empty')
    }

    const memory: IMemory = new Memory()
    const display: IDisplay = new Display()
    const timers = new Timers()
    const input: IInput = new Input()
    const cpu = new Cpu(memory, display, input, timers)
    cpu.ram.set(data, 0x200)
    this.cpu = cpu
    this.display = display
    this.timers = timers
  }

  run(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.lastFrameTime = performance.now()
    this.loop()
  }

  pause(): void {
    this.isRunning = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = 0
    }
  }

  reset(): void {
    this.pause()
    if (this.cpu) {
      this.cpu.PC = 0x200
      this.cpu.SP = 0
      this.cpu.I = 0
      this.cpu.V.fill(0)
      this.cpu.stack.fill(0)
      this.cpu.delay_timer = 0
      this.cpu.sound_timer = 0
      this.cpu.framebuffer.fill(0)
    }
    this.draw_framebuffer(new Uint8Array(64 * 32 / 8))
  }

  set_speed(mhz: number): void {
    this.speed = Math.max(1, Math.min(30, mhz))
  }

  private loop = (): void => {
    if (!this.isRunning) return
    const now = performance.now()
    const delta = now - this.lastFrameTime
    this.lastFrameTime = now

    const cyclesPerFrame = Math.floor((this.speed * 1000000 * delta) / 1000 / 60)
    if (this.cpu && this.timers) {
      for (let i = 0; i < cyclesPerFrame; i++) {
        const opcode = this.cpu.fetch()
        this.cpu.execute(opcode)
      }
      this.timers.tick()
      if (this.timers.getSound() > 0) {
        this.play_beep()
      } else {
        this.stop_beep()
      }
      if (this.display) {
        this.draw_framebuffer(this.display.get_framebuffer())
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop)
  }

  set_running(running: boolean): void {
    running ? this.run() : this.pause()
  }

  toggle_trace(enabled: boolean): void {
    this.traceLog = enabled
  }
}
