import { EventEmitter } from '../core';
import { Vec3 } from '../math';

export class Listener extends EventEmitter {
  private _position: Vec3;
  private _orientation: { forward: Vec3; up: Vec3 };
  private _velocity: Vec3;

  constructor() {
    super();
    this._position = new Vec3(0, 0, 0);
    this._orientation = {
      forward: new Vec3(0, 0, -1),
      up: new Vec3(0, 1, 0)
    };
    this._velocity = new Vec3(0, 0, 0);
  }

  get position(): Vec3 {
    return this._position.clone();
  }

  set position(pos: Vec3) {
    this._position = pos.clone();
    this.emit('positionChanged', this._position);
  }

  get orientation(): { forward: Vec3; up: Vec3 } {
    return {
      forward: this._orientation.forward.clone(),
      up: this._orientation.up.clone()
    };
  }

  set orientation(orient: { forward: Vec3; up: Vec3 }) {
    this._orientation = {
      forward: orient.forward.clone().normalize(),
      up: orient.up.clone().normalize()
    };
    this.emit('orientationChanged', this._orientation);
  }

  get velocity(): Vec3 {
    return this._velocity.clone();
  }

  set velocity(vel: Vec3) {
    this._velocity = vel.clone();
    this.emit('velocityChanged', this._velocity);
  }

  setPosition(x: number, y: number, z: number): void {
    this._position.set(x, y, z);
    this.emit('positionChanged', this._position);
  }

  setOrientation(fx: number, fy: number, fz: number, ux: number, uy: number, uz: number): void {
    this._orientation.forward.set(fx, fy, fz).normalize();
    this._orientation.up.set(ux, uy, uz).normalize();
    this.emit('orientationChanged', this._orientation);
  }

  setVelocity(x: number, y: number, z: number): void {
    this._velocity.set(x, y, z);
    this.emit('velocityChanged', this._velocity);
  }
}
