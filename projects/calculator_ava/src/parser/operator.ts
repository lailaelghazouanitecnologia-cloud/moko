import { ASTNode } from './ast-node';

export class Operator {
  private readonly precedence: number;
  private readonly associativity: 'left' | 'right';

  constructor(precedence: number, associativity: 'left' | 'right' = 'left') {
    this precedence = precedence;
    this associativity = associativity;
  }

  getPrecedence(): number {
    return this precedence;
 }

  getAssociivity(): 'left' | 'right {
    return this associativity;
  }

  evaluate(left: number, right: number): number {
    throw new Error('Operator.evaluate must be implemented by subclass');
  }

  toString(): string {
    throw new Error('Operator.toString must be implemented by subclass');
  }
}
