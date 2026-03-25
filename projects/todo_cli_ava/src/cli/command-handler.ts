export interface ValidationError {
  field: string;
  message:string;
}

export interface Command<TContext = unknown, TResult = unknown> {
  execute(context?: TContext): Promise<TResult>;
  canExecute(context?: TContext): boolean;
  validate(context?: TContext): ValidationError[];
  getName(): string;
  getDescription(): string;
}
