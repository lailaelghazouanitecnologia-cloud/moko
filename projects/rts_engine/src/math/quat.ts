import { Vec3 } from './vec3';
import { Mat4 } from './mat4';

/**
 * A quaternion class for representing 3D rotations.
 * Quaternions are mathematical objects that extend complex numbers and are commonly used in 3D graphics and game development.
 */
export class Quat {
  public readonly x: number;
  public readonly y: number;
  public readonly z: number;
  public readonly w: number;

  /**
   * Creates a new quaternion.
   * @param x - The x component (default: 0)
   * @param y - The y component (default: 0)
   * @param z - The z component (default: 0)
   * @param w - The w component (default: 1)
   */
  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  /**
   * Creates a quaternion from an axis and angle.
   * @param axis - The axis of rotation (must be a non-zero vector)
   * @param angle - The angle in radians
   * @returns A new quaternion representing the rotation
   * @throws {Error} If axis is null or undefined
   */
  static fromAxisAngle(axis: Vec3, angle: number): Quat {
    if (!axis) {
      throw new Error('Axis cannot be null or undefined');
    }
    
    if (!Number.isFinite(angle)) {
      throw new Error('Angle must be a finite number');
    }

    const halfAngle = angle * 0.5;
    const s = Math.sin(halfAngle);
    const c = Math.cos(halfAngle);
    const norm = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
    if (norm === 0) return new Quat(0, 0, 0, 1);
    const invNorm = 1 / norm;
    return new Quat(
      axis.x * invNorm * s,
      axis.y * invNorm * s,
      axis.z * invNorm * s,
      c
    );
  }

  /**
   * Creates a quaternion from Euler angles (roll, pitch, yaw).
   * @param x - Roll angle in radians
   * @param y - Pitch angle in radians
   * @param z - Yaw angle in radians
   * @returns A new quaternion representing the rotation
   */
  static fromEuler(x: number, y: number, z: number): Quat {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error('Euler angles must be finite numbers');
    }

    const cx = Math.cos(x * 0.5);
    const sx = Math.sin(x * 0.5);
    const cy = Math.cos(y * 0.5);
    const sy = Math.sin(y * 0.5);
    const cz = Math.cos(z * 0.5);
    const sz = Math.sin(z * 0.5);

    return new Quat(
      sx * cy * cz - cx * sy * sz,
      cx * sy * cz + sx * cy * sz,
      cx * cy * sz - sx * sy * cz,
      cx * cy * cz + sx * sy * sz
    );
  }

  /**
   * Multiplies this quaternion by another quaternion.
   * @param q - The quaternion to multiply by
   * @returns A new quaternion representing the product
   * @throws {Error} If q is null or undefined
   */
  multiply(q: Quat): Quat {
    if (!q) {
      throw new Error('Quaternion to multiply by cannot be null or undefined');
    }

    const qx = this.x;
    const qy = this.y;
    const qz = this.z;
    const qw = this.w;

    return new Quat(
      qx * q.w + qw * q.x + qy * q.z - qz * q.y,
      qy * q.w + qw * q.y + qz * q.x - qx * q.z,
      qz * q.w + qw * q.z + qx * q.y - qy * q.x,
      qw * q.w - qx * q.x - qy * q.y - qz * q.z
    );
  }

  /**
   * Returns the conjugate of this quaternion.
   * @returns A new quaternion representing the conjugate
   */
  conjugate(): Quat {
    return new Quat(-this.x, -this.y, -this.z, this.w);
  }

  /**
   * Returns the inverse of this quaternion.
   * @returns A new quaternion representing the inverse
   */
  inverse(): Quat {
    const lenSq = this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
    if (lenSq === 0) return new Quat(0, 0, 0, 1);
    const invLenSq = 1 / lenSq;
    return new Quat(
      -this.x * invLenSq,
      -this.y * invLenSq,
      -this.z * invLenSq,
      this.w * invLenSq
    );
  }

  /**
   * Normalizes this quaternion to unit length.
   * @returns A new normalized quaternion
   */
  normalize(): Quat {
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    if (len === 0) return new Quat(0, 0, 0, 1);
    const invLen = 1 / len;
    return new Quat(
      this.x * invLen,
      this.y * invLen,
      this.z * invLen,
      this.w * invLen
    );
  }

  /**
   * Calculates the length of this quaternion.
   * @returns The length of the quaternion
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
  }

  /**
   * Creates a copy of this quaternion.
   * @returns A new quaternion with the same components
   */
  clone(): Quat {
    return new Quat(this.x, this.y, this.z, this.w);
  }

  /**
   * Creates a new quaternion from the components of another quaternion.
   * @param q - The quaternion to copy from
   * @returns A new quaternion with the same components as q
   * @throws {Error} If q is null or undefined
   */
  copy(q: Quat): Quat {
    if (!q) {
      throw new Error('Quaternion to copy cannot be null or undefined');
    }
    return new Quat(q.x, q.y, q.z, q.w);
  }

  /**
   * Creates a new quaternion with the specified components.
   * @param x - The x component
   * @param y - The y component
   * @param z - The z component
   * @param w - The w component
   * @returns A new quaternion with the specified components
   */
  set(x: number, y: number, z: number, w: number): Quat {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || !Number.isFinite(w)) {
      throw new Error('Quaternion components must be finite numbers');
    }
    return new Quat(x, y, z, w);
  }

  /**
   * Converts this quaternion to axis-angle representation.
   * @returns An object containing the axis and angle
   */
  toAxisAngle(): { axis: Vec3; angle: number } {
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    if (len === 0) {
      return { axis: new Vec3(0, 0, 1), angle: 0 };
    }
    const invLen = 1 / len;
    return {
      axis: new Vec3(this.x * invLen, this.y * invLen, this.z * invLen),
      angle: 2 * Math.atan2(len, this.w)
    };
  }

  /**
   * Converts this quaternion to Euler angles.
   * @returns A Vec3 containing the Euler angles (roll, pitch, yaw)
   */
  toEuler(): Vec3 {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = this.w;

    const sinr_cosp = 2 * (w * x + y * z);
    const cosr_cosp = 1 - 2 * (x * x + y * y);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    const sinp = 2 * (w * y - z * x);
    let pitch: number;
    if (Math.abs(sinp) >= 1) {
      pitch = Math.sign(sinp) * Math.PI / 2;
    } else {
      pitch = Math.asin(sinp);
    }

    const siny_cosp = 2 * (w * z + x * y);
    const cosy_cosp = 1 - 2 * (y * y + z * z);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return new Vec3(roll, pitch, yaw);
  }

  /**
   * Returns the identity quaternion.
   * @returns A quaternion representing no rotation
   */
  static identity(): Quat {
    return new Quat(0, 0, 0, 1);
  }

  /**
   * Performs spherical linear interpolation between two quaternions.
   * @param a - The starting quaternion
   * @param b - The ending quaternion
   * @param t - The interpolation factor (0-1)
   * @returns A new quaternion representing the interpolated rotation
   * @throws {Error} If a or b is null or undefined, or if t is not a finite number
   */
  static slerp(a: Quat, b: Quat, t: number): Quat {
    if (!a || !b) {
      throw new Error('Quaternions to interpolate cannot be null or undefined');
    }
    if (!Number.isFinite(t)) {
      throw new Error('Interpolation factor must be a finite number');
    }
    
    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));

    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
    if (dot < 0) {
      dot = -dot;
      b = new Quat(-b.x, -b.y, -b.z, -b.w);
    }

    if (dot > 0.9995) {
      const result = new Quat(
        a.x + t * (b.x - a.x),
        a.y + t * (b.y - a.y),
        a.z + t * (b.z - a.z),
        a.w + t * (b.w - a.w)
      );
      return result.normalize();
    }

    const theta0 = Math.acos(dot);
    const sinTheta0 = Math.sin(theta0);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);

    const s0 = Math.cos(theta) - dot * sinTheta / sinTheta0;
    const s1 = sinTheta / sinTheta0;

    return new Quat(
      s0 * a.x + s1 * b.x,
      s0 * a.y + s1 * b.y,
      s0 * a.z + s1 * b.z,
      s0 * a.w + s1 * b.w
    );
  }

  /**
   * Transforms a 3D vector by this quaternion.
   * @param v - The vector to transform
   * @returns A new transformed vector
   * @throws {Error} If v is null or undefined
   */
  transformVec3(v: Vec3): Vec3 {
    if (!v) {
      throw new Error('Vector to transform cannot be null or undefined');
    }

    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = this.w;

    const vx = v.x;
    const vy = v.y;
    const vz = v.z;

    const uvx = y * vz - z * vy;
    const uvy = z * vx - x * vz;
    const uvz = x * vy - y * vx;

    const uuvx = y * uvz - z * uvy;
    const uuvy = z * uvx - x * uvz;
    const uuvz = x * uvy - y * uvx;

    const scale = 2 * (x * vx + y * vy + z * vz);

    return new Vec3(
      vx + w * uvx + scale * uvx + uuvx,
      vy + w * uvy + scale * uvy + uuvy,
      vz + w * uvz + scale * uvz + uuvz
    );
  }

  /**
   * Converts this quaternion to a 4x4 rotation matrix.
   * @returns A new 4x4 matrix representing the rotation
   */
  toMat4(): Mat4 {
    const x = this.x;
    const y = this.y;
    const z = this.z;
    const w = this.w;

    const xx = x * x;
    const xy = x * y;
    const xz = x * z;
    const xw = x * w;

    const yy = y * y;
    const yz = y * z;
    const yw = y * w;

    const zz = z * z;
    const zw = z * w;

    const m = new Mat4();
    const d = m.data;

    d[0] = 1 - 2 * (yy + zz);
    d[1] = 2 * (xy + zw);
    d[2] = 2 * (xz - yw);
    d[3] = 0;

    d[4] = 2 * (xy - zw);
    d[5] = 1 - 2 * (xx + zz);
    d[6] = 2 * (yz + xw);
    d[7] = 0;

    d[8] = 2 * (xz + yw);
    d[9] = 2 * (yz - xw);
    d[10] = 1 - 2 * (xx + yy);
    d[11] = 0;

    d[12] = 0;
    d[13] = 0;
    d[14] = 0;
    d[15] = 1;

    return m;
  }

  /**
   * Checks if this quaternion equals another quaternion.
   * @param q - The quaternion to compare with
   * @returns True if the quaternions are equal, false otherwise
   */
  equals(q: Quat): boolean {
    if (!q) {
      return false;
    }
    return this.x === q.x && this.y === q.y && this.z === q.z && this.w === q.w;
  }

  /**
   * Calculates the dot product of this quaternion with another.
   * @param q - The other quaternion
   * @returns The dot product
   * @throws {Error} If q is null or undefined
   */
  dot(q: Quat): number {
    if (!q) {
      throw new Error('Quaternion to dot with cannot be null or undefined');
    }
    return this.x * q.x + this.y * q.y + this.z * q.z + this.w * q.w;
  }

  /**
   * Calculates the squared length of this quaternion.
   * @returns The squared length
   */
  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w;
  }

  /**
   * Performs linear interpolation between two quaternions.
   * @param a - The starting quaternion
   * @param b - The ending quaternion
   * @param t - The interpolation factor (0-1)
   * @returns A new quaternion representing the interpolated rotation
   * @throws {Error} If a or b is null or undefined, or if t is not a finite number
   */
  static lerp(a: Quat, b: Quat, t: number): Quat {
    if (!a || !b) {
      throw new Error('Quaternions to interpolate cannot be null or undefined');
    }
    if (!Number.isFinite(t)) {
      throw new Error('Interpolation factor must be a finite number');
    }
    
    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));

    const result = new Quat(
      a.x + t * (b.x - a.x),
      a.y + t * (b.y - a.y),
      a.z + t * (b.z - a.z),
      a.w + t * (b.w - a.w)
    );
    return result.normalize();
  }

  /**
   * Creates a quaternion from a rotation matrix.
   * @param m - The 4x4 rotation matrix
   * @returns A new quaternion representing the rotation
   * @throws {Error} If m is null or undefined
   */
  static fromMat4(m: Mat4): Quat {
    if (!m) {
      throw new Error('Matrix cannot be null or undefined');
    }

    const d = m.data;
    const trace = d[0] + d[5] + d[10];
    
    let x, y, z, w;

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      w = 0.25 / s;
      x = (d[9] - d[6]) * s;
      y = (d[2] - d[8]) * s;
      z = (d[4] - d[1]) * s;
    } else if (d[0] > d[5] && d[0] > d[10]) {
      const s = 2.0 * Math.sqrt(1.0 + d[0] - d[5] - d[10]);
      w = (d[9] - d[6]) / s;
      x = 0.25 * s;
      y = (d[1] + d[4]) / s;
      z = (d[2] + d[8]) / s;
    } else if (d[5] > d[10]) {
      const s = 2.0 * Math.sqrt(1.0 + d[5] - d[0] - d[10]);
      w = (d[2] - d[8]) / s;
      x = (d[1] + d[4]) / s;
      y = 0.25 * s;
      z = (d[6] + d[9]) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + d[10] - d[0] - d[5]);
      w = (d[4] - d[1]) / s;
      x = (d[2] + d[8]) / s;
      y = (d[6] + d[9]) / s;
      z = 0.25 * s;
    }

    return new Quat(x, y, z, w).normalize();
  }

  /**
   * Creates a quaternion looking from one point to another.
   * @param eye - The eye position
   * @param target - The target position
   * @param up - The up vector (default: Vec3(0, 1, 0))
   * @returns A new quaternion representing the rotation
   * @throws {Error} If eye or target is null or undefined
   */
  static lookAt(eye: Vec3, target: Vec3, up: Vec3 = new Vec3(0, 1, 0)): Quat {
    if (!eye || !target) {
      throw new Error('Eye and target positions cannot be null or undefined');
    }
    if (!up) {
      throw new Error('Up vector cannot be null or undefined');
    }

    const forward = target.subtract(eye).normalize();
    const right = forward.cross(up).normalize();
    const correctedUp = right.cross(forward);

    const m = new Mat4();
    const d = m.data;
    
    d[0] = right.x;
    d[1] = right.y;
    d[2] = right.z;
    d[3] = 0;
    
    d[4] = correctedUp.x;
    d[5] = correctedUp.y;
    d[6] = correctedUp.z;
    d[7] = 0;
    
    d[8] = -forward.x;
    d[9] = -forward.y;
    d[10] = -forward.z;
    d[11] = 0;
    
    d[12] = 0;
    d[13] = 0;
    d[14] = 0;
    d[15] = 1;

    return Quat.fromMat4(m);
  }

  /**
   * Returns a string representation of this quaternion.
   * @returns A string in the format "Quat(x, y, z, w)"
   */
  toString(): string {
    return `Quat(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
  }

  /**
   * Checks if this quaternion is approximately equal to another within a given tolerance.
   * @param q - The quaternion to compare with
   * @param tolerance - The tolerance for comparison (default: 1e-6)
   * @returns True if the quaternions are approximately equal
   */
  approximatelyEquals(q: Quat, tolerance: number = 1e-6): boolean {
    if (!q) {
      return false;
    }
    if (!Number.isFinite(tolerance) || tolerance < 0) {
      throw new Error('Tolerance must be a non-negative finite number');
    }

    return Math.abs(this.x - q.x) <= tolerance &&
           Math.abs(this.y - q.y) <= tolerance &&
           Math.abs(this.z - q.z) <= tolerance &&
           Math.abs(this.w - q.w) <= tolerance;
  }

  /**
   * Gets the angle of rotation represented by this quaternion.
   * @returns The angle in radians
   */
  getAngle(): number {
    return 2 * Math.acos(Math.max(-1, Math.min(1, this.w)));
  }

  /**
   * Gets the axis of rotation represented by this quaternion.
   * @returns A normalized vector representing the axis of rotation
   */
  getAxis(): Vec3 {
    const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    if (len === 0) {
      return new Vec3(0, 0, 1);
    }
    const invLen = 1 / len;
    return new Vec3(this.x * invLen, this.y * invLen, this.z * invLen);
  }
}
