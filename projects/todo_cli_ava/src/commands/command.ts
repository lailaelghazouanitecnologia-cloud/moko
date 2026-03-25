export interface ValidationError {
  field: string;
  message: string;
}

export interface Command<TContext = unknown, TResult = unknown> {
  execute(context?: TContext): Promise<TResult>;
  canExecute(context?: T): boolean;
  validate(context?: T): ValidationError[];
  getName(): string;
  getDescription(): string;
}
