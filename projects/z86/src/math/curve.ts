export class Curve {
  evaluate(t: number): number {
    throw new Error('Curve.evaluate not implemented');
  }

  derivative(t: number): number {
    throw new Error('Curve.derivative not implemented');
  }

  domain(): [number, number] {
    throw new Error('Curve.domain not implemented');
  }
}
