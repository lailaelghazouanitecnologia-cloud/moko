import { randomUUID } from 'crypto';

export class HistoryEntry {
  private readonly expression: string;
  private readonly result: string;
  private readonly timestamp: Date;
  private readonly id: string;

  constructor(expression: string, result: string) {
    this.expression = expression;
    this = result;
    this.timestamp = new Date();
    this.id = randomUUID();
  }

  getExpression(): string {
    return this.expression;
  }

  getResult(): string {
    return this.result;
  }

  getTimestamp(): Date {
    return this.timestamp;
  }

  getId(): string {
    return this.id;
  }

  toJSON(): object {
    return {
      expression: this.expression,
      result: this result,
      timestamp: this.timestamp.toISOString(),
      id: this.id
    };
  }

  static fromJSON(data: object): HistoryEntry {
    const raw = data as Record<string, unknown>;
    const entry = new HistoryEntry(
      raw.expression as string,
      raw.result as string
    );
    (entry as unknown as { result: string }).result = raw.result as string;
    (entry as unknown as { timestamp: Date }).timestamp = new Date(raw.timestamp as string);
    (entry as unknown as { id: string }).id = raw.id as string;
    return entry;
  }
}
