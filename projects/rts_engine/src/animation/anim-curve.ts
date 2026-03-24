import { Keyframe } from './keyframe';

/**
 * 1D curve with keyframes that supports interpolation and infinity extrapolation
 */
export class AnimCurve {
    keys: Keyframe[] = [];
    preInfinity: InfinityType = InfinityType.Constant;
    postInfinity: InfinityType = InfinityType.Constant;

    /**
     * Evaluates the curve at the specified time using Hermite interpolation
     * @param time - The time value to evaluate at
     * @returns The interpolated value
     * @throws {Error} If time is not a finite number
     */
    evaluate(time: number): number {
        if (!Number.isFinite(time)) {
            throw new Error('Time must be a finite number');
        }

        if (this.keys.length === 0) return 0;

        const firstKey = this.keys[0];
        const lastKey = this.keys[this.keys.length - 1];

        if (time < firstKey.time) {
            return this.handlePreInfinity(time);
        }

        if (time > lastKey.time) {
            return this.handlePostInfinity(time);
        }

        let left = 0;
        let right = this.keys.length - 1;

        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            if (this.keys[mid].time < time) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        if (left === 0) left = 1;

        const key0 = this.keys[left - 1];
        const key1 = this.keys[left];

        const t = (time - key0.time) / (key1.time - key0.time);
        const t2 = t * t;
        const t3 = t2 * t;

        const h00 = 2 * t3 - 3 * t2 + 1;
        const h10 = t3 - 2 * t2 + t;
        const h01 = -2 * t3 + 3 * t2;
        const h11 = t3 - t2;

        const deltaTime = key1.time - key0.time;
        const m0 = key0.outTangent * deltaTime;
        const m1 = key1.inTangent * deltaTime;

        return h00 * key0.value + h10 * m0 + h01 * key1.value + h11 * m1;
    }

    /**
     * Adds a new keyframe to the curve, maintaining sorted order by time
     * @param time - The time value for the keyframe
     * @param value - The value at the specified time
     * @throws {Error} If time or value is not a finite number
     */
    addKey(time: number, value: number): void {
        if (!Number.isFinite(time)) {
            throw new Error('Time must be a finite number');
        }
        if (!Number.isFinite(value)) {
            throw new Error('Value must be a finite number');
        }

        const newKey: Keyframe = {
            time: time,
            value: value,
            inTangent: 0,
            outTangent: 0
        };

        let insertIndex = 0;
        for (let i = 0; i < this.keys.length; i++) {
            if (time < this.keys[i].time) {
                insertIndex = i;
                break;
            }
            insertIndex = i + 1;
        }

        this.keys.splice(insertIndex, 0, newKey);
        this.updateTangents();
    }

    /**
     * Removes a keyframe at the specified index
     * @param index - The index of the keyframe to remove
     * @throws {Error} If index is out of bounds
     */
    removeKey(index: number): void {
        if (index < 0 || index >= this.keys.length) {
            throw new Error(`Index ${index} is out of bounds for array length ${this.keys.length}`);
        }
        this.keys.splice(index, 1);
        this.updateTangents();
    }

    /**
     * Computes the automatic tangent for a keyframe at the specified index
     * @param index - The index of the keyframe
     * @returns The computed tangent value
     * @throws {Error} If index is out of bounds
     */
    getTangent(index: number): number {
        if (index < 0 || index >= this.keys.length) {
            throw new Error(`Index ${index} is out of bounds for array length ${this.keys.length}`);
        }

        const key = this.keys[index];
        if (index === 0) {
            if (this.keys.length === 1) return 0;
            const nextKey = this.keys[1];
            return (nextKey.value - key.value) / (nextKey.time - key.time);
        }

        if (index === this.keys.length - 1) {
            const prevKey = this.keys[index - 1];
            return (key.value - prevKey.value) / (key.time - prevKey.time);
        }

        const prevKey = this.keys[index - 1];
        const nextKey = this.keys[index + 1];
        const delta0 = key.time - prevKey.time;
        const delta1 = nextKey.time - key.time;

        if (delta0 === 0 && delta1 === 0) return 0;
        if (delta0 === 0) return (nextKey.value - key.value) / delta1;
        if (delta1 === 0) return (key.value - prevKey.value) / delta0;

        return (prevKey.value * delta1 + nextKey.value * delta0) / (delta0 + delta1);
    }

    /**
     * Reduces the number of keyframes while maintaining curve shape within tolerance
     * @param tolerance - The maximum allowed deviation for optimization
     * @throws {Error} If tolerance is negative or not a finite number
     */
    optimize(tolerance: number): void {
        if (!Number.isFinite(tolerance)) {
            throw new Error('Tolerance must be a finite number');
        }
        if (tolerance < 0) {
            throw new Error('Tolerance must be non-negative');
        }
        if (this.keys.length <= 2) return;

        const optimizedKeys: Keyframe[] = [this.keys[0]];
        let lastKeptIndex = 0;

        for (let i = 1; i < this.keys.length - 1; i++) {
            const key = this.keys[i];
            const prevKey = this.keys[lastKeptIndex];
            const nextKey = this.keys[this.keys.length - 1];

            const interpolatedValue = this.interpolateLinear(prevKey, nextKey, key.time);
            const error = Math.abs(interpolatedValue - key.value);

            if (error > tolerance) {
                optimizedKeys.push(key);
                lastKeptIndex = i;
            }
        }

        optimizedKeys.push(this.keys[this.keys.length - 1]);
        this.keys = optimizedKeys;
        this.updateTangents();
    }

    /**
     * Sets the pre-infinity behavior for extrapolation before the first keyframe
     * @param type - The infinity type to use
     */
    setPreInfinity(type: InfinityType): void {
        this.preInfinity = type;
    }

    /**
     * Sets the post-infinity behavior for extrapolation after the last keyframe
     * @param type - The infinity type to use
     */
    setPostInfinity(type: InfinityType): void {
        this.postInfinity = type;
    }

    /**
     * Gets the number of keyframes in the curve
     * @returns The number of keyframes
     */
    getKeyCount(): number {
        return this.keys.length;
    }

    /**
     * Gets a keyframe at the specified index
     * @param index - The index of the keyframe
     * @returns The keyframe at the specified index
     * @throws {Error} If index is out of bounds
     */
    getKey(index: number): Keyframe {
        if (index < 0 || index >= this.keys.length) {
            throw new Error(`Index ${index} is out of bounds for array length ${this.keys.length}`);
        }
        return { ...this.keys[index] };
    }

    /**
     * Clears all keyframes from the curve
     */
    clear(): void {
        this.keys = [];
    }

    private handlePreInfinity(time: number): number {
        const firstKey = this.keys[0];
        const lastKey = this.keys[this.keys.length - 1];
        const duration = lastKey.time - firstKey.time;

        if (duration === 0) return firstKey.value;

        switch (this.preInfinity) {
            case InfinityType.Constant:
                return firstKey.value;
            case InfinityType.Cycle:
                const cycleTime = firstKey.time + ((time - firstKey.time) % duration + duration) % duration;
                return this.evaluate(cycleTime);
            case InfinityType.CycleOffset:
                const numCycles = Math.floor((firstKey.time - time) / duration);
                const offset = (lastKey.value - firstKey.value) * numCycles;
                const cycleTimeOffset = firstKey.time + ((time - firstKey.time) % duration + duration) % duration;
                return this.evaluate(cycleTimeOffset) + offset;
            case InfinityType.Oscillate:
                const oscillateTime = this.getOscillateTime(time, firstKey.time, duration);
                return this.evaluate(oscillateTime);
            default:
                return firstKey.value;
        }
    }

    private handlePostInfinity(time: number): number {
        const firstKey = this.keys[0];
        const lastKey = this.keys[this.keys.length - 1];
        const duration = lastKey.time - firstKey.time;

        if (duration === 0) return lastKey.value;

        switch (this.postInfinity) {
            case InfinityType.Constant:
                return lastKey.value;
            case InfinityType.Cycle:
                const cycleTime = firstKey.time + ((time - firstKey.time) % duration + duration) % duration;
                return this.evaluate(cycleTime);
            case InfinityType.CycleOffset:
                const numCycles = Math.floor((time - firstKey.time) / duration);
                const offset = (lastKey.value - firstKey.value) * numCycles;
                const cycleTimeOffset = firstKey.time + ((time - firstKey.time) % duration + duration) % duration;
                return this.evaluate(cycleTimeOffset) + offset;
            case InfinityType.Oscillate:
                const oscillateTime = this.getOscillateTime(time, lastKey.time, duration);
                return this.evaluate(oscillateTime);
            default:
                return lastKey.value;
        }
    }

    private getOscillateTime(time: number, boundaryTime: number, duration: number): number {
        const relativeTime = time - boundaryTime;
        const cycle = Math.floor(relativeTime / duration);
        const remainder = relativeTime % duration;

        if (cycle % 2 === 0) {
            return boundaryTime + remainder;
        } else {
            return boundaryTime + duration - remainder;
        }
    }

    private updateTangents(): void {
        for (let i = 0; i < this.keys.length; i++) {
            const tangent = this.getTangent(i);
            this.keys[i].inTangent = tangent;
            this.keys[i].outTangent = tangent;
        }
    }

    private interpolateLinear(key0: Keyframe, key1: Keyframe, time: number): number {
        const t = (time - key0.time) / (key1.time - key0.time);
        return key0.value + t * (key1.value - key0.value);
    }
}