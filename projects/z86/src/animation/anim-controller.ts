import { EventEmitter } from '../core';
import { AnimClip } from './anim-clip';
import { AnimTrack } from './anim-track';
import { AnimCurve } from './anim-curve';
import { AnimState } from './anim-state';

export class AnimController extends EventEmitter {
    private _clips: AnimClip[] = [];
    private _currentClip: AnimClip | null = null;
    private _currentTime: number = 0;
    private _speed: number = 1.0;
    private _weight: number = 1.0;
    private _playing: boolean = false;
    private _loop: boolean = true;

    constructor() {
        super();
    }

    addClip(clip: AnimClip): void {
        this._clips.push(clip);
    }

    removeClip(clip: AnimClip): void {
        const index = this._clips.indexOf(clip);
        if (index !== -1) {
            this._clips.splice(index, 1);
            if (this._currentClip === clip) {
                this.stop();
            }
        }
    }

    play(clip?: AnimClip): void {
        if (clip) {
            if (!this._clips.includes(clip)) {
                this.addClip(clip);
            }
            this._currentClip = clip;
        } else if (!this._currentClip && this._clips.length > 0) {
            this._currentClip = this._clips[0];
        }

        if (this._currentClip) {
            this._playing = true;
            this._currentTime = 0;
            this.emit('play', this._currentClip);
        }
    }

    stop(): void {
        this._playing = false;
        this._currentTime = 0;
        this.emit('stop', this._currentClip);
    }

    update(deltaTime: number): void {
        if (!this._playing || !this._currentClip) return;

        this._currentTime += deltaTime * this._speed;

        const duration = this._currentClip.duration;
        if (this._currentTime >= duration) {
            if (this._loop) {
                this._currentTime = this._currentTime % duration;
            } else {
                this._currentTime = duration;
                this._playing = false;
                this.emit('end', this._currentClip);
                return;
            }
        }

        this._currentClip.evaluate(this._currentTime, this._weight);
        this.emit('update', this._currentTime);
    }

    setSpeed(speed: number): void {
        this._speed = speed;
    }

    setWeight(weight: number): void {
        this._weight = weight;
    }

    isPlaying(): boolean {
        return this._playing;
    }

    get currentClip(): AnimClip | null {
        return this._currentClip;
    }

    get clips(): AnimClip[] {
        return this._clips.slice();
    }

    get currentTime(): number {
        return this._currentTime;
    }

    get speed(): number {
        return this._speed;
    }

    get weight(): number {
        return this._weight;
    }

    set loop(value: boolean) {
        this._loop = value;
    }

    get loop(): boolean {
        return this._loop;
    }
}
