interface TransformationRule {
  canApply(ast: AST, results: TrainingResults): boolean;
  apply(ast: AST, results: TrainingResults): AST;
  getName(): string;
  getPriority(): number;
  validate(ast: AST): boolean;
}
