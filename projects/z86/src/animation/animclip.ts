import { EventEmitter } from '../core/eventemitter';
import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';
import { AnimTrack } from './animtrack';
import { AnimCurve } from './animcurve';

export class AnimClip extends EventEmitter {
    private _name: string;
    private _tracks: AnimTrack[];
    private _duration: number;
    private _loop: boolean;
    private _time: number;
    private _playing: boolean;
    private _speed: number;

    constructor(name: string, tracks: AnimTrack[], duration: number, loop: boolean = false) {
        super();
        this._name = name;
        this._tracks = tracks;
        this._duration = duration;
        this._loop = loop;
        this._time = 0;
        this._playing = false;
        this._speed = 1.0;
    }

    get name(): string {
        return this._name;
    }

    get duration(): number {
        return this._duration;
    }

    get loop(): boolean {
        return this._loop;
    }

    set loop(value: boolean) {
        this._loop = value;
    }

    get time(): number {
        return this._time;
    }

    get playing(): boolean {
        return this._playing;
    }

    get speed(): number {
        return this._speed;
    }

    set speed(value: number) {
        this._speed = value;
    }

    play(): void {
        if (this._playing) return;
        this._playing = true;
        this.emit('play');
    }

    pause(): void {
        if (!this._playing) return;
        this._playing = false;
        this.emit('pause');
    }

    stop(): void {
        this._playing = false;
        this._time = 0;
        this.emit('stop');
    }

    reset(): void {
        this._time = 0;
        this.emit('reset');
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

        if (this._time < 0) {
            if (this._loop) {
                this._time = this._duration + (this._time % this._duration);
            } else {
                this._time = 0;
                this._playing = false;
                this.emit('end');
            }
        }

        this._tracks.forEach(track => {
            track.update(this._time);
        });

        this.emit('update', this._time);
    }

    evaluate(time: number): Map<string, any> {
        const result = new Map<string, any>();
        this._tracks.forEach(track => {
            const value = track.evaluate(time);
            if (value !== undefined) {
                result.set(track.name, value);
            }
        });
        return result;
    }

    getTrack(name: string): AnimTrack | undefined {
        return this._tracks.find(track => track.name === name);
    }

    addTrack(track: AnimTrack): void {
        this._tracks.push(track);
    }

    removeTrack(track: AnimTrack): void {
        const index = this._tracks.indexOf(track);
        if (index !== -1) {
            this._tracks.splice(index, 1);
        }
    }

    clone(): AnimClip {
        const clonedTracks = this._tracks.map(track => track.clone());
        const clip = new AnimClip(this._name, clonedTracks, this._duration, this._loop);
        clip._speed = this._speed;
        return clip;
    }

    destroy(): void {
        this.stop();
        this._tracks.forEach(track => track.destroy());
        this._tracks.length = 0;
        this.emit('destroy');
        super.destroy();
    }
}
