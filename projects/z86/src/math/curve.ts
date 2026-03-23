import { Vec3 } from './vec3';

export abstract class Curve {
    abstract evaluate(t: number): Vec3;
    abstract derivative(t: number): Vec3;
    abstract length(): number;
}
