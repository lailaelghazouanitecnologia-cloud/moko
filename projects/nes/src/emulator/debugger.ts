import { CPU6502 } from '../cpu';
import { MemoryBus } from '../memory';

export interface DebugState {
    enabled: boolean;
    stepMode: boolean;
    breakpoints: number[];
    watchpoints: [number, string][];
    callStack: number[];
}

export class Debugger {
    private breakpoints: Set<number> = new Set();
    private watchpoints: Map<number, string> = new Map();
    private isEnabled: boolean = false;
    private stepMode: boolean = false;
    private callStack: number[] = [];

    addBreakpoint(address: number): void {
        this.breakpoints.add(address);
    }

    removeBreakpoint(address: number): void {
        this.breakpoints.delete(address);
    }

    hasBreakpoint(address: number): boolean {
        return this.breakpoints.has(address);
    }

    addWatchpoint(address: number, name: string): void {
        this.watchpoints.set(address, name);
    }

    removeWatchpoint(address: number): void {
        this.watchpoints.delete(address);
    }

    checkWatchpoints(address: number, value: number): void {
        if (this.watchpoints.has(address)) {
            const name = this.watchpoints.get(address)!;
            console.log(`Watchpoint hit: ${name} at 0x${address.toString(16).padStart(4, '0')} = 0x${value.toString(16).padStart(2, '0')}`);
        }
    }

    enable(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    setStepMode(step: boolean): void {
        this.stepMode = step;
    }

    isStepMode(): boolean {
        return this.stepMode;
    }

    getCallStack(): number[] {
        return [...this.callStack];
    }

    pushStack(address: number): void {
        this.callStack.push(address);
    }

    popStack(): number {
        return this.callStack.pop() ?? 0;
    }

    evaluateCondition(condition: string): boolean {
        try {
            return eval(condition);
        } catch {
            return false;
        }
    }

    getState(): DebugState {
        return {
            enabled: this.isEnabled,
            stepMode: this.stepMode,
            breakpoints: Array.from(this.breakpoints),
            watchpoints: Array.from(this.watchpoints.entries()),
            callStack: [...this.callStack]
        };
    }

    clearAll(): void {
        this.breakpoints.clear();
        this.watchpoints.clear();
        this.callStack.length = 0;
    }

    listBreakpoints(): number[] {
        return Array.from(this.breakpoints);
    }

    listWatchpoints(): [number, string][] {
        return Array.from(this.watchpoints.entries());
    }
}
