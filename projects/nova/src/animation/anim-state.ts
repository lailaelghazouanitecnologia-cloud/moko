import { AnimTrack } from './anim-track';

interface BlendTreeNode {
    evaluate(): Map<string, any>;
}

export class AnimState {
    name: string;
    tracks: AnimTrack[];
    speed: number;
    loop: boolean;
    blendTree: BlendTreeNode | null;

    constructor(name: string) {
        this.name = name;
        this.tracks = [];
        this.speed = 1.0;
        this.loop = true;
        this.blendTree = null;
    }

    addTrack(track: AnimTrack): void {
        this.tracks.push(track);
    }

    removeTrack(index: number): void {
        if (index >= 0 && index < this.tracks.length) {
            this.tracks.splice(index, 1);
        }
    }

    getTrack(index: number): AnimTrack {
        if (index < 0 || index >= this.tracks.length) {
            throw new Error('Track index out of bounds');
        }
        return this.tracks[index];
    }

    getTrackCount(): number {
        return this.tracks.length;
    }

    setSpeed(s: number): void {
        this.speed = s;
        for (const track of this.tracks) {
            track.speed = s;
        }
    }

    setLoop(l: boolean): void {
        this.loop = l;
        for (const track of this.tracks) {
            track.loop = l;
        }
    }

    update(dt: number): void {
        const scaledDt = dt * this.speed;
        for (const track of this.tracks) {
            track.update(scaledDt);
        }
    }

    evaluate(): Map<string, any> {
        if (this.blendTree) {
            return this.blendTree.evaluate();
        }

        const result = new Map<string, any>();
        for (const track of this.tracks) {
            const trackData = track.evaluate();
            for (const [key, value] of trackData) {
                if (!result.has(key)) {
                    result.set(key, value);
                }
            }
        }
        return result;
    }

    setBlendTree(tree: BlendTreeNode): void {
        this.blendTree = tree;
        this.tracks = [];
    }

    getDuration(): number {
        if (this.blendTree) {
            return 1.0;
        }
        let maxDuration = 0;
        for (const track of this.tracks) {
            maxDuration = Math.max(maxDuration, track.getDuration());
        }
        return maxDuration;
    }

    normalizeTime(t: number): number {
        const duration = this.getDuration();
        if (duration <= 0) return 0;
        if (this.loop) {
            return ((t % duration) + duration) % duration;
        }
        return Math.max(0, Math.min(duration, t));
    }
}
