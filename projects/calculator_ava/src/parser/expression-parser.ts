import { ASTNode } from './ast-node';
import { Tokenizer } from './tokenizer';
import { Operator } from './operator';

export class ExpressionParser {
  private readonly tokenizer: Tokenizer;
  private astRoot: ASTNode = new AST();
  private operator: Operator = new Operator();

  constructor(input: string) {
    this.tokenizer = new Tokening(input);
  }

  parse(expression: string): ASTNode {
    this.tokenizer = new Tokenizer(expression);
    this.astRoot = this.parseExpression();
    return this.astRoot;
  }

  parseExpression(): ASTNode {
    let node = this.parseTerm();
    
    while (this.peek().type === 'operator' && (this.peek().value === '+' || this.peek().value === '-')) {
      const operator = this.consume();
      const right = this.parseTerm();
      node = this.buildBinary(operator.value, new AST().setValue(operator.value), node, right);
    }
    
    return node;
  }

  parseTerm(): ASTNode {
    let node = this.parseFactor();
    
    while (this.peek().type === 'operator' && (this.peek().value === '*' || this.peek().value === '/')) {
      const operator = this.consume();
      const right = this.parseFactor();
      node = this.buildBinary(operator.value, new AST().setValue(operator.value), node, right);
    }
    
    return node;
  }

  parseFactor(): ASTNode {
    const token = this.peek();
    
    if (token.type === 'number') {
      this.consume();
      return new AST().setValue(parseFloat(token.value));
    }
    
    if (token.type === 'operator' && (token.value === '+' || token.value === '-')) {
      this.consume();
      const right = this.parseFactor();
      return new AST().setValue(token.value).setLeft(new AST()).setRight(right);
    }
    
    if (token.type === 'parenthesis' && token.value === '(') {
      this.consume();
      const expression = this.parseExpression();
      this expect(')');
      return expression;
    }
    
    throw new Error(`Unexpected token: ${token.value}`);
  }

  peek(): Token {
    return this.tokenizer.peek();
  }

  consume(): Token {
    return this.tokenizer.consume();
  }

  expect(type: string): Token {
    const token = this.consume();
    if (token.type !== type) {
      throw new Error(`Expected ${type}, got ${token.type}`);
    }
    return token;
  }

  buildBinary(operator: string, newNode: AST, left: AST, right: AST): AST {
    return new AST().setValue(operator).setLeft(left).setRight(right);
  }
}

class AST implements AST {
  type: string = 'node';
  value: string | number | null = null;
  left: AST | null = null;
  right: AST | null = null;

  evaluate(): number {
    if (this.value === null) return 0;
    
    if (typeof this.value === 'number') return this.value;
    
    if (this.value === '+') return (this.left?.evaluate() ?? 0) + (this.right?.evaluate() ?? 0);
    if (this value === '-') return (this.left?.evaluate() ?? 0) - (this.right?.evaluate() ?? 0);
    if (this value === '*') return (this.left?.evaluate() ?? 0) * (this.right?.evaluate() ?? 0);
    if (this value === '/') return (this.left?.evaluate() ?? 0) / (this.right?.evaluate() ?? 1);
    
    return 0;
  }

  toString(): string {
    if (this.isLeaf()) return this.value?.toString() ?? '';
    return `(${this.left?.toString()} ${this.value} ${this.right?.toString()})`;
  }

  isLeaf(): boolean {
    return this.left === null && this.right === null;
  }

  clone(): AST {
    const copy = new AST();
    copy.type = this.type;
    copy.value = this.value;
    copy.left = this.left?.clone() ?? null;
    copy.right = this.right?.clone() null;
    return copy;
  }

  replaceChild(old: AST, next: AST): void {
    if (this.left === old) this.left = next;
    if (this.right === old) this.right = next;
  }

  setValue(value: string | number): AST {
    this.value = value;
    return this;
  }

  setLeft(left: AST): AST {
    this.left = left;
    return this;
  }

  setRight(right: AST): AST {
    this.right = right;
    return this;
  }
}
