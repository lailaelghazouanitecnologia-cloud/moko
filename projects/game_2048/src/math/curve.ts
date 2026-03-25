export class Curve {
    coeffs: Float32Array;

    constructor() {
        this.coeffs = new Float32Array(4);
        this.setCoeffs(0, 0, 0, 0);
    }

    setCoeffs(a: number, b: number, c: number, d: number): void {
        this.coeffs[0] = a;
        this.coeffs[1] = b;
        this.coeffs[2] = c;
        this.coeffs[3] = d;
    }

    eval(t: number): number {
        const [a, b, c, d] = this.coeffs;
        return ((a * t + b) * t + c) * t + d;
    }

    evalDerivative(t: number): number {
        const [a, b, c] = this.coeffs;
        return (3 * a * t + 2 * b) * t + c;
    }

    evalSecondDerivative(t: number): number {
        const [a, b] = this.coeffs;
        return 6 * a * t + 2 * b;
    }

    findRoots(): number[] {
        const [a, b, c, d] = this.coeffs;
        const roots: number[] = [];

        if (Math.abs(a) < 1e-10) {
            // Quadratic case
            if (Math.abs(b) < 1e-10) {
                // Linear case
                if (Math.abs(c) > 1e-10) {
                    roots.push(-d / c);
                }
            } else {
                const disc = c * c - 4 * b * d;
                if (disc >= 0) {
                    const sqrtDisc = Math.sqrt(disc);
                    roots.push((-c + sqrtDisc) / (2 * b));
                    roots.push((-c - sqrtDisc) / (2 * b));
                }
            }
            return roots;
        }

        // Depressed cubic: t = x - b/(3a)
        const p = (3 * a * c - b * b) / (3 * a * a);
        const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);
        const disc = (q / 2) * (q / 2) + (p / 3) * (p / 3);

        if (disc > 0) {
            const sqrtDisc = Math.sqrt(disc);
            const u = Math.cbrt(-q / 2 + sqrtDisc);
            const v = Math.cbrt(-q / 2 - sqrtDisc);
            roots.push(u + v - b / (3 * a));
        } else if (disc === 0) {
            const u = Math.cbrt(-q / 2);
            roots.push(2 * u - b / (3 * a));
            roots.push(-u - b / (3 * a));
        } else {
            const r = Math.sqrt(-p / 3);
            const theta = Math.acos(-q / (2 * r * r * r));
            for (let k = 0; k < 3; k++) {
                roots.push(2 * r * Math.cos((theta + 2 * Math.PI * k) / 3) - b / (3 * a));
            }
        }

        return roots.filter(r => isFinite(r));
    }

    integrate(t0: number, t1: number): number {
        const [a, b, c, d] = this.coeffs;
        const dt = t1 - t0;
        const t0s = t0 * t0;
        const t1s = t1 * t1;
        const t0c = t0s * t0;
        const t1c = t1s * t1;
        const t0q = t0c * t0;
        const t1q = t1c * t1;

        return (a / 4) * (t1q - t0q) +
               (b / 3) * (t1c - t0c) +
               (c / 2) * (t1s - t0s) +
               d * dt;
    }

    copy(other: Curve): void {
        this.coeffs.set(other.coeffs);
    }

    clone(): Curve {
        const curve = new Curve();
        curve.copy(this);
        return curve;
    }
}
