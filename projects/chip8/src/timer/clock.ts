import { DelayTimer } from './delay-timer';
import { SoundTimer } from './sound-timer';

export class Clock {
    private delayTimer: DelayTimer;
    private soundTimer: SoundTimer;
    private running: boolean;
    private intervalId: NodeJS.Timeout | null;

    constructor() {
        this.delayTimer = new DelayTimer();
        this.soundTimer = new SoundTimer();
        this.running = false;
        this.intervalId = null;
    }

    start(): void {
        if (this.running) return;
        this.running = true;
        this.intervalId = setInterval(() => this.tick(), 1000 / 60);
    }

    stop(): void {
        if (!this.running) return;
        this.running = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    tick(): void {
        this.delayTimer.tick();
        this.soundTimer.tick();
    }

    isRunning(): boolean {
        return this.running;
    }

    getDelayTimer(): DelayTimer {
        return this.delayTimer;
    }

    getSoundTimer(): SoundTimer {
        return this.soundTimer;
    }
}
