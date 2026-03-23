import { EventEmitter } from '../core';
import { Vec3, Quat } from '../math';
import { AnimCurve } from './anim-curve';

export class AnimTrack {
    name: string;
    curves: AnimCurve[];
    duration: number;
    loop: boolean;

    constructor(name: string, curves: AnimCurve[] = [], duration: number = 0, loop: boolean = false) {
        this.name = name;
        this.curves = curves;
        this.duration = duration;
        this.loop = loop;
    }

    addCurve(curve: AnimCurve): void {
        this.curves.push(curve);
    }

    removeCurve(curve: AnimCurve): void {
        const index = this.curves.indexOf(curve);
        if (index !== -1) {
            this.curves.splice(index, 1);
        }
    }

    getCurve(index: number): AnimCurve | null {
        return this.curves[index] || null;
    }

    evaluate(time: number): Record<string, any> {
        const result: Record<string, any> = {};
        
        for (const curve of this.curves) {
            const value = curve.evaluate(time, this.duration, this.loop);
            if (curve.targetPath) {
                result[curve.targetPath] = value;
            }
        }
        
        return result;
    }

    getDuration(): number {
        return this.duration;
    }

    setDuration(duration: number): void {
        this.duration = Math.max(0, duration);
    }

    clone(): AnimTrack {
        const clonedCurves = this.curves.map(curve => curve.clone());
        return new AnimTrack(this.name, clonedCurves, this.duration, this.loop);
    }

    destroy(): void {
        for (const curve of this.curves) {
            curve.destroy();
        }
        this.curves.length = 0;
    }
}
