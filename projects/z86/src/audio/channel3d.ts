import { EventEmitter } from '../core/eventemitter';
import { Vec3 } from '../math/vec3';

export class Channel3d extends EventEmitter {
  private _context: AudioContext;
  private _panner: PannerNode;
  private _gain: GainNode;
  private _input: AudioNode;
  private _output: AudioNode;
  private _connected: boolean = false;

  constructor(context: AudioContext) {
    super();
    this._context = context;
    this._panner = context.createPanner();
    this._gain = context.createGain();
    this._input = this._panner;
    this._output = this._gain;
    this._panner.connect(this._gain);
  }

  get input(): AudioNode {
    return this._input;
  }

  get output(): AudioNode {
    return this._output;
  }

  connect(destination: AudioNode | Channel3d): AudioNode {
    if (destination instanceof Channel3d) {
      this._output.connect(destination.input);
    } else {
      this._output.connect(destination);
    }
    this._connected = true;
    return destination instanceof Channel3d ? destination.output : destination;
  }

  disconnect(destination?: AudioNode | Channel3d): void {
    if (destination) {
      if (destination instanceof Channel3d) {
        this._output.disconnect(destination.input);
      } else {
        this._output.disconnect(destination);
      }
    } else {
      this._output.disconnect();
    }
    this._connected = false;
  }

  setPosition(x: number | Vec3, y?: number, z?: number): void {
    if (x instanceof Vec3) {
      this._panner.setPosition(x.x, x.y, x.z);
    } else if (y !== undefined && z !== undefined) {
      this._panner.setPosition(x as number, y, z);
    }
  }

  setVelocity(x: number | Vec3, y?: number, z?: number): void {
    if (x instanceof Vec3) {
      this._panner.setVelocity(x.x, x.y, x.z);
    } else if (y !== undefined && z !== undefined) {
      this._panner.setVelocity(x as number, y, z);
    }
  }

  setOrientation(x: number | Vec3, y?: number, z?: number): void {
    if (x instanceof Vec3) {
      this._panner.setOrientation(x.x, x.y, x.z);
    } else if (y !== undefined && z !== undefined) {
      this._panner.setOrientation(x as number, y, z);
    }
  }

  setDistanceModel(model: DistanceModelType): void {
    this._panner.distanceModel = model;
  }

  setPanningModel(model: PanningModelType): void {
    this._panner.panningModel = model;
  }

  setRefDistance(distance: number): void {
    this._panner.refDistance = distance;
  }

  setMaxDistance(distance: number): void {
    this._panner.maxDistance = distance;
  }

  setRolloffFactor(factor: number): void {
    this._panner.rolloffFactor = factor;
  }

  setConeAngles(innerAngle: number, outerAngle: number, outerGain: number): void {
    this._panner.coneInnerAngle = innerAngle;
    this._panner.coneOuterAngle = outerAngle;
    this._panner.coneOuterGain = outerGain;
  }

  setVolume(volume: number): void {
    this._gain.gain.setValueAtTime(volume, this._context.currentTime);
  }

  getVolume(): number {
    return this._gain.gain.value;
  }

  getPosition(): Vec3 {
    const position = this._panner.position;
    return new Vec3(position.x, position.y, position.z);
  }

  getVelocity(): Vec3 {
    const velocity = this._panner.velocity;
    return new Vec3(velocity.x, velocity.y, velocity.z);
  }

  getOrientation(): Vec3 {
    const orientation = this._panner.orientation;
    return new Vec3(orientation.x, orientation.y, orientation.z);
  }

  getDistanceModel(): DistanceModelType {
    return this._panner.distanceModel;
  }

  getPanningModel(): PanningModelType {
    return this._panner.panningModel;
  }

  getRefDistance(): number {
    return this._panner.refDistance;
  }

  getMaxDistance(): number {
    return this._panner.maxDistance;
  }

  getRolloffFactor(): number {
    return this._panner.rolloffFactor;
  }

  getConeInnerAngle(): number {
    return this._panner.coneInnerAngle;
  }

  getConeOuterAngle(): number {
    return this._panner.coneOuterAngle;
  }

  getConeOuterGain(): number {
    return this._panner.coneOuterGain;
  }

  isConnected(): boolean {
    return this._connected;
  }

  destroy(): void {
    this.disconnect();
    this._panner.disconnect();
    this._gain.disconnect();
    this._context = null as any;
    this._panner = null as any;
    this._gain = null as any;
    this._input = null as any;
    this._output = null as any;
  }
}
