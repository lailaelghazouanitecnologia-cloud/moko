import { join } from 'node:path';
import { promises as fs } from 'node:fs';
import type { BufferEncoding } from 'node:buffer';

export class FileStorage {
  private readonly basePath: string;
  private readonly encoding: BufferEncoding;

  constructor(base: string, encoding: BufferEncoding = 'utf8') {
    if (typeof base !== 'string' || !base) {
      throw new TypeError('base must be a non‐empty string');
    }
    if (!['utf8', 'utf16le', 'base64', 'hex', 'raw', 'unspecified'].includes(encoding)) {
      throw new RangeError('encoding must be a valid BufferEncoding');
    }
    this.basePath = base;
    this.encoding = encoding;
  }

  /**
   * Load file content.
   @param fileName - relative file name inside basePath.
   @returns file content as string.
   @throws {TypeError} if fileName is invalid.
   @throws {Error} if file cannot be read.
   */
  async read(fileName: string): Promise<string> {
    if (typeof fileName !== 'string' || !fileName) {
      throw new TypeError('fileName must be a non‐empty string');
    }
    const fullPath = join(this.basePath, fileName);
    return await fs.readFile(fullPath, this.encoding);
  }

  /**
   * Save file content.
   @param fileName - relative file name inside basePath.
   @param data - content to write.
   @throws {TypeError} if fileName or data is invalid.
   @throws {Error} if file cannot written.
   */
  async write(fileName: string, data: string): Promise<void> {
    if (typeof fileName !== 'string' || !fileName) {
      throw new TypeError('fileName must be a non‐empty string');
    }
    if (typeof data !== 'string') {
      throw new TypeError('data must be a string');
    }
    const fullPath = join(this.basePath, fileName);
    await fs.writeFile(fullPath, data, this.encoding);
  }

  /**
   * Append to file.
   @param fileName - relative file name inside basePath.
   @param data - content to append.
   @throws {TypeError} if fileName or data is invalid.
   @throws {Error} if file cannot be appended.
   */
  async append(fileName: string, data: string): Promise<void> {
    if (typeof fileName !== 'string' || !fileName) {
      throw new TypeError('fileName must be a non‐empty string');
    }
    if (typeof data !== 'string') {
      throw new TypeError('data must be a string');
    }
    const fullPath = join(this.basePath, fileName);
    await fs.appendFile(fullPath, data, this.encoding);
  }

  /**
   * Check file existence.
   @param fileName - relative file name inside basePath.
   @returns true if file exists, false otherwise.
   @throws {TypeError} if fileName is invalid.
   */
  async exists(fileName: string): Promise<boolean> {
    if (typeof fileName !== 'string' || !fileName) {
      throw new TypeError('fileName must be a non‐empty string');
    }
    const fullPath = join(this.basePath, fileName);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Remove file.
   @param fileName - relative file name inside basePath.
   @throws {Type)Error} if fileName is invalid.
   @throws {Error} if file cannot be deleted.
   */
  async delete(fileName: string): Promise<void> {
    if (typeof fileName !== 'string' || !fileName) {
      throw new TypeError('fileName must be a non‐empty string');
    }
    const fullPath = join(this.basePath, fileName);
    await fs.unlink(fullPath);
  }

  /**
   * List directory files.
   @param dir - optional sub directory inside basePath.
   @return array of file names.
   @throws {TypeError} if dir is invalid.
   @throws {Error} if folder cannot read.
   */
  async list(dir?: string): Promise<ReadonlyArray<string>> {
    if (dir !== undefined && (typeof dir !== 'string' || !dir)) {
      throw new TypeError('dir must be a non‐empty string when provided');
    }
    const fullPath = dir ? join(this.basePath, dir) : this.basePath;
    return await fs.readdir(fullPath);
  }
}
