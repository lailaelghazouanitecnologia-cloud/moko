import { AnimState } from './anim-state';
import { AnimTrack } from './anim-track';

interface AnimTransition {
    from: string;
    to: string;
    condition?: string;
    fade: number;
}

export class AnimController {
    private states: Map<string, AnimState> = new Map();
    private currentState: AnimState | null = null;
    private previousState: AnimState | null = null;
    private transitions: AnimTransition[] = [];
    private parameters: Map<string, any> = new Map();
    private blendTime: number = 0;
    private blendDuration: number = 0;
    private isBlending: boolean = false;

    update(dt: number): void {
        this.updateTracks(dt);
        
        if (this.isBlending) {
            this.blendTime += dt;
            if (this.blendTime >= this.blendDuration) {
                this.isBlending = false;
                this.previousState = null;
            }
        }

        for (const transition of this.transitions) {
            if (transition.from === this.getCurrentStateName() && this.evaluateCondition(transition.condition)) {
                this.transition(transition.to, transition.fade);
                break;
            }
        }
    }

    addState(name: string, state: AnimState): void {
        this.states.set(name, state);
    }

    removeState(name: string): void {
        this.states.delete(name);
        this.transitions = this.transitions.filter(t => t.from !== name && t.to !== name);
        
        if (this.currentState && this.getCurrentStateName() === name) {
            this.currentState = null;
        }
        if (this.previousState && this.previousState.name === name) {
            this.previousState = null;
        }
    }

    getState(name: string): AnimState | null {
        return this.states.get(name) || null;
    }

    setParameter(name: string, value: any): void {
        this.parameters.set(name, value);
    }

    getParameter(name: string): any {
        return this.parameters.get(name);
    }

    transition(to: string, fade: number): void {
        const targetState = this.getState(to);
        if (!targetState) return;

        if (this.currentState) {
            this.previousState = this.currentState;
            this.blendTime = 0;
            this.blendDuration = fade;
            this.isBlending = true;
        }

        this.currentState = targetState;
        this.currentState.reset();
    }

    play(name: string): void {
        const state = this.getState(name);
        if (state) {
            this.currentState = state;
            this.currentState.reset();
            this.previousState = null;
            this.isBlending = false;
        }
    }

    updateTracks(dt: number): void {
        if (this.currentState) {
            this.currentState.update(dt);
        }
        if (this.previousState) {
            this.previousState.update(dt);
        }
    }

    evaluate(): Map<string, any> {
        const result = new Map<string, any>();

        if (this.isBlending && this.currentState && this.previousState) {
            const blendFactor = this.blendTime / this.blendDuration;
            const currentData = this.currentState.evaluate();
            const previousData = this.previousState.evaluate();

            for (const [key, currentValue] of currentData) {
                const previousValue = previousData.get(key);
                if (previousValue !== undefined) {
                    if (typeof currentValue === 'number' && typeof previousValue === 'number') {
                        result.set(key, previousValue + (currentValue - previousValue) * blendFactor);
                    } else {
                        result.set(key, blendFactor > 0.5 ? currentValue : previousValue);
                    }
                } else {
                    result.set(key, currentValue);
                }
            }
        } else if (this.currentState) {
            return this.currentState.evaluate();
        }

        return result;
    }

    addTransition(from: string, to: string, condition?: string, fade: number = 0.3): void {
        this.transitions.push({ from, to, condition, fade });
    }

    removeTransition(from: string, to: string): void {
        this.transitions = this.transitions.filter(t => !(t.from === from && t.to === to));
    }

    getCurrentStateName(): string {
        return this.currentState ? this.currentState.name : '';
    }

    private evaluateCondition(condition?: string): boolean {
        if (!condition) return true;
        
        const parts = condition.split(' ');
        if (parts.length < 3) return false;

        const param = this.getParameter(parts[0]);
        const operator = parts[1];
        const value = parts[2];

        if (param === undefined) return false;

        switch (operator) {
            case '>':
                return param > parseFloat(value);
            case '<':
                return param < parseFloat(value);
            case '==':
                return param == value;
            case '!=':
                return param != value;
            default:
                return false;
        }
    }
}
