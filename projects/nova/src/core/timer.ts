export class Timer {
    static now(): number {
        return performance.now();
    }

    static delta(last: number): number {
        return performance.now() - last;
    }

    static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static frame(): Promise<number> {
        return new Promise(resolve => {
            requestAnimationFrame((timestamp) => resolve(timestamp));
        });
    }

    static benchmark<T>(fn: () => T): [T, number] {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        return [result, duration];
    }

    static throttle(fn: Function, ms: number): Function {
        let lastCall = 0;
        return function (...args: any[]) {
            const now = performance.now();
            if (now - lastCall >= ms) {
                lastCall = now;
                return fn.apply(this, args);
            }
        };
    }

    static debounce(fn: Function, ms: number): Function {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        return function (...args: any[]) {
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                fn.apply(this, args);
            }, ms);
        };
    }

    static lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    static clamp(v: number, min: number, max: number): number {
        return Math.min(Math.max(v, min), max);
    }

    static fps(frames: number, elapsed: number): number {
        return elapsed > 0 ? (frames * 1000) / elapsed : 0;
    }
}
