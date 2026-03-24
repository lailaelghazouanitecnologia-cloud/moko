export class SoundTimer {
  private value: number = 0;
  private beepCallback: (() => void) | null = null;

  set(val: number): void {
    this.value = Math.max(0, Math.min(255, val));
  }

  tick(): void {
    if (this.value > 0) {
      this.value--;
      if (this.beepCallback) {
        this.beepCallback();
      }
    }
  }

  get(): number {
    return this.value;
  }

  isBeeping(): boolean {
    return this.value > 0;
  }

  onBeep(cb: () => void): void {
    this.beepCallback = cb;
  }
}
