export class DelayTimer {
    private value: number = 0;
    private lastUpdate: number = 0;

    set(val: number): void {
        this.value = Math.max(0, Math.min(255, val));
    }

    get(): number {
        return this.value;
    }

    tick(now: number): void {
        if (this.value > 0 && now - this.lastUpdate >= 16.666666666666668) {
            this.value--;
            this.lastUpdate = now;
        }
    }

    isActive(): boolean {
        return this.value > 0;
    }

    reset(): void {
        this.value = 0;
    }

    getTimeRemaining(): number {
        return this.value * 16.666666666666668;
    }

    sleep(ms: number): Promise<void> {
        const target = Math.ceil(ms / 16.666666666666668);
        this.set(target);
        return new Promise<void>((resolve) => {
            const check = () => {
                if (!this.isActive()) {
                    resolve();
                } else {
                    setTimeout(check, 16);
                }
            };
            check();
        });
    }
}
