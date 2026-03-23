import { EventEmitter } from 'events';

export interface GamepadButton {
  pressed: boolean;
  touched: boolean;
  value: number;
}

export interface GamepadHapticActuator {
  type: string;
  playEffect(type: string, params: { duration: number; strongMagnitude: number; weakMagnitude: number }): Promise<void>;
  reset(): Promise<void>;
}

export interface GamepadPose {
  hasOrientation: boolean;
  hasPosition: boolean;
  position: Float32Array | null;
  linearVelocity: Float32Array | null;
  linearAcceleration: Float32Array | null;
  orientation: Float32Array | null;
  angularVelocity: Float32Array | null;
  angularAcceleration: Float32Array | null;
}

export class Gamepad extends EventEmitter {
  private _id: string;
  private _index: number;
  private _connected: boolean;
  private _timestamp: number;
  private _mapping: string;
  private _axes: number[];
  private _buttons: GamepadButton[];
  private _hapticActuators: GamepadHapticActuator[];
  private _pose: GamepadPose | null;

  constructor(index: number, id: string, mapping: string = '') {
    super();
    this._id = id;
    this._index = index;
    this._connected = true;
    this._timestamp = performance.now();
    this._mapping = mapping;
    this._axes = [];
    this._buttons = [];
    this._hapticActuators = [];
    this._pose = null;
  }

  get id(): string {
    return this._id;
  }

  get index(): number {
    return this._index;
  }

  get connected(): boolean {
    return this._connected;
  }

  get timestamp(): number {
    return this._timestamp;
  }

  get mapping(): string {
    return this._mapping;
  }

  get axes(): number[] {
    return [...this._axes];
  }

  get buttons(): GamepadButton[] {
    return this._buttons.map(b => ({ ...b }));
  }

  get hapticActuators(): GamepadHapticActuator[] {
    return [...this._hapticActuators];
  }

  get pose(): GamepadPose | null {
    return this._pose ? { ...this._pose } : null;
  }

  update(axes: number[], buttons: GamepadButton[], timestamp: number): void {
    const axesChanged = this._axes.length !== axes.length || this._axes.some((v, i) => v !== axes[i]);
    const buttonsChanged = this._buttons.length !== buttons.length || this._buttons.some((b, i) => 
      b.pressed !== buttons[i].pressed || b.touched !== buttons[i].touched || b.value !== buttons[i].value
    );

    this._axes = [...axes];
    this._buttons = buttons.map(b => ({ ...b }));
    this._timestamp = timestamp;

    if (axesChanged) this.emit('axeschanged', this._axes);
    if (buttonsChanged) this.emit('buttonschanged', this._buttons);
  }

  setConnected(connected: boolean): void {
    if (this._connected !== connected) {
      this._connected = connected;
      this.emit('connectedchanged', connected);
      if (!connected) this.emit('disconnected');
    }
  }

  setPose(pose: GamepadPose | null): void {
    this._pose = pose ? { ...pose } : null;
    this.emit('posechanged', this._pose);
  }

  addHapticActuator(actuator: GamepadHapticActuator): void {
    this._hapticActuators.push(actuator);
    this.emit('hapticactuatoradded', actuator);
  }

  removeHapticActuator(index: number): void {
    if (index >= 0 && index < this._hapticActuators.length) {
      const removed = this._hapticActuators.splice(index, 1)[0];
      this.emit('hapticactuatorremoved', removed);
    }
  }

  vibrate(duration: number, strongMagnitude: number, weakMagnitude: number): Promise<void> {
    const promises = this._hapticActuators.map(a => 
      a.playEffect('dual-rumble', { duration, strongMagnitude, weakMagnitude })
    );
    return Promise.all(promises).then(() => {});
  }

  resetVibration(): Promise<void> {
    const promises = this._hapticActuators.map(a => a.reset());
    return Promise.all(promises).then(() => {});
  }

  dispose(): void {
    this.resetVibration().then(() => {
      this.removeAllListeners();
      this._connected = false;
    });
  }
}
