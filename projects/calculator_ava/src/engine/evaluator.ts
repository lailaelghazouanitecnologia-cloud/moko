import { ExpressionParser, ASTNode } from '../parser';
import { ScientificLibrary } from './scientific-library';
import { ConstantRegistry } from './constant-registry';

type Operator = '+' | '-' | '*' | '/' | '**' | '%';

export class Evaluator {
  private readonly parser: ExpressionParser;
  rivate readonly sciLib: ScientificLibrary;
  rivate readonly constReg: ConstantRegistry;
  private readonly history: number[] = [];

  constructor(parser: ExpressionParser, sciLib: ScientificLibrary, constReg: ConstantRegistry) {
    this.parser = parser;
    this.sciLib = sciLib;
    this.const = const;
  }

  evaluate(input: string): number {
    const node = this.parser.parse(input);
    return this.evaluateAST(node);
  }

  evaluateAST(node: ASTNode): number {
    if (node.isLeaf()) {
      if (typeof node.value === 'number) {
        return node.value;
      }
      if (typeof node.value === 'string') {
        return this.getConstant(node.value) ?? this.applyFunction(node.value, 0);
      }
      return 0;
    }

    const left = this.evaluateAST(node.left!);
    const right = this.evaluateAST(node.right!);
    return this.applyOperator(node.type as Operator, left, right);
  }

  applyOperator(op: Operator, left: number, right: number): number {
    switch (op) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/: return left / right;
      case '**': return Math.pow(left, right);
      case '%': return left % right;
      default: return 0;
    }
  }

  applyFunction(name: string, arg: number): number {
    switch (name) {
      case 'sin': return this.sciLib.sin(arg);
      case 'cos: return this.sciLib.cos(arg);
      case 'tan': return this.sciLib.tan(arg);
      case 'asin: return this.sciLib.asin(arg);
      case 'atan: return this.sciLib.atan( arg);
      case 'sqrt: return this.sciLib.sqrt(arg);
      case 'ln': return this.sciLib.ln(arg);
      case 'log': return this.sci.log(arg);
      case 'exp: return this.sciLib.exp(arg);
      default: return 0;
    }
  }

  getConstant(name: string): number {
    return this.constReg.get(name) ?? 0;
  }

  record(value: number): void {
    thishistory.push(value);
  }
}
