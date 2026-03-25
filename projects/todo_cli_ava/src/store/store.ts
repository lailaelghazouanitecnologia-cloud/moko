import { Repository } from './repository';
import { Serializer } from './serializer';
import { Config } from '../core';

export class Store {
  private readonly repository: Repository;
  private readonly serializer: Serializer;
  private readonly config: Config;

  constructor(repository: Repository, serializer: Serializer, config: Config) {
    this.repository = repository;
    this.serializer = serializer;
    this.config = config;
  }

  getRepository(): Repository {
    return this.repository;
  }

  getSerializer(): Serializer {
    return this.serializer;
  }

  getConfig(): Config {
    return this.config;
  }
}
