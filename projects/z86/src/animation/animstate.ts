import { EventEmitter } from '../../core/eventemitter';
import { AnimClip } from './animclip';
import { AnimTrack } from './animtrack';

export class AnimState extends EventEmitter {
    name: string;
    speed: number;
    loop: boolean;
    blendWeight: number;
    blendTime: number;
    blendTimeRemaining: number;
    currentTime: number;
    duration: number;
    playing: boolean;
    clips: AnimClip[];
    transitions: any[];
    weight: number;
    previousState: AnimState | null;
    previousWeight: number;

    constructor(name: string, clips: AnimClip[] = []) {
        super();
        this.name = name;
        this.speed = 1.0;
        this.loop = true;
        this.blendWeight = 1.0;
        this.blendTime = 0.2;
        this.blendTimeRemaining = 0;
        this.currentTime = 0;
        this.duration = 0;
        this.playing = false;
        this.clips = clips;
        this.transitions = [];
        this.weight = 0;
        this.previousState = null;
        this.previousWeight = 0;

        this._calculateDuration();
    }

    private _calculateDuration(): void {
        this.duration = 0;
        for (const clip of this.clips) {
            if (clip.track) {
                this.duration = Math.max(this.duration, clip.track.duration);
            }
        }
    }

    update(dt: number): void {
        if (!this.playing) return;

        if (this.blendTimeRemaining > 0) {
            this.blendTimeRemaining -= dt;
            const blend = Math.max(0, this.blendTimeRemaining) / this.blendTime;
            this.weight = (1.0 - blend) * this.blendWeight + blend * this.previousWeight;
        } else {
            this.weight = this.blendWeight;
        }

        if (this.clips.length === 0) return;

        const scaledDt = dt * this.speed;
        this.currentTime += scaledDt;

        if (this.currentTime > this.duration) {
            if (this.loop) {
                this.currentTime %= this.duration;
                this.emit('loop');
            } else {
                this.currentTime = this.duration;
                this.stop();
                this.emit('end');
            }
        }

        for (const clip of this.clips) {
            if (clip.track) {
                const trackTime = this.currentTime % clip.track.duration;
                clip.currentTime = trackTime;
            }
        }

        this.emit('update', this.currentTime);
    }

    play(): void {
        if (this.playing) return;
        this.playing = true;
        this.emit('play');
    }

    stop(): void {
        if (!this.playing) return;
        this.playing = false;
        this.currentTime = 0;
        this.emit('stop');
    }

    pause(): void {
        this.playing = false;
        this.emit('pause');
    }

    resume(): void {
        if (this.playing) return;
        this.playing = true;
        this.emit('resume');
    }

    reset(): void {
        this.currentTime = 0;
        this.playing = false;
        this.blendTimeRemaining = 0;
        this.weight = 0;
        this.emit('reset');
    }

    setTime(time: number): void {
        this.currentTime = Math.max(0, Math.min(time, this.duration));
        for (const clip of this.clips) {
            if (clip.track) {
                const trackTime = this.currentTime % clip.track.duration;
                clip.currentTime = trackTime;
            }
        }
        this.emit('timeSet', this.currentTime);
    }

    addClip(clip: AnimClip): void {
        this.clips.push(clip);
        this._calculateDuration();
    }

    removeClip(clip: AnimClip): boolean {
        const index = this.clips.indexOf(clip);
        if (index !== -1) {
            this.clips.splice(index, 1);
            this._calculateDuration();
            return true;
        }
        return false;
    }

    blendTo(targetWeight: number, blendTime: number = this.blendTime): void {
        this.previousWeight = this.weight;
        this.blendWeight = targetWeight;
        this.blendTime = blendTime;
        this.blendTimeRemaining = blendTime;
    }

    findClip(name: string): AnimClip | null {
        for (const clip of this.clips) {
            if (clip.name === name) {
                return clip;
            }
        }
        return null;
    }

    getProgress(): number {
        return this.duration > 0 ? this.currentTime / this.duration : 0;
    }

    isFinished(): boolean {
        return !this.loop && this.currentTime >= this.duration;
    }

    clone(): AnimState {
        const cloned = new AnimState(this.name);
        cloned.speed = this.speed;
        cloned.loop = this.loop;
        cloned.blendWeight = this.blendWeight;
        cloned.blendTime = this.blendTime;
        cloned.clips = this.clips.map(clip => clip.clone());
        cloned._calculateDuration();
        return cloned;
    }
}
