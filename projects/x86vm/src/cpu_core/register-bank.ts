private ax: number = 0;
  private bx: number = 0;
  private cx: number = 0;
  private dx: number = 0;
  private si: number = 0;
  private di: number = 0;
  private bp: number = 0;
  private sp: number = 0;

  getAX(): number {
    return this.ax;
  }

  setAX(value: number): void {
    this.ax = value & 0xFFFF;
  }

  getAH(): number {
    return (this.ax >> 8) & 0xFF;
  }

  setAH(value: number): void {
    this.ax = (this.ax & 0x00FF) | ((value & 0xFF) << 8);
  }

  getAL(): number {
    return this.ax & 0xFF;
  }

  setAL(value: number): void {
    this.ax = (this.ax & 0xFF00) | (value & 0xFF);
  }

  getRegister(reg: number): number {
    switch (reg) {
      case 0: return this.ax;
      case 1: return this.bx;
      case 2: return this.cx;
      case 3: return this.dx;
      case 4: return this.si;
      case 5: return this.di;
      case 6: return this.bp;
      case 7: return this.sp;
      default: return 0;
    }
  }

  setRegister(reg: number, value: number): void {
    const v = value & 0xFFFF;
    switch (reg) {
      case 0: this.ax = v; break;
      case 1: this.bx = v; break;
           case 2: this.cx = v; break;
      case 3: this.dx = v; break;
      case 4: this.si = v; break;
      case 5: this.di = v; break;
      case 6: this.bp = v; break;
      case 7: this.sp = v; break;
    }
  }

  push(value: number): void {
    this.sp = (this.sp - 2) & 0xFFFF;
  }

  pop(): number {
    const val = this.sp;
    this.sp = (this.sp + 2) & 0xFFFF;
    return val;
  }

  reset(): void {
    this.ax = 0;
    this.bx = 0;
    this.cx = 0;
    this.dx = 0;
    this.si = 0;
    this.di = 0;
    this.bp = 0;
    this.sp = 0;
  }
}
