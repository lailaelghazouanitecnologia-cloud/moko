import { AudioManager } from './audio-manager';
import { Vec3 } from '../math/vec3';

/**
 * Manages the Web Audio listener's position, orientation, and velocity.
 * All methods are safe to call even when the underlying AudioContext is closed or unavailable.
 */
export class Listener {
  private audioManager: AudioManager;
  private position: Vec3;
  private forward: Vec3;
  private up: Vec3;
  private velocity: Vec3;

  constructor(audioManager: AudioManager) {
    if (!audioManager) {
      throw new Error('Listener requires an AudioManager instance');
    }
    this.audioManager = audioManager;
    this.position = new Vec3(0, 0, 0);
    this.forward = new Vec3(0, 0, -1);
    this.up = new Vec3(0, 1, 0);
    this.velocity = new Vec3(0, 0, 0);
  }

  /**
   * Sets the absolute position of the listener.
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param z - Z coordinate
   */
  setPosition(x: number, y: number, z: number): void {
    if (!this.isValidNumber(x) || !this.isValidNumber(y) || !this.isValidNumber(z)) {
      console.warn('Listener.setPosition received invalid coordinates', { x, y, z });
      return;
    }

    const context = (this.audioManager as any)?.instance?.context;
    if (!this.isContextReady(context)) return;

    this.position.set(x, y, z);
    const listener = context.listener;

    if (listener.positionX !== undefined) {
      listener.positionX.value = x;
      listener.positionY.value = y;
      listener.positionZ.value = z;
    } else {
      listener.setPosition(x, y, z);
    }
  }

  /**
   * Sets the orientation vectors of the listener.
   * @param fx - Forward vector X
   * @param fy - Forward vector Y
   * @param fz - Forward vector Z
   * @param ux - Up vector X
   * @param uy - Up vector Y
   * @param uz - Up vector Z
   */
  setOrientation(
    fx: number,
    fy: number,
    fz: number,
    ux: number,
    uy: number,
    uz: number
  ): void {
    if (
      !this.isValidNumber(fx) ||
      !this.isValidNumber(fy) ||
      !this.isValidNumber(fz) ||
      !this.isValidNumber(ux) ||
      !this.isValidNumber(uy) ||
      !this.isValidNumber(uz)
    ) {
      console.warn('Listener.setOrientation received invalid vectors', {
        fx,
        fy,
        fz,
        ux,
        uy,
        uz,
      });
      return;
    }

    const context = (this.audioManager as any)?.instance?.context;
    if (!this.isContextReady(context)) return;

    this.forward.set(fx, fy, fz);
    this.up.set(ux, uy, uz);
    const listener = context.listener;

    if (listener.forwardX !== undefined) {
      listener.forwardX.value = fx;
      listener.forwardY.value = fy;
      listener.forwardZ.value = fz;
      listener.upX.value = ux;
      listener.upY.value = uy;
      listener.upZ.value = uz;
    } else {
      listener.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  /**
   * Sets the velocity vector of the listener (used for Doppler effects).
   * @param x - Velocity X
   * &param y - Velocity Y
   * @param z - Velocity Z
   */
  setVelocity(x: number, y: number, z: number): void {
    if (!this.isValidNumber(x) || !this.isValidNumber(y) || !this.isValidNumber(z)) {
      console.warn('Listener.setVelocity received invalid components', { x, y, z });
      return;
    }

    const context = (this.audioManager as any)?.instance?.context;
    if (!this.isContextReady(context)) return;

    this.velocity.set(x, y, z);
    const listener = context.listener;

    if ((listener as any).velocityX !== undefined) {
      (listener as any).velocityX.value = x;
      (listener as any).velocityY.value = y;
      (listener as any).velocityZ.value = z;
    } else if (typeof (listener as any).setVelocity === 'function') {
      (listener as any).setVelocity(x, y, z);
    }
  }

  /**
   * Returns a clone of the current position.
   */
  getPosition(): Vec3 {
    return this.position.clone();
  }

  /**
   * Returns a clone of the forward vector.
   */
  getForward(): Vec3 {
    return this.forward.clone();
  }

  /**
   * Returns a clone of the up vector.
   */
  getUp(): Vec3 {
    return this.up.clone();
  }

  /**
   * Returns a clone of the velocity vector.
   */
  getVelocity(): Vec3 {
    return this.velocity.clone();
  }

  /**
   * Updates all listener properties in one call.
   * @param position - New position
   * @param forward - New forward vector
   * @param up - New up vector
   * @param velocity - New velocity vector
   */
  updateFromTransform(position: Vec3, forward: Vec3, up: Vec3, velocity: Vec3): void {
    if (!position || !forward || !up || !velocity) {
      console.warn('Listener.updateFromTransform received invalid transform data');
      return;
    }

    this.position.copy(position);
    this.forward.copy(forward);
    this.up.copy(up);
    this.velocity.copy(velocity);

    this.setPosition((position as any).data[0], (position as any).data[1], (position as any).data[2]);
    this.setOrientation((forward as any).data[0], (forward as any).data[1], (forward as any).data[2], (up as any).data[0], (up as any).data[1], (up as any).data[2]);
    this.setVelocity((velocity as any).data[0], (velocity as any).data[1], (velocity as any).data[2]);
  }

  /**
   * Resets the listener to default values.
   */
  reset(): void {
    this.setPosition(0, 0, 0);
    this.setOrientation(0, 0, -1, 0, 1, 0);
    this.setVelocity(0, 0, 0);
  }

  /**
   * Checks if a value is a finite number.
   */
  private isValidNumber(value: number): boolean {
    return typeof value === 'number' && isFinite(value);
  }

  /**
   * Verifies that the AudioContext is available and not closed.
   */
  private isContextReady(context: any): context is AudioContext {
    if (!context) return false;
    if (context.state === 'closed') return false;
    return true;
  }
}
