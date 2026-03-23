import { AnimCurve } from './anim-curve';

export interface AnimEvent {
    time: number;
    name: string;
    data?: any;
}

export class AnimClip {
    name: string;
    duration: number;
    curves: AnimCurve[];
    events: AnimEvent[];

    constructor(name: string = '', duration: number = 0) {
        this.name = name;
        this.duration = duration;
        this.curves = [];
        this.events = [];
    }

    evaluate(time: number, loop: boolean): Map<string, any> {
        const result = new Map<string, any>();
        
        if (loop && this.duration > 0) {
            time = time % this.duration;
        }
        
        for (const curve of this.curves) {
            const value = curve.evaluate(time);
            if (value !== undefined) {
                result.set(curve.path, value);
            }
        }
        
        return result;
    }

    getDuration(): number {
        return this.duration;
    }

    addCurve(path: string, curve: AnimCurve): void {
        curve.path = path;
        this.curves.push(curve);
    }

    removeCurve(path: string): void {
        const index = this.curves.findIndex(c => c.path === path);
        if (index !== -1) {
            this.curves.splice(index, 1);
        }
    }

    getCurve(path: string): AnimCurve | null {
        return this.curves.find(c => c.path === path) || null;
    }

    addEvent(time: number, name: string, data?: any): void {
        this.events.push({ time, name, data });
        this.events.sort((a, b) => a.time - b.time);
    }

    removeEvent(index: number): void {
        if (index >= 0 && index < this.events.length) {
            this.events.splice(index, 1);
        }
    }

    getEvents(): AnimEvent[] {
        return [...this.events];
    }

    clone(): AnimClip {
        const clip = new AnimClip(this.name, this.duration);
        
        for (const curve of this.curves) {
            clip.curves.push(curve.clone());
        }
        
        for (const event of this.events) {
            clip.events.push({
                time: event.time,
                name: event.name,
                data: event.data
            });
        }
        
        return clip;
    }

    optimize(tolerance: number): void {
        for (const curve of this.curves) {
            curve.optimize(tolerance);
        }
    }
}
