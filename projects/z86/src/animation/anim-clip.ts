import { EventEmitter } from '../core';
import { AnimTrack } from './anim-track';
import { AnimCurve } from './anim-curve';

export interface Keyframe {
    time: number;
    value: number | number[];
    inTangent?: number | number[];
    outTangent?: number | number[];
}

export class AnimClip extends EventEmitter {
    private _tracks: AnimTrack[] = [];
    private _duration: number = 0;
    private _time: number = 0;
    private _playing: boolean = false;
    private _loop: boolean = false;
    private _speed: number = 1;

    constructor(tracks?: AnimTrack[], duration?: number) {
        super();
        if (tracks) {
            this._tracks = tracks;
            this._duration = duration ?? this.calculateDuration();
        }
    }

    get duration(): number {
        return this._duration;
    }

    set duration(value: number) {
        this._duration = Math.max(0, value);
    }

    get time(): number {
        return this._time;
    }

    set time(value: number) {
        this._time = Math.max(0, Math.min(this._duration, value));
    }

    get playing(): boolean {
        return this._playing;
    }

    get loop(): boolean {
        return this._loop;
    }

    set loop(value: boolean) {
        this._loop = value;
    }

    get speed(): number {
        return this._speed;
    }

    set speed(value: number) {
        this._speed = value;
    }

    addTrack(track: AnimTrack): void {
        this._tracks.push(track);
        this._duration = Math.max(this._duration, track.duration);
    }

    removeTrack(track: AnimTrack): void {
        const index = this._tracks.indexOf(track);
        if (index !== -1) {
            this._tracks.splice(index, 1);
            this._duration = this.calculateDuration();
        }
    }

    getTracks(): AnimTrack[] {
        return this._tracks.slice();
    }

    play(): void {
        if (!this._playing) {
            this._playing = true;
            this.emit('play');
        }
    }

    pause(): void {
        if (this._playing) {
            this._playing = false;
            this.emit('pause');
        }
    }

    stop(): void {
        this._playing = false;
        this._time = 0;
        this.emit('stop');
    }

    update(deltaTime: number): void {
        if (!this._playing) return;

        const prevTime = this._time;
        this._time += deltaTime * this._speed;

        if (this._time >= this._duration) {
            if (this._loop) {
                this._time = this._time % this._duration;
            } else {
                this._time = this._duration;
                this._playing = false;
                this.emit('end');
            }
        }

        this._tracks.forEach(track => {
            track.evaluate(this._time);
        });

        this.emit('update', this._time, prevTime);
    }

    evaluate(time: number): void {
        const clampedTime = Math.max(0, Math.min(this._duration, time));
        this._tracks.forEach(track => {
            track.evaluate(clampedTime);
        });
    }

    reset(): void {
        this._time = 0;
        this._playing = false;
        this.emit('reset');
    }

    destroy(): void {
        this.stop();
        this._tracks.length = 0;
        this.emit('destroy');
        super.destroy();
    }

    private calculateDuration(): number {
        let maxDuration = 0;
        this._tracks.forEach(track => {
            maxDuration = Math.max(maxDuration, track.duration);
        });
        return maxDuration;
    }
}
