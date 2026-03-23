import { EventEmitter } from '../core';
import { Vec2 } from '../math';

export class Touch {
  public identifier: number;
  public position: Vec2;
  public pressure: number;
  public timestamp: number;

  constructor(identifier: number, position: Vec2, pressure: number = 1.0, timestamp: number = performance.now()) {
    this.identifier = identifier;
    this.position = position.clone();
    this.pressure = pressure;
    this.timestamp = timestamp;
  }

  public clone(): Touch {
    return new Touch(this.identifier, this.position.clone(), this.pressure, this.timestamp);
  }

  public equals(other: Touch): boolean {
    return this.identifier === other.identifier &&
           this.position.equals(other.position) &&
           this.pressure === other.pressure &&
           this.timestamp === other.timestamp;
  }
}
