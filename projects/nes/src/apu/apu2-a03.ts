import { PulseChannel } from './pulse-channel';
import { TriangleChannel } from './triangle-channel';
import { NoiseChannel } from './noise-channel';
import { DMCChannel } from './dmc-channel';

export class APU2A03 {
  private pulse1: PulseChannel;
  private pulse2: PulseChannel;
  private triangle: TriangleChannel;
  private noise: NoiseChannel;
  private dmc: DMCChannel;
  private frameCounter: number;
  private frameCounterMode: number;
  private frameInterrupt: boolean;
  private cycle: number;
  private sampleRate: number;
  private bufferSize: number;
  private audioBuffer: Float32Array;
  private bufferIndex: number;

  constructor() {
    this.pulse1 = new PulseChannel();
    this.pulse2 = new PulseChannel();
    this.triangle = new TriangleChannel();
    this.noise = new NoiseChannel();
    this.dmc = new DMCChannel();
    this.frameCounter = 0;
    this.frameCounterMode = 0;
    this.frameInterrupt = false;
    this.cycle = 0;
    this.sampleRate = 44100;
    this.bufferSize = 4096;
    this.audioBuffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  cpuRead(address: number): number {
    switch (address) {
      case 0x4000: case 0x4001: case 0x4002: case 0x4003:
        return this.pulse1.readRegister(address - 0x4000);
      case 0x4004: case 0x4005: case 0x4006: case 0x4007:
        return this.pulse2.readRegister(address - 0x4004);
      case 0x4008: case 0x4009: case 0x400A: case 0x400B:
        return this.triangle.readRegister(address - 0x4008);
      case 0x400C: case 0x400D: case 0x400E: case 0x400F:
        return this.noise.readRegister(address - 0x400C);
      case 0x4010: case 0x4011: case 0x4012: case 0x4013:
        return this.dmc.readRegister(address - 0x4010);
      case 0x4015:
        let status = 0;
        if (this.pulse1.isEnabled()) status |= 0x01;
        if (this.pulse2.isEnabled()) status |= 0x02;
        if (this.triangle.isEnabled()) status |= 0x04;
        if (this.noise.isEnabled()) status |= 0x08;
        if (this.dmc.isEnabled()) status |= 0x10;
        if (this.frameInterrupt) status |= 0x40;
        if (this.dmc.hasInterrupt()) status |= 0x80;
        this.frameInterrupt = false;
        return status;
      case 0x4017:
        return 0;
      default:
        return 0;
    }
  }

  cpuWrite(address: number, data: number): void {
    switch (address) {
      case 0x4000: case 0x4001: case 0x4002: case 0x4003:
        this.pulse1.writeRegister(address - 0x4000, data);
        break;
      case 0x4004: case 0x4005: case 0x4006: case 0x4007:
        this.pulse2.writeRegister(address - 0x4004, data);
        break;
      case 0x4008: case 0x4009: case 0x400A: case 0x400B:
        this.triangle.writeRegister(address - 0x4008, data);
        break;
      case 0x400C: case 0x400D: case 0x400E: case 0x400F:
        this.noise.writeRegister(address - 0x400C, data);
        break;
      case 0x4010: case 0x4011: case 0x4012: case 0x4013:
        this.dmc.writeRegister(address - 0x4010, data);
        break;
      case 0x4015:
        this.enableChannel(0, (data & 0x01) !== 0);
        this.enableChannel(1, (data & 0x02) !== 0);
        this.enableChannel(2, (data & 0x04) !== 0);
        this.enableChannel(3, (data & 0x08) !== 0);
        this.enableChannel(4, (data & 0x10) !== 0);
        break;
      case 0x4017:
        this.frameCounterMode = (data >> 6) & 0x01;
        this.frameInterrupt = (data & 0x40) === 0;
        this.frameCounter = 0;
        break;
    }
  }

  step(): void {
    this.cycle++;
    
    const cpuCyclesPerSample = 1789773 / this.sampleRate;
    if (this.cycle >= cpuCyclesPerSample) {
      this.cycle = 0;
      const sample = this.generateSample();
      this.audioBuffer[this.bufferIndex] = sample;
      this.bufferIndex = (this.bufferIndex + 1) % this.bufferSize;
    }

    this.pulse1.step();
    this.pulse2.step();
    this.triangle.step();
    this.noise.step();
    this.dmc.step();

    if (this.cycle % 7457 === 0) {
      this.clockFrameCounter();
    }
  }

  clockFrameCounter(): void {
    this.frameCounter++;
    
    const frameRate = this.frameCounterMode === 0 ? 4 : 5;
    if (this.frameCounter >= frameRate) {
      this.frameCounter = 0;
      if (this.frameInterrupt && this.frameCounterMode === 0) {
        this.triggerFrameInterrupt();
      }
    }

    this.pulse1.clockEnvelope();
    this.pulse2.clockEnvelope();
    this.triangle.clockLinearCounter();
    this.noise.clockEnvelope();
  }

  generateSample(): number {
    const pulseOut = this.pulse1.getOutput() + this.pulse2.getOutput();
    const tndOut = this.triangle.getOutput() * 0.25 + this.noise.getOutput() * 0.5 + this.dmc.getOutput() * 0.75;
    
    const pulseTable = [0, 95.88 / (8128 + 100), 95.88 / (8128 + 100), 95.88 / (8128 + 100)];
    const tndTable = [0, 159.79 / (8227 + 100), 159.79 / (8227 + 100), 159.79 / (8227 + 100)];
    
    const pulseValue = pulseOut > 0 ? 95.88 / (8128 / pulseOut + 100) : 0;
    const tndValue = tndOut > 0 ? 159.79 / (8227 / tndOut + 100) : 0;
    
    return (pulseValue + tndValue) / 2 - 0.5;
  }

  enableChannel(channel: number, enable: boolean): void {
    switch (channel) {
      case 0: this.pulse1.setEnabled(enable); break;
      case 1: this.pulse2.setEnabled(enable); break;
      case 2: this.triangle.setEnabled(enable); break;
      case 3: this.noise.setEnabled(enable); break;
      case 4: this.dmc.setEnabled(enable); break;
    }
  }

  setFrameCounterMode(mode: number): void {
    this.frameCounterMode = mode & 0x01;
    this.frameCounter = 0;
  }

  getChannelOutput(channel: number): number {
    switch (channel) {
      case 0: return this.pulse1.getOutput();
      case 1: return this.pulse2.getOutput();
      case 2: return this.triangle.getOutput();
      case 3: return this.noise.getOutput();
      case 4: return this.dmc.getOutput();
      default: return 0;
    }
  }

  reset(): void {
    this.pulse1.reset();
    this.pulse2.reset();
    this.triangle.reset();
    this.noise.reset();
    this.dmc.reset();
    this.frameCounter = 0;
    this.frameCounterMode = 0;
    this.frameInterrupt = false;
    this.cycle = 0;
    this.bufferIndex = 0;
    this.audioBuffer.fill(0);
  }

  saveState(): Uint8Array {
    const state = new Uint8Array(256);
    let offset = 0;
    
    const channels = [this.pulse1, this.pulse2, this.triangle, this.noise, this.dmc];
    for (const channel of channels) {
      const channelState = channel.saveState();
      state.set(channelState, offset);
      offset += channelState.length;
    }
    
    const view = new DataView(state.buffer);
    view.setUint32(offset, this.frameCounter);
    view.setUint8(offset + 4, this.frameCounterMode);
    view.setUint8(offset + 5, this.frameInterrupt ? 1 : 0);
    view.setUint32(offset + 6, this.cycle);
    view.setUint32(offset + 10, this.bufferIndex);
    
    return state;
  }

  loadState(state: Uint8Array): void {
    let offset = 0;
    
    const channels = [this.pulse1, this.pulse2, this.triangle, this.noise, this.dmc];
    for (const channel of channels) {
      const channelStateSize = 32;
      const channelState = state.slice(offset, offset + channelStateSize);
      channel.loadState(channelState);
      offset += channelStateSize;
    }
    
    const view = new DataView(state.buffer);
    this.frameCounter = view.getUint32(offset);
    this.frameCounterMode = view.getUint8(offset + 4);
    this.frameInterrupt = view.getUint8(offset + 5) !== 0;
    this.cycle = view.getUint32(offset + 6);
    this.bufferIndex = view.getUint32(offset + 10);
  }

  setSampleRate(rate: number): void {
    this.sampleRate = rate;
    this.cycle = 0;
  }

  getAudioBuffer(): Float32Array {
    return this.audioBuffer;
  }

  clearAudioBuffer(): void {
    this.bufferIndex = 0;
    this.audioBuffer.fill(0);
  }

  triggerFrameInterrupt(): void {
    this.frameInterrupt = true;
  }
}
