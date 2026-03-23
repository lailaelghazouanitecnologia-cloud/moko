import { AnimClip } from './anim-clip';

export class AnimTrack {
    clip: AnimClip;
    time: number;
    speed: number;
    loop: boolean;
    weight: number;

    private _fadeTarget: number;
    private _fadeDuration: number;
    private _fadeTime: number;
    private _isFading: boolean;

    constructor(clip: AnimClip) {
        this.clip = clip;
        this.time = 0;
        this.speed = 1;
        this.loop = true;
        this.weight = 1;
        this._fadeTarget = 1;
        this._fadeDuration = 0;
        this._fadeTime = 0;
        this._isFading = false;
    }

    update(dt: number): void {
        if (this.speed === 0) return;

        const prevTime = this.time;
        this.time += this.speed * dt;

        const duration = this.getDuration();
        if (duration > 0) {
            if (this.loop) {
                this.time = ((this.time % duration) + duration) % duration;
            } else {
                this.time = Math.max(0, Math.min(duration, this.time));
                if (this.speed > 0 && this.time >= duration) {
                    this.speed = 0;
                } else if (this.speed < 0 && this.time <= 0) {
                    this.speed = 0;
                }
            }
        }

        if (this._isFading) {
            this._fadeTime += dt;
            const t = Math.min(1, this._fadeTime / this._fadeDuration);
            this.weight = this.weight + (this._fadeTarget - this.weight) * t;
            if (t >= 1) {
                this._isFading = false;
                this.weight = this._fadeTarget;
            }
        }
    }

    evaluate(): Map<string, any> {
        return this.clip.evaluate(this.time);
    }

    play(): void {
        this.speed = 1;
    }

    pause(): void {
        this.speed = 0;
    }

    stop(): void {
        this.time = 0;
        this.speed = 0;
    }

    setTime(t: number): void {
        const duration = this.getDuration();
        this.time = duration > 0 ? Math.max(0, Math.min(duration, t)) : Math.max(0, t);
    }

    getTime(): number {
        return this.time;
    }

    setSpeed(s: number): void {
        this.speed = s;
    }

    setLoop(l: boolean): void {
        this.loop = l;
    }

    setWeight(w: number): void {
        this.weight = w;
    }

    isPlaying(): boolean {
        return this.speed !== 0;
    }

    getDuration(): number {
        return this.clip.getDuration();
    }

    fadeTo(target: number, duration: number): void {
        this._fadeTarget = target;
        this._fadeDuration = duration;
        this._fadeTime = 0;
        this._isFading = true;
    }
}
