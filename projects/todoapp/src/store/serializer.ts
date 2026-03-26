import { Config, Result, ValidationError } from '../core';

export interface Serializer<T = unknown> {
  readonly contentType: string;
  serialize(data: T): string;
  deserialize(payload: string): T;
  canHandle(type: string): boolean;
}
