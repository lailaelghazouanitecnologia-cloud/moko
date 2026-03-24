import { Vec3 } from '../math/vec3';
import { AudioManager } from './index';
import { Sound } from './sound';
import { Channel } from './channel';

type DistanceModelType = 'linear' | 'inverse' | 'exponential';

/**
 * A 3D spatialized audio channel that supports positional audio, velocity-based doppler,
 * distance attenuation, and directional cones.
 */
export class Channel3 extends Channel {
  private panner: PannerNode;
  private position: Vec3 = new Vec3();
  private velocity: Vec3 = new Vec3();
  private direction: Vec3 = new Vec3(0, 0, 1);
  private distanceModel: DistanceModelType = 'inverse';
  private refDistance: number = 1;
  private maxDistance: number = 10000;
  private rolloffFactor: number = 1;
  private coneInnerAngle: number = 0;
  private coneOuterAngle: number = 360;
  private coneOuterGain: number = 0;

  constructor(id: string, audioManager: AudioManager) {
    super(id, audioManager);
    const context = this.getContextFromManager(audioManager);
    this.panner = context.createPanner();
    this.panner.panningModel = 'HRTF';
    this.panner.distanceModel = this.distanceModel;
    this.panner.refDistance = this.refDistance;
    this.panner.maxDistance = this.maxDistance;
    this.panner.rolloffFactor = this.rolloffFactor;
    this.panner.coneInnerAngle = this.coneInnerAngle;
    this.panner.coneOuterAngle = this.coneOuterAngle;
    this.panner.coneOuterGain = this.coneOuterGain;
    (this as any).gain.disconnect();
    (this as any).gain.connect(this.panner);
    this.panner.connect(this.getMasterGainFromManager(audioManager));
  }

  /**
   * Plays a sound through this 3D channel.
   * @param sound The sound to play.
   */
  public play(sound: Sound): void {
    super.play(sound);
    if ((this as any).source) {
      (this as any).source.disconnect();
      (this as any).source.connect(this.panner);
    }
  }

  /**
   * Sets the 3D position of this channel.
   * @param pos The position vector.
   * @throws {TypeError} If pos is not a valid Vec3.
   */
  public setPosition(pos: Vec3): Channel3 {
    if (!this.isValidVec3(pos)) {
      throw new TypeError('Expected a valid Vec3 for position');
    }
    this.position.copy(pos);
    const now = this.panner.context.currentTime;
    this.panner.positionX.setValueAtTime((pos as any).data[0], now);
    this.panner.positionY.setValueAtTime((pos as any).data[1], now);
    this.panner.positionZ.setValueAtTime((pos as any).data[2], now);
    return this;
  }

  /**
   * Gets the current 3D position of this channel.
   * @returns A clone of the position vector.
   */
  public getPosition(): Vec3 {
    return this.position.clone();
  }

  /**
   * Sets the velocity vector for doppler effects.
   * @param vel The velocity vector.
   * @throws {TypeError} If vel is not a valid Vec3.
   */
  public setVelocity(vel: Vec3): void {
    if (!this.isValidVec3(vel)) {
      throw new TypeError('Expected a valid Vec3 for velocity');
    }
    this.velocity.copy(vel);
    const now = this.panner.context.currentTime;
    (this.panner as any).velocityX.setValueAtTime((vel as any).data[0], now);
    (this.panner as any).velocityY.setValueAtTime((vel as any).data[1], now);
    (this.panner as any).velocityZ.setValueAtTime((vel as any).data[2], now);
  }

  /**
   * Gets the current velocity vector.
   * @returns A clone of the velocity vector.
   */
  public getVelocity(): Vec3 {
    return this.velocity.clone();
  }

  /**
   * Sets the orientation (direction) of the sound source.
   * @param dir The direction vector.
   * @throws {TypeError} If dir is not a valid Vec3.
   */
  public setDirection(dir: Vec3): void {
    if (!this.isValidVec3(dir)) {
      throw new TypeError('Expected a valid Vec3 for direction');
    }
    this.direction.copy(dir);
    const now = this.panner.context.currentTime;
    this.panner.orientationX.setValueAtTime((dir as any).data[0], now);
    this.panner.orientationY.setValueAtTime((dir as any).data[1], now);
    this.panner.orientationZ.setValueAtTime((dir as any).data[2], now);
  }

  /**
   * Gets the current direction vector.
   * @returns A clone of the direction vector.
   */
  public getDirection(): Vec3 {
    return this.direction.clone();
  }

  /**
   * Sets the distance attenuation model.
   * @param model The distance model type.
   * @throws {TypeError} If model is not a valid DistanceModelType.
   */
  public setDistanceModel(model: DistanceModelType): void {
    if (!this.isValidDistanceModel(model)) {
      throw new TypeError('Invalid distance model');
    }
    this.distanceModel = model;
    this.panner.distanceModel = model;
  }

  /**
   * Gets the current distance model.
   * @returns The distance model type.
   */
  public getDistanceModel(): DistanceModelType {
    return this.distanceModel;
  }

  /**
   * Sets the reference distance for distance attenuation.
   * @param distance The reference distance (must be ≥ 0).
   * @throws {RangeError} If distance is negative.
   */
  public setRefDistance(distance: number): void {
    if (!Number.isFinite(distance) || distance < 0) {
      throw new RangeError('refDistance must be a non-negative number');
    }
    this.refDistance = distance;
    this.panner.refDistance = distance;
  }

  /**
   * Gets the reference distance.
   * @returns The reference distance.
   */
  public getRefDistance(): number {
    return this.refDistance;
  }

  /**
   * Sets the maximum distance for attenuation.
   * @param distance The maximum distance (must be ≥ refDistance).
   * @throws {RangeError} If distance is less than refDistance.
   */
  public setMaxDistance(distance: number): void {
    if (!Number.isFinite(distance) || distance < this.refDistance) {
      throw new RangeError('maxDistance must be ≥ refDistance');
    }
    this.maxDistance = distance;
    this.panner.maxDistance = distance;
  }

  /**
   * Gets the maximum distance.
   * @returns The maximum distance.
   */
  public getMaxDistance(): number {
    return this.maxDistance;
  }

  /**
   * Sets the rolloff factor for distance attenuation.
   * @param factor The rolloff factor (≥ 0).
   * @throws {RangeError} If factor is negative.
   */
  public setRolloffFactor(factor: number): void {
    if (!Number.isFinite(factor) || factor < 0) {
      throw new RangeError('rolloffFactor must be a non-negative number');
    }
    this.rolloffFactor = factor;
    this.panner.rolloffFactor = factor;
  }

  /**
   * Gets the rolloff factor.
   * @returns The rolloff factor.
   */
  public getRolloffFactor(): number {
    return this.rolloffFactor;
  }

  /**
   * Sets the cone angles and gain.
   * @param innerAngle Inner cone angle in degrees (0–360).
   * @param outerAngle Outer cone angle in degrees (0–360).
   * @param outerGain Gain outside the outer cone (0–1).
   * @throws {RangeError} On invalid angles or gain.
   */
  public setConeAngles(innerAngle: number, outerAngle: number, outerGain: number = 0): void {
    if (!Number.isFinite(innerAngle) || innerAngle < 0 || innerAngle > 360) {
      throw new RangeError('innerAngle must be between 0 and 360');
    }
    if (!Number.isFinite(outerAngle) || outerAngle < 0 || outerAngle > 360) {
      throw new RangeError('outerAngle must be between 0 and 0');
    }
    if (!Number.isFinite(outerGain) || outerGain < 0 || outerGain > 1) {
      throw new RangeError('outerGain must be between 0 and 1');
    }
    this.coneInnerAngle = innerAngle;
    this.coneOuterAngle = outerAngle;
    this.coneOuterGain = outerGain;
    this.panner.coneInnerAngle = innerAngle;
    this.panner.coneOuterAngle = outerAngle;
    this.panner.coneOuterGain = outerGain;
  }

  /**
   * Gets the inner cone angle.
   * @returns The angle in degrees.
   */
  public getConeInnerAngle(): number {
    return this.coneInnerAngle;
  }

  /**
   * Gets the outer cone angle.
   * @returns The angle in degrees.
   */
  public getConeOuterAngle(): number {
    return this.coneOuterAngle;
  }

  /**
   * Gets the gain outside the outer cone.
   * @returns The gain value (0–1).
   */
  public getConeOuterGain(): number {
    return this.coneOuterGain;
  }

  /**
   * Safely destroys this 3D channel and releases resources.
   */
  public destroy(): void {
    if (this.panner && this.panner.disconnect) {
      this.panner.disconnect();
    }
    (super as any).destroy();
  }

  /**
   * Validates a Vec3 instance.
   */
  private isValidVec3(v: any): v is Vec3 {
    return v && typeof (v as any).data[0] === 'number' && typeof (v as any).data[1] === 'number' && typeof (v as any).data[2] === 'number';
  }

  /**
   * Validates a distance model type.
   */
  private isValidDistanceModel(model: any): model is DistanceModelType {
    return ['linear', 'inverse', 'exponential'].includes(model);
  }

  /**
   * Extracts the AudioContext from the manager using reflection.
   */
  private getContextFromManager(manager: AudioManager): AudioContext {
  const ctx = (manager as any).context ?? (manager as any).context;
  if (!ctx) throw new Error('AudioManager does not expose a valid AudioContext');
  return ctx;
  }

  /**
   * Extracts the master gain node from the manager using reflection.
   */
  private getMasterGainFromManager(manager: AudioManager): GainNode {
    const master = (manager as any).masterGain ?? (manager as any).masterGain;
    if (!master) throw new Error('AudioManager does not expose a masterGain node');
    return master;
  }
}
