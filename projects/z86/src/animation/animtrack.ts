import { EventEmitter } from '../core/eventemitter';
import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';
import { AnimKey } from './animkey';
import { AnimCurve } from './animcurve';
import { AnimData } from './animdata';

export class AnimTrack {
    name: string;
    keys: AnimKey[];
    curves: AnimCurve[];
    data: AnimData;

    constructor(name: string, keys: AnimKey[], curves: AnimCurve[], data: AnimData) {
        this.name = name;
        this.keys = keys;
        this.curves = curves;
        this.data = data;
    }

    getDuration(): number {
        let maxTime = 0;
        for (const key of this.keys) {
            if (key.time > maxTime) {
                maxTime = key.time;
            }
        }
        return maxTime;
    }

    getKey(index: number): AnimKey | null {
        if (index < 0 || index >= this.keys.length) {
            return null;
        }
        return this.keys[index];
    }

    getCurve(index: number): AnimCurve | null {
        if (index < 0 || index >= this.curves.length) {
            return null;
        }
        return this.curves[index];
    }

    eval(time: number, result?: any): any {
        if (!result) {
            result = {};
        }
        for (const curve of this.curves) {
            const value = curve.eval(time, this.keys);
            if (value !== undefined) {
                result[curve.path] = value;
            }
        }
        return result;
    }

    clone(): AnimTrack {
        const clonedKeys = this.keys.map(k => k.clone());
        const clonedCurves = this.curves.map(c => c.clone());
        const clonedData = this.data.clone();
        return new AnimTrack(this.name, clonedKeys, clonedCurves, clonedData);
    }
}
