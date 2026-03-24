import { AnimClip, AnimState, AnimSample } from './index';

interface Transition {
  condition: (params: Map<string, Parameter>) => boolean;
  target: string;
}

export class AnimController {
  private states: Map<string, AnimState> = new Map();
  private parameters: Map<string, Parameter> = new Map();
  private currentState: AnimState | null = null;
  private blendTime: number = 0;
  private blendDuration: number = 0;
  private sourceState: AnimState | null = null;
  private targetState: AnimState | null = null;
  private blendFactor: number = 0;
  private stateTime: number = 0;

  /**
   * Register a new animation state.
   * @param name Unique identifier for the state.
   * @param clip Animation clip to associate with this state.
   * @throws {Error} If name is empty or clip is invalid.
   */
  addState(name: string, clip: AnimClip): void {
    if (!name || name.trim().length === 0) {
      throw new Error('State name must be a non-empty string.');
    }
    if (!clip) {
      throw new Error('AnimClip is required.');
    }

    const state = new AnimState(name, clip);
    this.states.set(name, state);
    if (!this.currentState) {
      this.currentState = state;
    }
  }

  /**
   * Update or create a parameter value.
   * @param name Parameter identifier.
   * @param value Numeric or boolean value.
   * @throws {Error} If name is empty or value is neither number nor boolean.
   */
  setParameter(name: string, value: number | boolean): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Parameter name must be a non-empty string.');
    }
    if (typeof value !== 'number' && typeof value !== 'boolean') {
      throw new Error('Parameter value must be a number or boolean.');
    }
    this.parameters.set(name, value);
  }

  /**
   * Transition to another state with optional blending.
   * @param to Target state name.
   * @param duration Blend duration in seconds (default 0.3).
   * @throws {Error} If target state does not exist.
   */
  transition(to: string, duration: number = 0.3): void {
    if (!to || to.trim().length === 0) {
      throw new Error('Target state name must be a non-empty string.');
    }
    if (duration < 0) {
      throw new Error('Duration must be non-negative.');
    }

    const targetState = this.states.get(to);
    if (!targetState) {
      throw new Error(`State '${to}' does not exist.`);
    }
    if (targetState === this.currentState) {
      return;
    }

    this.sourceState = this.currentState;
    this.targetState = targetState;
    this.blendDuration = duration;
    this.blendTime = 0;
    this.blendFactor = 0;
  }

  /**
   * Advance the controller by a time step.
   * @param dt Delta time in seconds.
   * @throws {Error} If dt is negative or not finite.
   */
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) {
      throw new Error('dt must be a non-negative finite number.');
    }

    if (this.sourceState && this.targetState) {
      this.blendTime += dt;
      this.blendFactor = this.blendDuration === 0 ? 1 : Math.min(this.blendTime / this.blendDuration, 1);

      if (this.blendFactor >= 1) {
        this.currentState = this.targetState;
        this.sourceState = null;
        this.targetState = null;
        this.blendFactor = 0;
      }
    }

    if (this.currentState) {
      this.stateTime += dt * this.currentState.speed;
    }

    if (this.currentState && this.currentState.transitions) {
      for (const transition of this.currentState.transitions) {
        if (transition.condition(this.parameters)) {
          this.transition(transition.target);
          break;
        }
      }
    }
  }

  /**
   * Compute the current blended animation pose.
   * @returns The blended animation sample.
   */
  evaluate(): AnimSample {
    if (!this.currentState) {
      return { time: 0, values: new Map() };
    }

    if (this.sourceState && this.targetState) {
      const sourceSample = this.sourceState.evaluate(this.stateTime);
      const targetSample = this.targetState.evaluate(this.stateTime);

      const blendedValues = new Map<string, number[]>();
      const allKeys = new Set([...sourceSample.values.keys(), ...targetSample.values.keys()]);

      for (const key of allKeys) {
        const src = sourceSample.values.get(key) || [];
        const tgt = targetSample.values.get(key) || [];
        const maxLen = Math.max(src.length, tgt.length);
        const blended = new Array<number>(maxLen).fill(0);

        for (let i = 0; i < maxLen; i++) {
          const a = src[i] || 0;
          const b = tgt[i] || 0;
          blended[i] = a + (b - a) * this.blendFactor;
        }

        blendedValues.set(key, blended);
      }

      return {
        time: this.stateTime,
        values: blendedValues
      };
    }

    return this.currentState.evaluate(this.stateTime);
  }

  /**
   * Retrieve a parameter value.
   * @param name Parameter name.
   * @returns The parameter value or undefined if not found.
   */
  getParameter(name: string): Parameter | undefined {
    if (!name || name.trim().length === 0) {
      throw new Error('Parameter name must be a non-empty string.');
    }
    return this.parameters.get(name);
  }

  /**
   * Get the name of the current state.
   * @returns Current state name or null if none.
   */
  getCurrentStateName(): string | null {
    return this.currentState ? this.currentState.name : null;
  }

  /**
   * Check if a state exists.
   * @param name State name.
   * @returns True if the state exists.
   */
  hasState(name: string): boolean {
    if (!name || name.trim().length === 0) {
      throw new Error('State name must be a non-empty string.');
    }
    return this.states.has(name);
  }

  /**
   * Remove a state.
   * @param name State name.
   * @returns True if the state was removed.
   * @throws {Error} If attempting to remove the current state.
   */
  removeState(name: string): boolean {
    if (!name || name.trim().length === 0) {
      throw new Error('State name must be a non-empty string.');
    }
    if (this.currentState && this.currentState.name === name) {
      throw new Error('Cannot remove the current active state.');
    }
    return this.states.delete(name);
  }

  /**
   * Reset the controller to its initial state.
   */
  reset(): void {
    this.blendTime = 0;
    this.blendDuration = 0;
    this.blendFactor = 0;
    this.stateTime = 0;
    this.sourceState = null;
    this.targetState = null;
  }

  /**
   * Get all state names.
   * @returns Array of state names.
   */
  getStateNames(): string[] {
    return Array.from(this.states.keys());
  }

  /**
   * Get all parameter names.
   * @returns Array of parameter names.
   */
  getParameterNames(): string[] {
    return Array.from(this.parameters.keys());
  }
}