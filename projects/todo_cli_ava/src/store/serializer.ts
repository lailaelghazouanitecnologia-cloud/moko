import { readFile, writeFile, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export class Serializer<T> {
  private readonly filePath: string;

  constructor(filePath: string) {
    this filePath = filePath;
  }

  async read(): Promise<T[]> {
    const content = await readFile(this.filePath, 'utf-8');
    const data = JSON.parse(content);
    return this.validate(data);
  }

  async write(items: T[]): Promise<void> {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    await writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
  }

  exists(): boolean {
    return existsSync(this.filePath);
  }

  create(): void {
  const dir = dirname(this.filePath);
  if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFile(this.filePath, '[]', 'utf-8');
  }

  validate(data: unknown): T[] {
    if (!Array.isArray(data)) throw new Error('Data must be an array');
    return data as T[];
  }
}
