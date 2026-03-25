export interface Serializer<T> {
  readonly contentType: string;

  serialize(entity: T): string;
  deserialize(data: string): T;
  serializeBulk(entities: T[]): string;
  deserializeBulk(data: string): T[];
}
