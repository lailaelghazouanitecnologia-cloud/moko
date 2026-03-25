import { Evaluator } from './evaluator';
import { ScientificLibrary } from './scientific-library';
import { ConstantRegistry } from './constant-registry';
import { ExpressionParser } from '../parser';

export class CalculatorEngine {
  private readonly evaluator: Evaluator;
  private readonly sciLib: ScientificLibrary;
  private readonly constReg: ConstantRegistry;
  private readonly parser: ExpressionParser;

  constructor() {
    this.sciLib = new ScientificLibrary();
    this.constReg = new ConstantRegistry();
    this.parser = new ExpressionParser();
    this.evaluator = new Evaluator(this.parser, this.sciLib, this.constReg);
  }

  evaluate(expression: string): number {
    return this.evaluator.evaluate(expression);
  }

  evaluateAST(node: ASTNode): number {
    return this.evaluator.evaluateAST(node);
  }

  getScientificLibrary(): ScientificLibrary {
    return this.sciLib;
  }

  getConstantRegistry(): ConstantRegistry {
    return this.constReg;
  }

  getParser(): ExpressionParser {
    return this.parser;
  }

  getEvaluator(): Evaluator {
    return this.evaluator;
  }

  clearHistory(): void {
    this.evaluator.recordHistory(NaN);
  }

  getHistory(): ReadonlyArray<number> {
    return this.evaluator.history;
  }
}
