import { InterpolationType, TangentType } from './types';

export class AnimCurve {
    keys: Float32Array;
    values: Float32Array;
    interpolation: InterpolationType;
    tangentType: TangentType;

    constructor() {
        this.keys = new Float32Array(0);
        this.values = new Float32Array(0);
        this.interpolation = InterpolationType.LINEAR;
        this.tangentType = TangentType.FREE;
    }

    evaluate(time: number): number {
        const count = this.keys.length;
        if (count === 0) return 0;
        if (count === 1) return this.values[0];

        if (time <= this.keys[0]) return this.values[0];
        if (time >= this.keys[count - 1]) return this.values[count - 1];

        let left = 0;
        let right = count - 1;
        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (this.keys[mid] < time) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        const index = Math.max(0, left - 1);

        const t0 = this.keys[index];
        const t1 = this.keys[index + 1];
        const v0 = this.values[index];
        const v1 = this.values[index + 1];
        const t = (time - t0) / (t1 - t0);

        switch (this.interpolation) {
            case InterpolationType.STEP:
                return v0;
            case InterpolationType.LINEAR:
                return v0 + (v1 - v0) * t;
            case InterpolationType.SMOOTH:
                const tPrev = index > 0 ? this.keys[index - 1] : t0 - (t1 - t0);
                const tNext = index < count - 2 ? this.keys[index + 2] : t1 + (t1 - t0);
                const vPrev = index > 0 ? this.values[index - 1] : v0 - (v1 - v0);
                const vNext = index < count - 2 ? this.values[index + 2] : v1 + (v1 - v0);

                const t01 = (t1 - tPrev) / (t1 - tPrev);
                const t12 = (tNext - t0) / (tNext - t0);
                const m0 = (1 - t) * (v1 - vPrev) / (t1 - tPrev) + t * (vNext - v0) / (tNext - t0);
                const m1 = (1 - t) * (v1 - vPrev) / (t1 - tPrev) + t * (vNext - v0) / (tNext - t0);

                const t2 = t * t;
                const t3 = t2 * t;
                return (2 * t3 - 3 * t2 + 1) * v0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * v1 + (t3 - t2) * m1;
            default:
                return v0;
        }
    }

    addKey(t: number, v: number): void {
        const count = this.keys.length;
        let insertIndex = count;

        for (let i = 0; i < count; i++) {
            if (t < this.keys[i]) {
                insertIndex = i;
                break;
            }
        }

        const newKeys = new Float32Array(count + 1);
        const newValues = new Float32Array(count + 1);

        for (let i = 0; i < insertIndex; i++) {
            newKeys[i] = this.keys[i];
            newValues[i] = this.values[i];
        }

        newKeys[insertIndex] = t;
        newValues[insertIndex] = v;

        for (let i = insertIndex; i < count; i++) {
            newKeys[i + 1] = this.keys[i];
            newValues[i + 1] = this.values[i];
        }

        this.keys = newKeys;
        this.values = newValues;
    }

    removeKey(index: number): void {
        const count = this.keys.length;
        if (index < 0 || index >= count) return;

        const newKeys = new Float32Array(count - 1);
        const newValues = new Float32Array(count - 1);

        for (let i = 0, j = 0; i < count; i++) {
            if (i !== index) {
                newKeys[j] = this.keys[i];
                newValues[j] = this.values[i];
                j++;
            }
        }

        this.keys = newKeys;
        this.values = newValues;
    }

    getKeyTime(index: number): number {
        return this.keys[index];
    }

    getKeyValue(index: number): number {
        return this.values[index];
    }

    setKey(index: number, t: number, v: number): void {
        this.keys[index] = t;
        this.values[index] = v;
    }

    getLength(): number {
        return this.keys.length;
    }

    getDuration(): number {
        const count = this.keys.length;
        return count > 0 ? this.keys[count - 1] : 0;
    }

    optimize(tolerance: number): void {
        const count = this.keys.length;
        if (count <= 2) return;

        const keep = new Array(count).fill(false);
        keep[0] = true;
        keep[count - 1] = true;

        for (let i = 1; i < count - 1; i++) {
            const t = this.keys[i];
            const v = this.values[i];
            const vApprox = this.evaluate(t);
            if (Math.abs(v - vApprox) > tolerance) {
                keep[i] = true;
            }
        }

        let newCount = 0;
        for (let i = 0; i < count; i++) {
            if (keep[i]) newCount++;
        }

        const newKeys = new Float32Array(newCount);
        const newValues = new Float32Array(newCount);

        for (let i = 0, j = 0; i < count; i++) {
            if (keep[i]) {
                newKeys[j] = this.keys[i];
                newValues[j] = this.values[i];
                j++;
            }
        }

        this.keys = newKeys;
        this.values = newValues;
    }

    clone(): AnimCurve {
        const curve = new AnimCurve();
        curve.keys = new Float32Array(this.keys);
        curve.values = new Float32Array(this.values);
        curve.interpolation = this.interpolation;
        curve.tangentType = this.tangentType;
        return curve;
    }

    setStep(): void {
        this.interpolation = InterpolationType.STEP;
    }

    setLinear(): void {
        this.interpolation = InterpolationType.LINEAR;
    }

    setSmooth(): void {
        this.interpolation = InterpolationType.SMOOTH;
    }

    static CONSTANT = InterpolationType.STEP;
    static LINEAR = InterpolationType.LINEAR;
    static SMOOTH = InterpolationType.SMOOTH;
}
