
import { Observable, Subscription } from '../core';

export interface StateSnapshot {
  timestamp: number;
  values: Record<string, unknown>;
}

export class StateInspector {
  private tracked: Map<string, Observable<unknown>> = new Map();
  private history: StateSnapshot[] = [];
  private maxHistory: number;

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }

  track(name: string, observable: Observable<unknown>): Subscription {
    this.tracked.set(name, observable);
    return observable.subscribe({
      next: () => this.snapshot(),
    });
  }

  private snapshot(): void {
    const values: Record<string, unknown> = {};
    for (const [name, obs] of this.tracked) {
      values[name] = obs.value;
    }
    this.history.push({ timestamp: Date.now(), values });
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getHistory(): StateSnapshot[] {
    return [...this.history];
  }

  getCurrentState(): Record<string, unknown> {
    const state: Record<string, unknown> = {};
    for (const [name, obs] of this.tracked) {
      state[name] = obs.value;
    }
    return state;
  }
}
