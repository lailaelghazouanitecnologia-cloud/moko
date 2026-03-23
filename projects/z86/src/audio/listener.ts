import { EventEmitter } from '../core/EventEmitter';
import { Vec3 } from '../math/Vec3';

export class Listener extends EventEmitter {
  private _position: Vec3 = new Vec3(0, 0, 0);
  private _orientation: Vec3 = new Vec3(0, 0, -1);
  private _up: Vec3 = new Vec3(0, 1, 0);
  private _velocity: Vec3 = new Vec3(0, 0, 0);
  private _dopplerFactor: number = 1;
  private _speedOfSound: number = 343.3;

  constructor() {
    super();
  }

  get position(): Vec3 {
    return this._position.clone();
  }

  set position(value: Vec3) {
    this._position = value.clone();
    this.emit('positionChanged', this._position);
  }

  get orientation(): Vec3 {
    return this._orientation.clone();
  }

  set orientation(value: Vec3) {
    this._orientation = value.clone();
    this._orientation.normalize();
    this.emit('orientationChanged', this._orientation);
  }

  get up(): Vec3 {
    return this._up.clone();
  }

  set up(value: Vec3) {
    this._up = value.clone();
    this._up.normalize();
    this.emit('upChanged', this._up);
  }

  get velocity(): Vec3 {
    return this._velocity.clone();
  }

  set velocity(value: Vec3) {
    this._velocity = value.clone();
    this.emit('velocityChanged', this._velocity);
  }

  get dopplerFactor(): number {
    return this._dopplerFactor;
  }

  set dopplerFactor(value: number) {
    this._dopplerFactor = Math.max(0, value);
    this.emit('dopplerFactorChanged', this._dopplerFactor);
  }

  get speedOfSound(): number {
    return this._speedOfSound;
  }

  set speedOfSound(value: number) {
    this._speedOfSound = Math.max(0.01, value);
    this.emit('speedOfSoundChanged', this._speedOfSound);
  }

  setPosition(x: number, y: number, z: number): void {
    this._position.set(x, y, z);
    this.emit('positionChanged', this._position);
  }

  setOrientation(x: number, y: number, z: number, upX: number, upY: number, upZ: number): void {
    this._orientation.set(x, y, z);
    this._up.set(upX, upY, upZ);
    this._orientation.normalize();
    this._up.normalize();
    this.emit('orientationChanged', this._orientation);
    this.emit('upChanged', this._up);
  }

  setVelocity(x: number, y: number, z: number): void {
    this._velocity.set(x, y, z);
    this.emit('velocityChanged', this._velocity);
  }

  reset(): void {
    this._position.set(0, 0, 0);
    this._orientation.set(0, 0, -1);
    this._up.set(0, 1, 0);
    this._velocity.set(0, 0, 0);
    this._dopplerFactor = 1;
    this._speedOfSound = 343.3;
    this.emit('reset');
  }

  clone(): Listener {
    const cloned = new Listener();
    cloned._position = this._position.clone();
    cloned._orientation = this._orientation.clone();
    cloned._up = this._up.clone();
    cloned._velocity = this._velocity.clone();
    cloned._dopplerFactor = this._dopplerFactor;
    cloned._speedOfSound = this._speedOfSound;
    return cloned;
  }

  copy(listener: Listener): this {
    this._position.copy(listener._position);
    this._orientation.copy(listener._orientation);
    this._up.copy(listener._up);
    this._velocity.copy(listener._velocity);
    this._dopplerFactor = listener._dopplerFactor;
    this._speedOfSound = listener._speedOfSound;
    return this;
  }

  equals(listener: Listener): boolean {
    return this._position.equals(listener._position) &&
           this._orientation.equals(listener._orientation) &&
           this._up.equals(listener._up) &&
           this._velocity.equals(listener._velocity) &&
           Math.abs(this._dopplerFactor - listener._dopplerFactor) < 1e-6 &&
           Math.abs(this._speedOfSound - listener._speedOfSound) < 1e-6;
  }
}
