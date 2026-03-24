import { Registers } from './registers';
import { Stack } from './stack';
import { Opcode } from './opcode';
import { CpuState } from './cpu-state';

export class Cpu {
  private memory: Uint8Array = new Uint8Array(4096);
  private registers: Registers = new Registers();
  private stack: Stack = new Stack();
  private pc: number = 0x200;
  private i: number = 0;
  private delayTimer: number = 0;
  private soundTimer: number = 0;
  private halted: boolean = false;

  reset(): void {
    this.memory = new Uint8Array(4096);
    this.registers = new Registers();
    this.stack = new Stack();
    this.pc = 0x200;
    this.i = 0;
    this.delayTimer = 0;
    this.soundTimer = 0;
    this.halted = false;
  }

  cycle(): void {
    if (this.halted) return;

    const opcode = this.fetch();
    const decoded = this.decode(opcode);
    this.execute(decoded);
    this.updateTimers();
  }

  fetch(): number {
    const high = this.memory[this.pc] << 8;
    const low = this.memory[this.pc + 1];
    this.pc += 2;
    return high | low;
  }

  decode(opcode: number): Opcode {
    const nibbles = [
      (opcode >> 12) & 0xF,
      (opcode >> 8) & 0xF,
      (opcode >> 4) & 0xF,
      opcode & 0xF
    ];

    const kk = (nibbles[2] << 4) | nibbles[3];
    const nnn = ((nibbles[1] << 8) | (nibbles[2] << 4) | nibbles[3]) & 0xFFF;

    return new Opcode(opcode, nibbles, kk, nnn);
  }

  execute(opcode: Opcode): void {
    const [n1, n2, n3, n4] = opcode.nibbles;

    switch (n1) {
      case 0x0:
        if (opcode.opcode === 0x00E0) {
          // CLS
        } else if (opcode.opcode === 0x00EE) {
          this.return();
        } else {
          // SYS nnn (ignored)
        }
        break;

      case 0x1:
        this.jump(opcode.nnn);
        break;

      case 0x2:
        this.call(opcode.nnn);
        break;

      case 0x3:
        if (this.registers.v[n2] === opcode.kk) {
          this.skipNextInstruction();
        }
        break;

      case 0x4:
        if (this.registers.v[n2] !== opcode.kk) {
          this.skipNextInstruction();
        }
        break;

      case 0x5:
        if (n4 === 0) {
          if (this.registers.v[n2] === this.registers.v[n3]) {
            this.skipNextInstruction();
          }
        }
        break;

      case 0x6:
        this.registers.v[n2] = opcode.kk;
        break;

      case 0x7:
        this.registers.v[n2] = (this.registers.v[n2] + opcode.kk) & 0xFF;
        break;

      case 0x8:
        switch (n4) {
          case 0x0:
            this.registers.v[n2] = this.registers.v[n3];
            break;
          case 0x1:
            this.registers.v[n2] |= this.registers.v[n3];
            break;
          case 0x2:
            this.registers.v[n2] &= this.registers.v[n3];
            break;
          case 0x3:
            this.registers.v[n2] ^= this.registers.v[n3];
            break;
          case 0x4:
            const sum = this.registers.v[n2] + this.registers.v[n3];
            this.registers.v[0xF] = sum > 0xFF ? 1 : 0;
            this.registers.v[n2] = sum & 0xFF;
            break;
          case 0x5:
            this.registers.v[0xF] = this.registers.v[n2] >= this.registers.v[n3] ? 1 : 0;
            this.registers.v[n2] = (this.registers.v[n2] - this.registers.v[n3]) & 0xFF;
            break;
          case 0x6:
            this.registers.v[0xF] = this.registers.v[n2] & 0x1;
            this.registers.v[n2] >>>= 1;
            break;
          case 0x7:
            this.registers.v[0xF] = this.registers.v[n3] >= this.registers.v[n2] ? 1 : 0;
            this.registers.v[n2] = (this.registers.v[n3] - this.registers.v[n2]) & 0xFF;
            break;
          case 0xE:
            this.registers.v[0xF] = (this.registers.v[n2] >> 7) & 0x1;
            this.registers.v[n2] = (this.registers.v[n2] << 1) & 0xFF;
            break;
        }
        break;

      case 0x9:
        if (n4 === 0) {
          if (this.registers.v[n2] !== this.registers.v[n3]) {
            this.skipNextInstruction();
          }
        }
        break;

      case 0xA:
        this.i = opcode.nnn;
        break;

      case 0xB:
        this.pc = opcode.nnn + this.registers.v[0];
        break;

      case 0xC:
        this.registers.v[n2] = Math.floor(Math.random() * 0x100) & opcode.kk;
        break;

      case 0xD:
        // DRW Vx, Vy, nibble
        this.registers.v[0xF] = 0;
        for (let row = 0; row < n4; row++) {
          const sprite = this.memory[this.i + row];
          for (let col = 0; col < 8; col++) {
            if ((sprite & (0x80 >> col)) !== 0) {
              this.registers.v[0xF] = 1;
            }
          }
        }
        break;

      case 0xE:
        if (opcode.kk === 0x9E) {
          // SKP Vx
        } else if (opcode.kk === 0xA1) {
          // SKNP Vx
        }
        break;

      case 0xF:
        switch (opcode.kk) {
          case 0x07:
            this.registers.v[n2] = this.delayTimer;
            break;
          case 0x0A:
            // LD Vx, K
            break;
          case 0x15:
            this.delayTimer = this.registers.v[n2];
            break;
          case 0x18:
            this.soundTimer = this.registers.v[n2];
            break;
          case 0x1E:
            this.i = (this.i + this.registers.v[n2]) & 0xFFF;
            break;
          case 0x29:
            // LD F, Vx
            break;
          case 0x33:
            const val = this.registers.v[n2];
            this.memory[this.i] = Math.floor(val / 100);
            this.memory[this.i + 1] = Math.floor((val % 100) / 10);
            this.memory[this.i + 2] = val % 10;
            break;
          case 0x55:
            for (let r = 0; r <= n2; r++) {
              this.memory[this.i + r] = this.registers.v[r];
            }
            break;
          case 0x65:
            for (let r = 0; r <= n2; r++) {
              this.registers.v[r] = this.memory[this.i + r];
            }
            break;
        }
        break;
    }
  }

  updateTimers(): void {
    if (this.delayTimer > 0) this.delayTimer--;
    if (this.soundTimer > 0) this.soundTimer--;
  }

  getOpcodeName(opcode: number): string {
    const [n1, n2, n3, n4] = [
      (opcode >> 12) & 0xF,
      (opcode >> 8) & 0xF,
      (opcode >> 4) & 0xF,
      opcode & 0xF
    ];
    const kk = (n3 << 4) | n4;
    const nnn = ((n2 << 8) | (n3 << 4) | n4) & 0xFFF;

    switch (n1) {
      case 0x0:
        if (opcode === 0x00E0) return 'CLS';
        if (opcode === 0x00EE) return 'RET';
        return `SYS ${nnn.toString(16).toUpperCase().padStart(3, '0')}`;
      case 0x1: return `JP ${nnn.toString(16).toUpperCase().padStart(3, '0')}`;
      case 0x2: return `CALL ${nnn.toString(16).toUpperCase().padStart(3, '0')}`;
      case 0x3: return `SE V${n2.toString(16).toUpperCase()}, ${kk}`;
      case 0x4: return `SNE V${n2.toString(16).toUpperCase()}, ${kk}`;
      case 0x5: return `SE V${n2.toString(16).toUpperCase()}, V${n3.toString(16).toUpperCase()}`;
      case 0x6: return `LD V${n2.toString(16).toUpperCase()}, ${kk}`;
      case 0x7: return `ADD V${n2.toString(16).toUpperCase()}, ${kk}`;
      case 0x8:
        const ops = ['LD', 'OR', 'AND', 'XOR', 'ADD', 'SUB', 'SHR', 'SUBN', 'SHL'];
        return `${ops[n4]} V${n2.toString(16).toUpperCase()}, V${n3.toString(16).toUpperCase()}`;
      case 0x9: return `SNE V${n2.toString(16).toUpperCase()}, V${n3.toString(16).toUpperCase()}`;
      case 0xA: return `LD I, ${nnn.toString(16).toUpperCase().padStart(3, '0')}`;
      case 0xB: return `JP V0, ${nnn.toString(16).toUpperCase().padStart(3, '0')}`;
      case 0xC: return `RND V${n2.toString(16).toUpperCase()}, ${kk}`;
      case 0xD: return `DRW V${n2.toString(16).toUpperCase()}, V${n3.toString(16).toUpperCase()}, ${n4}`;
      case 0xE:
        if (kk === 0x9E) return `SKP V${n2.toString(16).toUpperCase()}`;
        if (kk === 0xA1) return `SKNP V${n2.toString(16).toUpperCase()}`;
        break;
      case 0xF:
        const fOps: { [key: number]: string } = {
          0x07: `LD V${n2.toString(16).toUpperCase()}, DT`,
          0x0A: `LD V${n2.toString(16).toUpperCase()}, K`,
          0x15: `LD DT, V${n2.toString(16).toUpperCase()}`,
          0x18: `LD ST, V${n2.toString(16).toUpperCase()}`,
          0x1E: `ADD I, V${n2.toString(16).toUpperCase()}`,
          0x29: `LD F, V${n2.toString(16).toUpperCase()}`,
          0x33: `LD B, V${n2.toString(16).toUpperCase()}`,
          0x55: `LD [I], V${n2.toString(16).toUpperCase()}`,
          0x65: `LD V${n2.toString(16).toUpperCase()}, [I]`
        };
        return fOps[kk] || `UNKNOWN`;
    }
    return 'UNKNOWN';
  }

  skipNextInstruction(): void {
    this.pc += 2;
  }

  jump(address: number): void {
    this.pc = address;
  }

  call(address: number): void {
    this.stack.push(this.pc);
    this.pc = address;
  }

  return(): void {
    this.pc = this.stack.pop();
  }

  loadRom(data: Uint8Array): void {
    for (let i = 0; i < data.length && i + 0x200 < 4096; i++) {
      this.memory[0x200 + i] = data[i];
    }
  }

  isHalted(): boolean {
    return this.halted;
  }

  getState(): CpuState {
    return {
      pc: this.pc,
      i: this.i,
      delayTimer: this.delayTimer,
      soundTimer: this.soundTimer,
      halted: this.halted,
      registers: this.registers.getState(),
      stack: this.stack.getState()
    };
  }
}
