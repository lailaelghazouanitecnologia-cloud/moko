import { EventEmitter } from '../core/eventemitter';
import { Vec2 } from '../math/vec2';
import { Vec3 } from '../math/vec3';
import { Vec4 } from '../math/vec4';

export enum Interpolation {
    LINEAR,
    STEP,
    CUBIC,
    CATMULL_ROM,
    BEZIER
}

export interface Keyframe {
    time: number;
    value: number | Vec2 | Vec3 | Vec4;
    inTangent?: number | Vec2 | Vec3 | Vec4;
    outTangent?: number | Vec2 | Vec3 | Vec4;
    interpolation?: Interpolation;
}

export class AnimCurve extends EventEmitter {
    private _keyframes: Keyframe[];
    private _interpolation: Interpolation;
    private _length: number;

    constructor(keyframes: Keyframe[] = [], interpolation: Interpolation = Interpolation.LINEAR) {
        super();
        this._keyframes = keyframes;
        this._interpolation = interpolation;
        this._length = this._calculateLength();
    }

    get keyframes(): Keyframe[] {
        return this._keyframes;
    }

    set keyframes(value: Keyframe[]) {
        this._keyframes = value;
        this._length = this._calculateLength();
        this.emit('changed');
    }

    get interpolation(): Interpolation {
        return this._interpolation;
    }

    set interpolation(value: Interpolation) {
        this._interpolation = value;
        this.emit('changed');
    }

    get length(): number {
        return this._length;
    }

    addKeyframe(keyframe: Keyframe): void {
        this._keyframes.push(keyframe);
        this._keyframes.sort((a, b) => a.time - b.time);
        this._length = this._calculateLength();
        this.emit('changed');
    }

    removeKeyframe(index: number): void {
        if (index >= 0 && index < this._keyframes.length) {
            this._keyframes.splice(index, 1);
            this._length = this._calculateLength();
            this.emit('changed');
        }
    }

    evaluate(time: number): number | Vec2 | Vec3 | Vec4 | null {
        if (this._keyframes.length === 0) return null;
        if (this._keyframes.length === 1) return this._keyframes[0].value;

        const first = this._keyframes[0];
        const last = this._keyframes[this._keyframes.length - 1];

        if (time <= first.time) return first.value;
        if (time >= last.time) return last.value;

        let left = 0;
        let right = this._keyframes.length - 1;

        while (right - left > 1) {
            const mid = Math.floor((left + right) / 2);
            if (this._keyframes[mid].time <= time) {
                left = mid;
            } else {
                right = mid;
            }
        }

        const k0 = this._keyframes[left];
        const k1 = this._keyframes[right];

        const t = (time - k0.time) / (k1.time - k0.time);

        switch (this._interpolation) {
            case Interpolation.STEP:
                return k0.value;
            case Interpolation.LINEAR:
                return this._lerp(k0.value, k1.value, t);
            case Interpolation.CUBIC:
                return this._cubicInterpolate(k0, k1, t);
            case Interpolation.CATMULL_ROM:
                return this._catmullRomInterpolate(time);
            case Interpolation.BEZIER:
                return this._bezierInterpolate(k0, k1, t);
            default:
                return this._lerp(k0.value, k1.value, t);
        }
    }

    clone(): AnimCurve {
        const clonedKeyframes = this._keyframes.map(k => ({
            time: k.time,
            value: this._cloneValue(k.value),
            inTangent: k.inTangent ? this._cloneValue(k.inTangent) : undefined,
            outTangent: k.outTangent ? this._cloneValue(k.outTangent) : undefined,
            interpolation: k.interpolation
        }));
        return new AnimCurve(clonedKeyframes, this._interpolation);
    }

    private _calculateLength(): number {
        if (this._keyframes.length === 0) return 0;
        return this._keyframes[this._keyframes.length - 1].time;
    }

    private _lerp(a: number | Vec2 | Vec3 | Vec4, b: number | Vec2 | Vec3 | Vec4, t: number): number | Vec2 | Vec3 | Vec4 {
        if (typeof a === 'number' && typeof b === 'number') {
            return a + (b - a) * t;
        }
        if (a instanceof Vec2 && b instanceof Vec2) {
            return new Vec2().lerp(a, b, t);
        }
        if (a instanceof Vec3 && b instanceof Vec3) {
            return new Vec3().lerp(a, b, t);
        }
        if (a instanceof Vec4 && b instanceof Vec4) {
            return new Vec4().lerp(a, b, t);
        }
        return a;
    }

    private _cubicInterpolate(k0: Keyframe, k1: Keyframe, t: number): number | Vec2 | Vec3 | Vec4 {
        const m0 = k0.outTangent || 0;
        const m1 = k1.inTangent || 0;
        const t2 = t * t;
        const t3 = t2 * t;
        const a = 2 * t3 - 3 * t2 + 1;
        const b = t3 - 2 * t2 + t;
        const c = t3 - t2;
        const d = -2 * t3 + 3 * t2;

        if (typeof k0.value === 'number' && typeof k1.value === 'number' && typeof m0 === 'number' && typeof m1 === 'number') {
            return a * k0.value + b * m0 + c * m1 + d * k1.value;
        }

        const v0 = this._toVec4(k0.value);
        const v1 = this._toVec4(k1.value);
        const tan0 = this._toVec4(m0);
        const tan1 = this._toVec4(m1);

        const result = new Vec4();
        result.x = a * v0.x + b * tan0.x + c * tan1.x + d * v1.x;
        result.y = a * v0.y + b * tan0.y + c * tan1.y + d * v1.y;
        result.z = a * v0.z + b * tan0.z + c * tan1.z + d * v1.z;
        result.w = a * v0.w + b * tan0.w + c * tan1.w + d * v1.w;

        return this._fromVec4(result, k0.value);
    }

    private _catmullRomInterpolate(time: number): number | Vec2 | Vec3 | Vec4 {
        const index = this._findSegment(time);
        const k0 = this._keyframes[Math.max(0, index - 1)];
        const k1 = this._keyframes[index];
        const k2 = this._keyframes[Math.min(this._keyframes.length - 1, index + 1)];
        const k3 = this._keyframes[Math.min(this._keyframes.length - 1, index + 2)];

        const t1 = k1.time;
        const t2 = k2.time;
        const t = (time - t1) / (t2 - t1);

        const v0 = this._toVec4(k0.value);
        const v1 = this._toVec4(k1.value);
        const v2 = this._toVec4(k2.value);
        const v3 = this._toVec4(k3.value);

        const result = new Vec4();
        const t2t = t * t;
        const t3t = t2t * t;

        result.x = 0.5 * ((2 * v1.x) + (-v0.x + v2.x) * t + (2 * v0.x - 5 * v1.x + 4 * v2.x - v3.x) * t2t + (-v0.x + 3 * v1.x - 3 * v2.x + v3.x) * t3t);
        result.y = 0.5 * ((2 * v1.y) + (-v0.y + v2.y) * t + (2 * v0.y - 5 * v1.y + 4 * v2.y - v3.y) * t2t + (-v0.y + 3 * v1.y - 3 * v2.y + v3.y) * t3t);
        result.z = 0.5 * ((2 * v1.z) + (-v0.z + v2.z) * t + (2 * v0.z - 5 * v1.z + 4 * v2.z - v3.z) * t2t + (-v0.z + 3 * v1.z - 3 * v2.z + v3.z) * t3t);
        result.w = 0.5 * ((2 * v1.w) + (-v0.w + v2.w) * t + (2 * v0.w - 5 * v1.w + 4 * v2.w - v3.w) * t2t + (-v0.w + 3 * v1.w - 3 * v2.w + v3.w) * t3t);

        return this._fromVec4(result, k1.value);
    }

    private _bezierInterpolate(k0: Keyframe, k1: Keyframe, t: number): number | Vec2 | Vec3 | Vec4 {
        const tan0 = k0.outTangent || 0;
        const tan1 = k1.inTangent || 0;

        const v0 = this._toVec4(k0.value);
        const v1 = this._toVec4(k1.value);
        const t0 = this._toVec4(tan0);
        const t1 = this._toVec4(tan1);

        const u = 1 - t;
        const u2 = u * u;
        const u3 = u2 * u;
        const t2 = t * t;
        const t3 = t2 * t;

        const result = new Vec4();
        result.x = u3 * v0.x + 3 * u2 * t * (v0.x + t0.x) + 3 * u * t2 * (v1.x - t1.x) + t3 * v1.x;
        result.y = u3 * v0.y + 3 * u2 * t * (v0.y + t0.y) + 3 * u * t2 * (v1.y - t1.y) + t3 * v1.y;
        result.z = u3 * v0.z + 3 * u2 * t * (v0.z + t0.z) + 3 * u * t2 * (v1.z - t1.z) + t3 * v1.z;
        result.w = u3 * v0.w + 3 * u2 * t * (v0.w + t0.w) + 3 * u * t2 * (v1.w - t1.w) + t3 * v1.w;

        return this._fromVec4(result, k0.value);
    }

    private _findSegment(time: number): number {
        for (let i = 0; i < this._keyframes.length - 1; i++) {
            if (time >= this._keyframes[i].time && time < this._keyframes[i + 1].time) {
                return i;
            }
        }
        return this._keyframes.length - 2;
    }

    private _toVec4(value: number | Vec2 | Vec3 | Vec4): Vec4 {
        if (typeof value === 'number') return new Vec4(value, 0, 0, 0);
        if (value instanceof Vec2) return new Vec4(value.x, value.y, 0, 0);
        if (value instanceof Vec3) return new Vec4(value.x, value.y, value.z, 0);
        return value;
    }

    private _fromVec4(vec: Vec4, original: number | Vec2 | Vec3 | Vec4): number | Vec2 | Vec3 | Vec4 {
        if (typeof original === 'number') return vec.x;
        if (original instanceof Vec2) return new Vec2(vec.x, vec.y);
        if (original instanceof Vec3) return new Vec3(vec.x, vec.y, vec.z);
        return vec;
    }

    private _cloneValue(value: number | Vec2 | Vec3 | Vec4): number | Vec2 | Vec3 | Vec4 {
        if (typeof value === 'number') return value;
        if (value instanceof Vec2) return new Vec2(value.x, value.y);
        if (value instanceof Vec3) return new Vec3(value.x, value.y, value.z);
        if (value instanceof Vec4) return new Vec4(value.x, value.y, value.z, value.w);
        return value;
    }
}
