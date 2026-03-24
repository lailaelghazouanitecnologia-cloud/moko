import { Flags } from '../cpu';

interface TraceStats {
  instructionCount: number;
  startTime: number;
  currentTime: number;
  duration: number;
  averageInstructionsPerSecond: number;
}

export class Tracer {
  private isEnabled: boolean = false;
  private traceBuffer: string[] = [];
  private maxLines: number = 10000;
  private instructionCount: number = 0;
  private startTime: number = 0;

  enable(enabled: boolean): void {
    this.isEnabled = enabled;
    if (enabled && this.startTime === 0) {
      this.startTime = Date.now();
    }
  }

  traceInstruction(pc: number, opcode: number, operand: string): void {
    if (!this.isEnabled) return;
    
    const timestamp = Date.now() - this.startTime;
    const hexPc = pc.toString(16).padStart(4, '0').toUpperCase();
    const hexOpcode = opcode.toString(16).padStart(2, '0').toUpperCase();
    
    const line = `${timestamp.toString().padStart(8, '0')}  ${hexPc}  ${hexOpcode} ${operand}`;
    this.traceBuffer.push(line);
    this.instructionCount++;
    
    if (this.traceBuffer.length > this.maxLines) {
      this.traceBuffer.shift();
    }
  }

  traceMemory(type: string, address: number, value: number): void {
    if (!this.isEnabled) return;
    
    const timestamp = Date.now() - this.startTime;
    const hexAddress = address.toString(16).padStart(4, '0').toUpperCase();
    const hexValue = value.toString(16).padStart(2, '0').toUpperCase();
    
    const line = `${timestamp.toString().padStart(8, '0')}  MEM ${type} ${hexAddress} = ${hexValue}`;
    this.traceBuffer.push(line);
    
    if (this.traceBuffer.length > this.maxLines) {
      this.traceBuffer.shift();
    }
  }

  traceEvent(event: string, data: any): void {
    if (!this.isEnabled) return;
    
    const timestamp = Date.now() - this.startTime;
    const dataStr = data !== undefined ? JSON.stringify(data) : '';
    
    const line = `${timestamp.toString().padStart(8, '0')}  EVT ${event} ${dataStr}`;
    this.traceBuffer.push(line);
    
    if (this.traceBuffer.length > this.maxLines) {
      this.traceBuffer.shift();
    }
  }

  getTrace(): string[] {
    return [...this.traceBuffer];
  }

  clear(): void {
    this.traceBuffer = [];
    this.instructionCount = 0;
    this.startTime = this.isEnabled ? Date.now() : 0;
  }

  save(filename: string): void {
    const fs = require('fs');
    const content = this.traceBuffer.join('\n');
    fs.writeFileSync(filename, content);
  }

  getInstructionCount(): number {
    return this.instructionCount;
  }

  setMaxLines(max: number): void {
    this.maxLines = max;
    while (this.traceBuffer.length > this.maxLines) {
      this.traceBuffer.shift();
    }
  }

  formatInstruction(pc: number, opcode: number, a: number, x: number, y: number, flags: Flags): string {
    const hexPc = pc.toString(16).padStart(4, '0').toUpperCase();
    const hexOpcode = opcode.toString(16).padStart(2, '0').toUpperCase();
    const hexA = a.toString(16).padStart(2, '0').toUpperCase();
    const hexX = x.toString(16).padStart(2, '0').toUpperCase();
    const hexY = y.toString(16).padStart(2, '0').toUpperCase();
    
    const flagStr = 
      (flags & 0x80 ? 'N' : '-') +
      (flags & 0x40 ? 'V' : '-') +
      (flags & 0x20 ? 'U' : '-') +
      (flags & 0x10 ? 'B' : '-') +
      (flags & 0x08 ? 'D' : '-') +
      (flags & 0x04 ? 'I' : '-') +
      (flags & 0x02 ? 'Z' : '-') +
      (flags & 0x01 ? 'C' : '-');
    
    return `A:${hexA} X:${hexX} Y:${hexY} P:${flagStr}`;
  }

  traceInterrupt(type: string, pc: number, vector: number): void {
    if (!this.isEnabled) return;
    
    const timestamp = Date.now() - this.startTime;
    const hexPc = pc.toString(16).padStart(4, '0').toUpperCase();
    const hexVector = vector.toString(16).padStart(4, '0').toUpperCase();
    
    const line = `${timestamp.toString().padStart(8, '0')}  INT ${type} PC:${hexPc} Vector:${hexVector}`;
    this.traceBuffer.push(line);
    
    if (this.traceBuffer.length > this.maxLines) {
      this.traceBuffer.shift();
    }
  }

  traceDma(source: number, dest: number, length: number): void {
    if (!this.isEnabled) return;
    
    const timestamp = Date.now() - this.startTime;
    const hexSource = source.toString(16).padStart(4, '0').toUpperCase();
    const hexDest = dest.toString(16).padStart(4, '0').toUpperCase();
    
    const line = `${timestamp.toString().padStart(8, '0')}  DMA ${hexSource} -> ${hexDest} (${length} bytes)`;
    this.traceBuffer.push(line);
    
    if (this.traceBuffer.length > this.maxLines) {
      this.traceBuffer.shift();
    }
  }

  getStatistics(): TraceStats {
    const currentTime = Date.now();
    const duration = this.startTime > 0 ? currentTime - this.startTime : 0;
    const avgPerSecond = duration > 0 ? (this.instructionCount * 1000) / duration : 0;
    
    return {
      instructionCount: this.instructionCount,
      startTime: this.startTime,
      currentTime: currentTime,
      duration: duration,
      averageInstructionsPerSecond: avgPerSecond
    };
  }

  isEnabled(): boolean {
    return this.isEnabled;
  }
}
