import { Joypad } from './joypad';

export class Controller {
  private joypads: Joypad[] = [new Joypad(), new Joypad()];
  private joypad1: Joypad = this.joypads[0];
  private joypad2: Joypad = this.joypads[1];

  cpuRead(address: number): number {
    if (address === 0x4016) {
      return this.joypad1.read();
    } else if (address === 0x4017) {
      return this.joypad2.read();
    }
    return 0;
  }

  cpuWrite(address: number, value: number): void {
    if (address === 0x4016) {
      this.handleStrobe(value);
    }
  }

  connectJoypad(index: number, joypad: Joypad): void {
    if (index >= 0 && index < 4) {
      if (index < this.joypads.length) {
        this.joypads[index] = joypad;
      } else {
        this.joypads.push(joypad);
      }
      if (index === 0) this.joypad1 = joypad;
      if (index === 1) this.joypad2 = joypad;
    }
  }

  disconnectJoypad(index: number): void {
    if (index >= 0 && index < this.joypads.length) {
      const empty = new Joypad();
      this.joypads[index] = empty;
      if (index === 0) this.joypad1 = empty;
      if (index === 1) this.joypad2 = empty;
    }
  }

  update(): void {
    for (const joypad of this.joypads) {
      joypad.update();
    }
  }

  reset(): void {
    for (const joypad of this.joypads) {
      joypad.reset();
    }
  }

  getJoypad(index: number): Joypad {
    return index >= 0 && index < this.joypads.length ? this.joypads[index] : new Joypad();
  }

  isConnected(index: number): boolean {
    return index >= 0 && index < this.joypads.length && this.joypads[index] !== undefined;
  }

  handleStrobe(value: number): void {
    const strobe = (value & 0x01) !== 0;
    for (const joypad of this.joypads) {
      joypad.setStrobe(strobe);
    }
  }

  saveState(): object {
    const state: any = { joypads: [] };
    for (const joypad of this.joypads) {
      state.joypads.push(joypad.saveState());
    }
    return state;
  }

  loadState(state: object): void {
    const s = state as any;
    if (s.joypads && Array.isArray(s.joypads)) {
      for (let i = 0; i < s.joypads.length && i < this.joypads.length; i++) {
        this.joypads[i].loadState(s.joypads[i]);
      }
    }
  }
}
