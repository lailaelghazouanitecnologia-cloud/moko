/**
 * Represents a single keyframe in an animation curve
 */
type Keyframe = {
    time: number;
    value: number;
    inTangent?: number;
    outTangent?: number;
};

/**
 * Interpolation types for animation curves
 */
export enum InterpolationType {
    LINEAR = 'linear',
    STEP = 'step',
    CUBIC = 'cubic'
}

/**
 * Infinity types for handling values outside the keyframe range
 */
export enum InfinityType {
    CONSTANT = 'constant',
    LINEAR = 'linear',
    CYCLE = 'cycle',
    CYCLE_RELATIVE = 'cycle_relative',
    OSCILLATE = 'oscillate'
}

/**
 * Keyframe-based animation curve for smooth interpolation between values
 */
export class AnimCurve {
    keys: Keyframe[];
    interpolation: InterpolationType;
    preInfinity: InfinityType;
    postInfinity: InfinityType;
    isStatic: boolean;

    constructor(
        keys: Keyframe[] = [],
        interpolation: InterpolationType = InterpolationType.LINEAR,
        preInfinity: InfinityType = InfinityType.CONSTANT,
        postInfinity: InfinityType = InfinityType.CONSTANT,
        isStatic: boolean = false
    ) {
        this.keys = Array.isArray(keys) ? [...keys] : [];
        this.interpolation = interpolation;
        this.preInfinity = preInfinity;
        this.postInfinity = postInfinity;
        this.isStatic = isStatic;
        this.validateKeyframes();
        this.updateStaticFlag();
    }

    /**
     * Evaluate the curve at a given time
     * @param time - The time at which to evaluate the curve
     * @returns The value at the specified time
     * @throws {TypeError} If time is not a valid number
     */
    evaluate(time: number): number {
        if (!Number.isFinite(time)) {
            throw new TypeError('Time must be a finite number');
        }

        if (this.isStatic) {
            return this.keys.length > 0 ? this.keys[0].value : 0;
        }

        if (this.keys.length === 0) return 0;
        if (this.keys.length === 1) return this.keys[0].value;

        const firstTime = this.keys[0].time;
        const lastTime = this.keys[this.keys.length - 1].time;

        if (time < firstTime) {
            return this.handlePreInfinity(time, firstTime, lastTime);
        }

        if (time > lastTime) {
            return this.handlePostInfinity(time, firstTime, lastTime);
        }

        const segment = this.findSegment(time);
        if (segment.index < 0) return this.keys[0].value;

        const key0 = this.keys[segment.index];
        const key1 = this.keys[segment.index + 1];

        switch (this.interpolation) {
            case InterpolationType.STEP:
                return key0.value;
            case InterpolationType.CUBIC:
                return this.cubicInterpolate(
                    key0.value, key1.value,
                    key0.outTangent || 0, key1.inTangent || 0,
                    segment.t
                );
            case InterpolationType.LINEAR:
            default:
                return this.linearInterpolate(key0.value, key1.value, segment.t);
        }
    }

    /**
     * Add a new keyframe to the curve
     * @param key - The keyframe to add
     * @throws {TypeError} If key is invalid
     */
    addKey(key: Keyframe): void {
        if (!this.isValidKeyframe(key)) {
            throw new TypeError('Invalid keyframe: time and value must be finite numbers');
        }

        const index = this.findKey(key.time);
        if (index >= 0) {
            this.keys[index] = { ...key };
        } else {
            const insertIndex = this.keys.findIndex(k => k.time > key.time);
            if (insertIndex === -1) {
                this.keys.push({ ...key });
            } else {
                this.keys.splice(insertIndex, 0, { ...key });
            }
        }
        this.updateStaticFlag();
    }

    /**
     * Remove a keyframe by index
     * @param index - The index of the keyframe to remove
     * @throws {RangeError} If index is out of bounds
     */
    removeKey(index: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.keys.length) {
            throw new RangeError(`Invalid index: ${index}. Must be between 0 and ${this.keys.length - 1}`);
        }
        this.keys.splice(index, 1);
        this.updateStaticFlag();
    }

    /**
     * Set a keyframe at the specified index
     * @param index - The index to set
     * @param key - The new keyframe data
     * @throws {RangeError} If index is out of bounds
     * @throws {TypeError} If key is invalid
     */
    setKey(index: number, key: Keyframe): void {
        if (!Number.isInteger(index) || index < 0 || index >= this.keys.length) {
            throw new RangeError(`Invalid index: ${index}. Must be between 0 and ${this.keys.length - 1}`);
        }
        if (!this.isValidKeyframe(key)) {
            throw new TypeError('Invalid keyframe: time and value must be finite numbers');
        }
        this.keys[index] = { ...key };
        this.updateStaticFlag();
    }

    /**
     * Find the index of a keyframe at the specified time
     * @param time - The time to search for
     * @returns The index of the keyframe, or -1 if not found
     * @throws {TypeError} If time is not a valid number
     */
    findKey(time: number): number {
        if (!Number.isFinite(time)) {
            throw new TypeError('Time must be a finite number');
        }
        return this.keys.findIndex(k => Math.abs(k.time - time) < 0.0001);
    }

    /**
     * Optimize the curve by removing redundant keyframes
     * @param threshold - The maximum deviation allowed (default: 0.001)
     * @throws {TypeError} If threshold is not a valid positive number
     */
    optimize(threshold: number = 0.001): void {
        if (!Number.isFinite(threshold) || threshold < 0) {
            throw new TypeError('Threshold must be a non-negative number');
        }

        if (this.keys.length <= 2) return;

        const optimized: Keyframe[] = [this.keys[0]];
        
        for (let i = 1; i < this.keys.length - 1; i++) {
            const prev = this.keys[i - 1];
            const curr = this.keys[i];
            const next = this.keys[i + 1];

            const midTime = (prev.time + next.time) / 2;
            const actualValue = curr.value;
            const interpolatedValue = this.linearInterpolate(prev.value, next.value, (midTime - prev.time) / (next.time - prev.time));

            if (Math.abs(actualValue - interpolatedValue) > threshold) {
                optimized.push(curr);
            }
        }

        optimized.push(this.keys[this.keys.length - 1]);
        this.keys = optimized;
    }

    /**
     * Get the tangent at a keyframe
     * @param index - The keyframe index
     * @param isOut - Whether to get the outgoing (true) or incoming (false) tangent
     * @returns The tangent value
     * @throws {RangeError} If index is out of bounds
     */
    getTangent(index: number, isOut: boolean = true): number {
        if (!Number.isInteger(index) || index < 0 || index >= this.keys.length) {
            throw new RangeError(`Invalid index: ${index}. Must be between 0 and ${this.keys.length - 1}`);
        }

        const key = this.keys[index];
        if (isOut && key.outTangent !== undefined) return key.outTangent;
        if (!isOut && key.inTangent !== undefined) return key.inTangent;

        if (this.keys.length === 1) return 0;

        if (isOut) {
            if (index === this.keys.length - 1) {
                return index > 0 ? (key.value - this.keys[index - 1].value) / (key.time - this.keys[index - 1].time) : 0;
            } else {
                const next = this.keys[index + 1];
                return (next.value - key.value) / (next.time - key.time);
            }
        } else {
            if (index === 0) {
                return index < this.keys.length - 1 ? (this.keys[index + 1].value - key.value) / (this.keys[index + 1].time - key.time) : 0;
            } else {
                const prev = this.keys[index - 1];
                return (key.value - prev.value) / (key.time - prev.time);
            }
        }
    }

    /**
     * Get the start time of the curve
     * @returns The time of the first keyframe, or 0 if no keyframes
     */
    getStartTime(): number {
        return this.keys.length > 0 ? this.keys[0].time : 0;
    }

    /**
     * Get the end time of the curve
     * @returns The time of the last keyframe, or 0 if no keyframes
     */
    getEndTime(): number {
        return this.keys.length > 0 ? this.keys[this.keys.length - 1].time : 0;
    }

    /**
     * Get the number of keyframes
     * @returns The number of keyframes
     */
    getKeyCount(): number {
        return this.keys.length;
    }

    /**
     * Get a keyframe at the specified index
     * @param index - The index to get
     * @returns A copy of the keyframe
     * @throws {RangeError} If index is out of bounds
     */
    getKey(index: number): Keyframe {
        if (!Number.isInteger(index) || index < 0 || index >= this.keys.length) {
            throw new RangeError(`Invalid index: ${index}. Must be between 0 and ${this.keys.length - 1}`);
        }
        return { ...this.keys[index] };
    }

    /**
     * Clear all keyframes
     */
    clear(): void {
        this.keys = [];
        this.updateStaticFlag();
    }

    /**
     * Create a deep copy of this curve
     * @returns A new AnimCurve instance with the same data
     */
    clone(): AnimCurve {
        return new AnimCurve(
            this.keys.map(k => ({ ...k })),
            this.interpolation,
            this.preInfinity,
            this.postInfinity,
            this.isStatic
        );
    }

    private handlePreInfinity(time: number, firstTime: number, lastTime: number): number {
        const duration = lastTime - firstTime;
        if (duration === 0) return this.keys[0].value;

        switch (this.preInfinity) {
            case InfinityType.LINEAR:
                const firstSlope = this.getTangent(0, true);
                return this.keys[0].value + firstSlope * (time - firstTime);
            case InfinityType.CYCLE:
                const cycleTime = this.wrapTime(time, firstTime, lastTime, true);
                return this.evaluate(cycleTime);
            case InfinityType.CYCLE_RELATIVE:
                const cycleTimeRel = this.wrapTime(time, firstTime, lastTime, true);
                const cycleCount = Math.floor((firstTime - time) / duration);
                return this.evaluate(cycleTimeRel) + cycleCount * (this.keys[this.keys.length - 1].value - this.keys[0].value);
            case InfinityType.OSCILLATE:
                const oscillateTime = this.wrapTime(time, firstTime, lastTime, true, true);
                return this.evaluate(oscillateTime);
            case InfinityType.CONSTANT:
            default:
                return this.keys[0].value;
        }
    }

    private handlePostInfinity(time: number, firstTime: number, lastTime: number): number {
        const duration = lastTime - firstTime;
        if (duration === 0) return this.keys[this.keys.length - 1].value;

        switch (this.postInfinity) {
            case InfinityType.LINEAR:
                const lastSlope = this.getTangent(this.keys.length - 1, false);
                return this.keys[this.keys.length - 1].value + lastSlope * (time - lastTime);
            case InfinityType.CYCLE:
                const cycleTime = this.wrapTime(time, firstTime, lastTime, false);
                return this.evaluate(cycleTime);
            case InfinityType.CYCLE_RELATIVE:
                const cycleTimeRel = this.wrapTime(time, firstTime, lastTime, false);
                const cycleCount = Math.floor((time - lastTime) / duration);
                return this.evaluate(cycleTimeRel) + cycleCount * (this.keys[this.keys.length - 1].value - this.keys[0].value);
            case InfinityType.OSCILLATE:
                const oscillateTime = this.wrapTime(time, firstTime, lastTime, false, true);
                return this.evaluate(oscillateTime);
            case InfinityType.CONSTANT:
            default:
                return this.keys[this.keys.length - 1].value;
        }
    }

    private wrapTime(time: number, firstTime: number, lastTime: number, isPre: boolean, oscillate: boolean = false): number {
        const duration = lastTime - firstTime;
        if (duration === 0) return firstTime;

        let t = time;
        if (isPre) {
            const offset = firstTime - t;
            const cycles = Math.floor(offset / duration);
            t = lastTime - (offset - cycles * duration);
        } else {
            const offset = t - lastTime;
            const cycles = Math.floor(offset / duration);
            t = firstTime + (offset - cycles * duration);
        }

        if (oscillate && Math.floor((time - firstTime) / duration) % 2 === 1) {
            t = lastTime - (t - firstTime) + firstTime;
        }

        return t;
    }

    private findSegment(time: number): { index: number; t: number } {
        for (let i = 0; i < this.keys.length - 1; i++) {
            const key0 = this.keys[i];
            const key1 = this.keys[i + 1];
            
            if (time >= key0.time && time <= key1.time) {
                const t = (time - key0.time) / (key1.time - key0.time);
                return { index: i, t: Math.max(0, Math.min(1, t)) };
            }
        }
        return { index: -1, t: 0 };
    }

    private linearInterpolate(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private cubicInterpolate(p0: number, p1: number, m0: number, m1: number, t: number): number {
        const t2 = t * t;
        const t3 = t2 * t;
        
        const a = 2 * t3 - 3 * t2 + 1;
        const b = t3 - 2 * t2 + t;
        const c = t3 - t2;
        const d = -2 * t3 + 3 * t2;
        
        return a * p0 + b * m0 + c * m1 + d * p1;
    }

    private updateStaticFlag(): void {
        this.isStatic = this.keys.length <= 1;
    }

    private validateKeyframes(): void {
        for (let i = 0; i < this.keys.length; i++) {
            if (!this.isValidKeyframe(this.keys[i])) {
                throw new TypeError(`Invalid keyframe at index ${i}: time and value must be finite numbers`);
            }
        }
    }

    private isValidKeyframe(key: any): key is Keyframe {
        return key &&
               typeof key === 'object' &&
               Number.isFinite(key.time) &&
               Number.isFinite(key.value) &&
               (key.inTangent === undefined || Number.isFinite(key.inTangent)) &&
               (key.outTangent === undefined || Number.isFinite(key.outTangent));
    }
}
