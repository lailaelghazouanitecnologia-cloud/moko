import { EventEmitter } from '../core/eventemitter';
import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';
import { AnimClip } from './animclip';
import { AnimTrack } from './animtrack';
import { AnimCurve } from './animcurve';
import { AnimState } from './animstate';
import { Skeleton } from './skeleton';
import { Bone } from './bone';

export class AnimController extends EventEmitter {
    private clips: Map<string, AnimClip> = new Map();
    private currentClip: AnimClip | null = null;
    private skeleton: Skeleton | null = null;
    private playing: boolean = false;
    private time: number = 0;
    private weight: number = 1.0;
    private speed: number = 1.0;
    private loop: boolean = true;

    constructor(skeleton?: Skeleton) {
        super();
        if (skeleton) {
            this.skeleton = skeleton;
        }
    }

    addClip(name: string, clip: AnimClip): void {
        this.clips.set(name, clip);
    }

    removeClip(name: string): boolean {
        return this.clips.delete(name);
    }

    getClip(name: string): AnimClip | undefined {
        return this.clips.get(name);
    }

    hasClip(name: string): boolean {
        return this.clips.has(name);
    }

    listClips(): string[] {
        return Array.from(this.clips.keys());
    }

    setSkeleton(skeleton: Skeleton): void {
        this.skeleton = skeleton;
    }

    getSkeleton(): Skeleton | null {
        return this.skeleton;
    }

    update(dt: number): void {
        if (!this.playing || !this.currentClip) {
            return;
        }

        const effectiveDt = dt * this.speed;
        this.time += effectiveDt;

        const duration = this.currentClip.getDuration();
        if (this.loop) {
            this.time = this.time % duration;
        } else if (this.time >= duration) {
            this.time = duration;
            this.playing = false;
            this.emit('end');
            return;
        }

        this.applyAnimation();
    }

    play(name: string): boolean {
        const clip = this.clips.get(name);
        if (!clip) {
            return false;
        }

        if (this.currentClip && this.currentClip !== clip) {
            this.emit('stop', this.currentClip);
        }

        this.currentClip = clip;
        this.playing = true;
        this.time = 0;
        this.emit('play', clip);
        return true;
    }

    stop(): void {
        if (!this.playing) {
            return;
        }

        this.playing = false;
        if (this.currentClip) {
            this.emit('stop', this.currentClip);
        }
    }

    pause(): void {
        this.playing = false;
    }

    resume(): void {
        if (this.currentClip) {
            this.playing = true;
        }
    }

    isPlaying(): boolean {
        return this.playing;
    }

    getCurrentClip(): AnimClip | null {
        return this.currentClip;
    }

    getCurrentTime(): number {
        return this.time;
    }

    setCurrentTime(time: number): void {
        if (!this.currentClip) {
            return;
        }

        const duration = this.currentClip.getDuration();
        this.time = Math.max(0, Math.min(time, duration));
        this.applyAnimation();
    }

    getWeight(): number {
        return this.weight;
    }

    setWeight(weight: number): void {
        this.weight = Math.max(0, Math.min(1, weight));
    }

    getSpeed(): number {
        return this.speed;
    }

    setSpeed(speed: number): void {
        this.speed = speed;
    }

    getLoop(): boolean {
        return this.loop;
    }

    setLoop(loop: boolean): void {
        this.loop = loop;
    }

    private applyAnimation(): void {
        if (!this.currentClip || !this.skeleton) {
            return;
        }

        const tracks = this.currentClip.getTracks();
        for (const track of tracks) {
            const curve = track.getCurve();
            const targetPath = track.getTargetPath();
            const target = this.findTarget(targetPath);
            
            if (!target) {
                continue;
            }

            const value = curve.evaluate(this.time);
            this.applyValue(target, track.getTargetProperty(), value);
        }
    }

    private findTarget(path: string): Bone | null {
        if (!this.skeleton) {
            return null;
        }

        const parts = path.split('/');
        let current: any = this.skeleton;

        for (const part of parts) {
            if (part === '') {
                continue;
            }

            if (current.findBoneByName) {
                current = current.findBoneByName(part);
            } else if (current.getChildByName) {
                current = current.getChildByName(part);
            } else {
                return null;
            }

            if (!current) {
                return null;
            }
        }

        return current as Bone;
    }

    private applyValue(target: Bone, property: string, value: any): void {
        switch (property) {
            case 'position':
                if (value instanceof Vec3) {
                    target.setPosition(value);
                }
                break;
            case 'rotation':
                if (value instanceof Quat) {
                    target.setRotation(value);
                }
                break;
            case 'scale':
                if (value instanceof Vec3) {
                    target.setScale(value);
                }
                break;
        }
    }

    reset(): void {
        this.stop();
        this.time = 0;
        this.currentClip = null;
    }

    destroy(): void {
        this.reset();
        this.clips.clear();
        this.skeleton = null;
        this.removeAllListeners();
    }
}
