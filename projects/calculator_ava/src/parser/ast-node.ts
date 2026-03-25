export class ASTNode {
  type: string;
  value: string | number | null;
  left: ASTNode | null;
  right: ASTNode | null;

  constructor(type: string, value: string | number | null = null, left: ASTNode | null = null, right: ASTNode | null = null) {
    this.type = type;
    this.value = value;
    this.left = left;
    this.right = right;
  }

  evaluate(): number {
    switch (this.type) {
      case 'number':
        return this.value as number;
      case 'identifier':
        return 0;
      case '+':
        return (this.left?.evaluate() ?? 0) + (this.right?.evaluate() ?? 0);
      case '-':
        return (this.left?.evaluate() ?? 0) - (this.right?.evaluate() ?? 0);
      case '*':
        return (this.left?.evaluate() ?? 1) * (this.right?.evaluate() ?? 1);
      case '/':
        const right = this.right?.evaluate() ?? 1;
        return right === 0 ? 0 : (this.left?.evaluate() ?? 0) / right;
      case '%':
        const r = this.right?.evaluate() ?? 1;
        return r === 0 ? 0 : (this.left?.evaluate() ?? 0) % r;
      case '^':
        return Math.pow(this.left?.evaluate() ?? 0, this.right?.evaluate() ?? 0);
      case 'neg':
        return -(this.left?.evaluate() ?? 0);
      default:
        return 0;
    }
  }

  toString(): string {
    switch (this.type) {
      case 'number':
        return String(this.value);
      case 'identifier':
        return String(this.value);
      case 'neg':
        return `-${this.left?.toString() ?? '0'}`;
      default:
        const l = this.left?.toString() ?? '0';
        const r = this.right?.toString() ?? '0';
        return `(${l} ${this.type} ${r})`;
    }
  }

  isLeaf(): boolean {
    return this.left === null && this.right === null;
  }

  clone(): ASTNode {
    return new ASTNode(
      this.type,
      this.value,
      this.left?.clone() ?? null,
      this.right?.clone() ?? null
    );
  }

  replaceChild(old: ASTNode, next: ASTNode): void {
    if (this.left === old) this.left = next;
    if (this.right === old) this.right = next;
  }
}
