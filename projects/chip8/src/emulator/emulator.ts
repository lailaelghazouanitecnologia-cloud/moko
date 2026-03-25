import { CPU, ICPU } from '../cpu';
import { Memory, IMemory } from '../memory';
import { IEmulator } from './iemulator';
import { Display } from '../display';
import { Keyboard } from '../keyboard';

export class Emulator implements IEmulator {
  private readonly cpu: CPU;
  private readonly memory: Memory;
  private running: boolean;
  private cycles: number;

  constructor() {
    const display = new Display();
    const keyboard = new Keyboard();
    this.memory = new Memory();
    this.cpu = new CPU(this.memory as unknown as IMemory, display, keyboard);
    this.running = false;
    this.cycles = 0;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get romLoaded(): boolean {
    return false;
  }

  get tickCount(): number {
    return this.cycles;
  }

  async loadRom(rom: Uint8Array): Promise<void> {
    if (rom.length === 0) {
      throw new RangeError('ROM cannot be empty');
    }
    this.memory.loadRom(rom);
  }

  start(): void {
    this.cpu.reset();
    this.memory.reset();
    this.cycles = 0;
  }

  reset(): void {
    this.cpu.reset();
    this.cycles = 0;
  }

  pause(): void {
    this.running = false;
  }

  tick(): void {
    const instruction = this.cpu.fetch();
    const decoded = this.cpu.decode(instruction);
    this.cpu.execute(decoded);
    this.cpu.updateTimers();
    this.cycles++;
  }
}
