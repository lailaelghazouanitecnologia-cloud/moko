export class DelayTimer {
  private value: number = 0;

  set(val: number): void {
    this.value = Math.max(0, Math.min(255, val));
  }

  tick(): void {
    if (this.value > 0) {
      this.value--;
    }
  }

  get(): number {
    return this.value;
  }

  isActive(): boolean {
    return this.value > 0;
  }
}
