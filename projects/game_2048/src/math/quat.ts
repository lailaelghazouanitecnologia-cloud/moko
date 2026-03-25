import { Vec3 } from './vec3';
import { Mat4 } from './mat4';

/**
 * A quaternion class for 3-dimensional rotations.
 * Quaternions are used to represent rotations in a compact and mathematically stable way.
 */
export class Quat {
  x: number;
  y: number;
  y: number;
  z: number;
  w: number;

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
   * Creates a quaternion from an axis and an angle.
   * @param axis - The axis of rotation (must be a non-zero vector)
   *  @param angle - The angle in radians
   * @returns A new quaternion representing the rotation
   * @throws {Error} If the axis is a zero vector
   */
  static fromAxisAngle(axis: Vec3, angle: number): Quat {
    if (!axis || !(axis instanceof Vec3)) {
      throw new Error('Invalid axis: must be a Vec3 instance');
    }
    if (typeof angle !== 'number' || !isFinite(angle)) {
      throw new Error('Invalid angle: must be a finite number');
    }

    const halfAngle = angle * 0.5;
    const s = Math.sin(halfAngle);
    const c = Math.cos(halfAngle);
    const normalizedAxis = axis.clone().normalize();

    if (!normalizedAxis || isNaN(normalizedAxis.x) || isNaN(normalizedAxis.y) || isNaN(normalizedAxis.z)) {
      throw new Error('Axis cannot be zero vector');
    }

    return new Quat(
      normalizedAxis.x * s,
      normalizedAxis.y * s,
      normalizedAxis.z * s,
      c
    );
  }

  /**
   * Creates a quaternion from Euler angles.
   * @param euler - A Vec3 containing the rotation angles in radians (x: pitch, y: yaw, z: roll)
   * @returns A new quaternion representing the rotation
   * @throws {Error} If euler is not a valid Vec3
   */
  static fromEuler(euler: Vec3): Quat {
    if (!euler || !(euler instanceof Vec3)) {
      throw new Error('Invalid euler: must be a Vec3 instance');
    }

    const x = euler.x * 0.5;
    const y = euler.y * 0.5;
    const z = euler.z * 0.5;

    const cx = Math.cos(x);
    const sx = Math.sin(x);
    const cy = Math.cos(y);
    const sy = Math.sin(y);
    const cz = Math.cos(z);
    const sz = Math.sin(z);

    return new Quat(
      sx * cy * cz - cx * sy * sz,
      cx * sy * cz + sx * cy * sz,
      cx * cy * sz - sx * sy * cz,
      cx * cy * cz + sx * sy * sz
    );
  }

  /**
   * Computes the conjugate of a quaternion.
   * @param q - The quaternion to conjugate
   * @returns A new quaternion representing the conjugate
   * @throws {Error} If q is not a valid Quat
   */
  static conjugate(q: Quat): Quat {
    if (!q || !(q instanceof Quat)) {
      throw new Error('Invalid quaternion: must be a Quat instance');
    }
    return new Quat(-q.x, -q.y, -q.z, q.w);
  }

  /**
   * Computes the length (magnitude) of a quaternion.
   * @param q - The quaternion
   * @returns The length of the quaternion
   * @throws {Error} If q is not a valid Quat
   */
  static length(q: Quat): number {
    if (!q || !(q instanceof Quat)) {
      throw new Error('Invalid quaternion: must be a Quat instance');
    }
    return Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
  }

  /**
   * Normalizes a quaternion to unit length.
   * @param q - The quaternion to normalize
   * @returns A new normalized quaternion
   * @throws {Error} If q is not a valid Quat
   */
  static normalize(q: Quat): Quat {
    if (!q || !(q instanceof Quat)) {
      throw new Error('Invalid quaternion: must be a Quat instance');
    }
    const len = Quat.length(q);
    if (len === 0) {
      return new Quat(0, 0, 0, 1);
    }
    const inv = 1 / len;
    return new Quat(q.x * inv, q.y * inv, q.z * inv, q.w * inv);
  }

  /**
   * Multiplies two quaternions.
   * @param a - The first quaternion
   * @param b - The second quaternion
   * @returns A new quaternion representing the product a * b
   * @throws {Error} If a or b are not valid Quat instances
   */
  static multiply(a: Quat, b: Quat): Quat {
    if (!a || !(a instanceof Quat)) {
      throw new Error('Invalid first quaternion: must be a Quat instance');
    }
    if (!b || !(b instanceof Quat)) {
      throw new Error('Invalid second quaternion: must be a Quat instance');
    }

    const qx = a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y;
    const qy = a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x;
    const qz = a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w;
    const qw = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;

    return new Quat(qx, qy, qz, qw);
  }

  /**
   * Performs spherical linear interpolation between two quaternions.
   * @param a - Start quaternion
   * @param b - End quaternion
   * @param t - Interpolation factor between 0 and 1
   * @returns A new interpolated quaternion
   * @throws {Error} If a or b are not valid Quat instances, or t is not a number in [0, 1]
   */
  static slerp(a: Quat, b: Quat, t: number): Quat {
    if (!a || !(a instanceof Quat)) {
      throw new Error('Invalid start quaternion: must be a Quat instance');
    }
    if (!b || !(b instanceof Quat)) {
      throw new Error('Invalid end quaternion: must be a Quat instance');
    }
    if (typeof t !== 'number' || !isFinite(t) || t < 0 || t > 1) {
      throw new Error('Invalid interpolation factor: must be a number between 0 and 1');
    }

    let dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;

    if (dot < 0) {
      dot = -dot;
      const temp = new Quat(-b.x, -b.y, -b.z, -b.w);
      return Quat.slerp(a, temp, t);
    }

    if (dot > 0.9995) {
      const result = new Quat(
        a.x + t * (b.x - a.x),
        a.y + t * (b.y - a.y),
        a.z + t * (b.z - a.z),
        a.w + t * (b.w - a.w)
      );
      return Quat.normalize(result);
    }

    const halfTheta = Math.acos(Math.min(1, Math.max(-1, dot)));
    const sinHalfTheta = Math.sin(halfTheta);
    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;

    return new Quat(
      ratioA * a.x + ratioB * b.x,
      ratioA * a.y + ratioB * b.y,
      ratioA * a.z + ratioB * b.z,
      ratioA * a.w + ratioB * b.w
    );
  }

  /**
   * Converts a quaternion to a 4x4 rotation matrix.
   * @param q - The quaternion to convert
   * @returns A new Mat4 representing the rotation
   * @throws {Error} If q is not a valid Quat
   */
  static toMat4(q: Quut): Mat4 {
    if (!q || !(q instanceof Quat)) {
      throw new Error('Invalid quaternion: must be a Quat instance');
    }

    const m = new Mat4();
    const xx = q.x * q.x;
    const xy = q.x * q.y;
    const xz = q.x * q.z;
    const xw = q.x * q.w;
    const yy = q.y * q.y;
    const yz = q.y * q.z;
    const yw = q.y * q.w;
    const zz = q.z * q.z;
    const zw = q.z * q.w;

    const data = m.data;
    data[0] = 1 - 2 * (yy + zz);
    data[1] = 2 * (xy + zw);
    data[2] = 2 * (xz - yw);
    data[3] = 0;
    data[4] = 2 * (xy - zw);
    data[5] = 1 - 2 * (xx + zz);
    data[6] = 2 * (yz + xw);
    data[7] = 0;
    data[8] = 2 * (xz + yw);
    data[9] = 2 * (yz - xw);
    data[10] = 1 - 2 * (xx + yy);
    data[11] = 0;
    data[12] = 0;
    data[13] = 0;
    data[14] = 0;
    data[15] = 1;

    return m;
  }

  /**
   * Converts a quaternion to Euler angles in radians.
   * @param q - The quaternion to convert
   * @returns A new Vec3 containing the Euler angles (x: pitch, y: yaw, z: roll)
   * @throws {Error} If q is not a valid Quat
   */
  static toEuler(q: Quat): Vec3 {
    if (!q || !(q instanceof Quat)) {
      throw new Error('Invalid quaternion: must be a Quat instance');
    }

    const euler = new Vec3();

    const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
    const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
    euler.x = Math.atan2(sinr_cosp, cosr_cosp);

    const sinp = 2 * (q.w * q.y - q.z * q.x);
    if (Math.abs(sinp) >= 1) {
      euler.y = sinp > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      euler.y = Math.asin(Math.min(1, Math.max(-1, sinp)));
    }

    const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
    const cosy_csp = 1 - 2 * (q.y * q.y + q.z * q.z);
    euler.z = Math.atan2(siny_cosp, cosy_csp);

    return euler;
  }

  /**
   * Clones this quaternion.
   * @returns A new quaternion with the same components
   */
  clone(): Quat {
    return new Quat(this.x, this.y, this.z, this.w);
  }

  /**
   * Converts this quaternion to a readable string.
   * @returns A string representation of the quaternion
   */
  toString(): string {
    return `Quat(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)}, ${this.w.toFixed(3)})`;
  }

  /**
   * Checks if this quaternion is equal to another.
   * @param other - The other quaternion
   * @param epsilon - The tolerance for the comparison (default: 1e-6)
   * @returns True if the two quaternions are equal within the tolerance
   */
  equals(other: Quat, epsilon: number = 1e-6): boolean {
    if (!other || !(other instanceof Quat)) {
      return false;
    }
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon &&
      Math.abs(this.z - other.z) < epsilon &&
      Math.abs(this.w - other.w) < epsilon
    );
  }

  /**
   * Creates an identity quaternion (no rotation).
   * @returns A new identity quaternion
   */
  static identity(): Quat {
    return new Quat(0, 0, 0, 1);
  }

  /**
   * Creates a quaternion from a rotation matrix.
   * @param m - The 4x4 rotation matrix
   * @returns A new quaternion representing the rotation
   * @throws {Error} If m is not a valid Mat4
   */
  static fromMat4(m: Mat4): Quat {
    if (!m || !(m instanceof Mat4)) {
      throw new Error('Invalid matrix: must be a Mat4 instance');
    }

    const out = new Quat();
    const data = m.data;
    const trace = data[0] + data[5] + data[10];

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0);
      out.w = 0.25 / s;
      out.x = (data[6] - data[9]) * s;
      out.y = (data[8] - data[2]) * s;
      out.z = (data[1] - data[4]) * s;
    } else if (data[0] > data[5] && data[0] > data[10]) {
      const s = 2.0 * Math.sqrt(1.0 + data[0] - data[5] - data[10]);
      out.w = (data[6] - data[9]) / s;
      out.x = 0.25 * s;
      out.y = (data[4] + data[1]) / s;
      out.z = (data[8] + data[2]) / s;
    } else if (data[5] > data[10]) {
      const s = 2.0 * Math.sqrt(1.0 + data[5] - data[0] - data[10]);
      out.w = (data[8] - data[2]) / s;
      out.x = (data[4] + data[1]) / s;
      out.y = 0.25 * s;
      out.z = (data[9] + data[6]) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + data[10] - data[0] - data[5]);
      out.w = (data[1] - data[4]) / s;
      out.x = (data[8] + data[2]) / s;
      out.y = (data[9] + data[6]) / s;
      out.z = 0.25 * s;
    }

    return Quat.normalize(out);
  }
}
