export interface Repository<T = any> {
  readonly modelName: string;

  create(data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(filter?: Filter, sort?: Sort): Promise<ReadonlyArray<T>>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

type Filter = Record<string, unknown>;
type Sort = Record<string, 1 | -1>;
