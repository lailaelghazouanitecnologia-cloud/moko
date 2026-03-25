export interface Filter {
  readonly field: string;
  readonly operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  readonly value: unknown;
}

export interface Repository<T> {
  readonly modelName: string;

  create(data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(filter?: Filter): Promise<ReadonlyArray<T>>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}
