import { EventEmitter } from '../core';
import { AnimClip } from './anim-clip';
import { AnimTrack } from './anim-track';
import { AnimCurve } from './anim-curve';
import { AnimController } from './anim-controller';
import { Skeleton } from './skeleton';
import { Bone } from './bone';

export class AnimState extends EventEmitter {
    private _name: string;
    private _controller: AnimController;
    private _clip: AnimClip | null = null;
    private _time = 0;
    private _duration = 0;
    private _playing = false;
    private _paused = false;
    private _speed = 1;
    private _loop = true;

    constructor(name: string, controller: AnimController) {
        super();
        this._name = name;
        this._controller = controller;
    }

    get name(): string {
        return this._name;
    }

    get clip(): AnimClip | null {
        return this._clip;
    }

    set clip(value: AnimClip | null) {
        this._clip = value;
        if (value) {
            this._duration = value.duration;
        } else {
            this._duration = 0;
        }
    }

    get time(): number {
        return this._time;
    }

    get duration(): number {
        return this._duration;
    }

    get playing(): boolean {
        return this._playing;
    }

    get paused(): boolean {
        return this._paused;
    }

    get speed(): number {
        return this._speed;
    }

    set speed(value: number) {
        this._speed = value;
    }

    get loop(): boolean {
        return this._loop;
    }

    set loop(value: boolean) {
        this._loop = value;
    }

    update(deltaTime: number): void {
        if (!this._playing || this._paused || !this._clip) return;

        const scaledDelta = deltaTime * this._speed;
        this._time += scaledDelta;

        if (this._time >= this._duration) {
            if (this._loop) {
                this._time = this._time % this._duration;
            } else {
                this._time = this._duration;
                this.stop();
                this.emit('end');
            }
        } else if (this._time < 0) {
            if (this._loop) {
                this._time = this._duration + (this._time % this._duration);
            } else {
                this._time = 0;
                this.stop();
                this.emit('end');
            }
        }

        this._clip.evaluate(this._time);
    }

    play(): void {
        if (!this._clip) return;
        this._playing = true;
        this._paused = false;
        this.emit('play');
    }

    pause(): void {
        if (!this._playing) return;
        this._paused = true;
        this.emit('pause');
    }

    stop(): void {
        this._playing = false;
        this._paused = false;
        this._time = 0;
        this.emit('stop');
    }

    setTime(time: number): void {
        this._time = Math.max(0, Math.min(time, this._duration));
        if (this._clip) {
            this._clip.evaluate(this._time);
        }
    }

    getDuration(): number {
        return this._duration;
    }
}
