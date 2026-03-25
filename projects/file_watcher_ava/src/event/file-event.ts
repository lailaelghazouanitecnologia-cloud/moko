export class FileEvent {
  readonly path: string;
  readonly type: string;
  readonly timestamp: number;
  readonly size: number;
  readonly wasDeleted: boolean;
  readonly wasCreated: boolean;
  readonly wasModified: boolean;
  readonly directory: boolean;

  constructor(
    path: string,
    type: string,
    timestamp: number,
    size: number,
    wasDeleted: boolean,
    wasCreated: boolean,
    wasModified: boolean,
    isDirectory: boolean
  ) {

    this.path = path;
    this.type = type;
    this.timestamp = timestamp;
    this.size = size;
    this.wasDeleted = wasDeleted;
    this.wasCreated = wasCreated;
    this.wasModified = wasModified;
    this.directory = isDirectory;
  }

  isFile(): boolean {
    return !this.directory;
  }

  isDirectory(): boolean {
    return this.directory;
  }

  isDeleted(): boolean {
    return this.wasDeleted;
  }

  isCreated(): boolean {
    return this.wasCreated;
  }

  isModified(): boolean {
    return this.wasModified;
  }

  getPath(): string {
    return this.path;
  }

  getType(): string {
    return this.type;
  }
}
