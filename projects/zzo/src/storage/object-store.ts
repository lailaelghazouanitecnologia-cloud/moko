import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, unlinkSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import { Packfile } from './packfile';
import * as zlib from 'zlib';

/**
 * Low-level storage for Git objects.
 */
export class ObjectStore {
  private path: string;
  private compression: number;
  private index: Map<string, number>;

  /**
   * Creates an instance of ObjectStore.
   * @param path Directory where objects are stored.
   * @param compression Zlib compression level (1–9), defaults to 6.
   */
  constructor(path: string, compression: number = 6) {
    if (!path || typeof path !== 'string') {
      throw new TypeError('path must be a non-empty string');
    }
    if (typeof compression !== 'number' || compression < 1 || compression > 9) {
      throw new RangeError('compression must be an integer between 1 and 9');
    }

    this.path = path;
    this.compression = compression;
    this.index = new Map();
    this.loadIndex();
  }

  /**
   * Loads the index file into memory.
   */
  private loadIndex(): void {
    const indexPath = join(this.path, 'index');
    if (!existsSync(indexPath)) return;

    let data: string;
    try {
      data = readFileSync(indexPath, 'utf8');
    } catch (err) {
      throw new Error(`Failed to read index file at ${indexPath}: ${(err as Error).message}`);
    }

    const lines = data.split('\n').filter(l => l.length);
    for (const line of lines) {
      const [oid, offset] = line.split(' ');
      if (!oid || offset === undefined) continue;
      const parsedOffset = parseInt(offset, 10);
      if (isNaN(parsedOffset)) continue;
      this.index.set(oid, parsedOffset);
    }
  }

  /**
   * Persists the in-memory index to disk.
   */
  private saveIndex(): void {
    const indexPath = join(this.path, 'index');
    const data = Array.from(this.index.entries())
      .map(([oid, offset]) => `${oid} ${offset}`)
      .join('\n');
    try {
      writeFileSync(indexPath, data);
    } catch (err) {
      throw new Error(`Failed to write index file at ${indexPath}: ${(err as Error).message}`);
    }
  }

  /**
   * Reads an object by OID.
   * @param oid Object ID (40-char hex).
   * @returns Decompressed object bytes.
   * @throws If OID is invalid or object missing.
   */
  read(oid: string): Buffer {
    if (!this.isValidOid(oid)) {
      throw new TypeError('oid must be a 40-character hex string');
    }

    const objPath = join(this.path, oid.substring(0, 2), oid.substring(2));
    if (!existsSync(objPath)) {
      throw new Error(`Object ${oid} not found`);
    }

    let compressed: Buffer;
    try {
      compressed = readFileSync(objPath);
    } catch (err) {
      throw new Error(`Failed to read object ${oid}: ${(err as Error).message}`);
    }

    try {
      return zlib.inflateSync(compressed);
    } catch (err) {
      throw new Error(`Failed to decompress object ${oid}: ${(err as Error).message}`);
    }
  }

  /**
   * Writes an object to disk.
   * @param oid Expected SHA-1 hex.
   * @param data Raw object bytes.
   * @param type Git object type (blob, tree, commit, tag).
   * @throws If SHA mismatch or write fails.
   */
  write(oid: string, data: Buffer, type: string): void {
    if (!this.isValidOid(oid)) {
      throw new TypeError('oid must be a 40-character hex string');
    }
    if (!Buffer.isBuffer(data)) {
      throw new Type('data must be a Buffer');
    }
    if (!type || typeof type !== 'string') {
      throw new Type('type must be a non-empty string');
    }

    const header = `${type} ${data.length}\0`;
    const fullData = Buffer.concat([Buffer.from(header), data]);

    const hash = createHash('sha1').update(fullData).digest('hex');
    if (hash !== oid) {
      throw new Error(`SHA1 mismatch: expected ${oid}, got ${hash}`);
    }

    const compressed = zlib.deflateSync(fullData, { level: this.compression });

    const objPath = join(this.path, oid.substring(0, 2), oid.substring(2));
    mkdirSync(dirname(objPath), { recursive: true });

    let offset: number;
    try {
      offset = statSync(objPath).size || 0;
    } catch {
      offset = 0;
    }
    try {
      writeFileSync(objPath, compressed);
    } catch (err) {
      throw new Error(`Failed to write object ${oid}: ${(err as Error).message}`);
    }

    this.index.set(oid, offset);
    this.saveIndex();
  }

  /**
   * Checks if an object exists.
   * @param oid Object ID.
   * @returns True if present.
   */
  exists(oid: string): boolean {
    if (!this.isValidOid(oid)) return false;
    const objPath = join(this.path, oid.substring(0, 2), oid.substring(2));
    return existsSync(objPath);
  }

  /**
   * Deletes an object.
   * @param oid Object ID.
   */
  delete(oid: string): void {
    if (!this.isValidOid(oid)) return;
    const objPath = join(this.path, oid.substring(0, 2), oid.substring(2));
    if (existsSync(objPath)) {
      try {
        unlinkSync(objPath);
      } catch (err) {
        throw new Error(`Failed to delete object ${oid}: ${(err as Error).message}`);
      }
      this.index.delete(oid);
      this.saveIndex();
    }
  }

  /**
   * Lists all stored OIDs.
   * @returns Array of 40-char hex strings.
   */
  list(): string[] {
    const objects: string[] = [];
    let entries: string[];
    try {
      entries = readdirSync(this.path);
    catch {
      return objects;
    }

    const subdirs = entries.filter(f => {
      const p = join(this.path, f);
      try {
        return statSync(p).isDirectory();
      } catch {
        return false;
      }
    });

    for (const subdir of subdirs) {
      if (subdir.length !== 2) continue;
      let files: string[];
      try {
        files = readdirSync(join(this.path, subdir));
      } catch {
        continue;
      }
      for (const file of files) {
        objects.push(subdir + file);
      }
    }

    return objects;
  }

  /**
   * Creates a packfile from a set of OIDs.
   * @param oids Object IDs to pack.
   * @returns Packfile instance.
   */
  pack(oids: string[]): Packfile {
    if (!Array.isArray(oids)) {
      throw new TypeError('oids must be an array');
    }
    const packfile = new Packfile();

    for (const oid of oids) {
      if (this.exists(oid)) {
        const data = this.read(oid);
        packfile.addObject(oid, data);
      }
    }

    return packfile;
  }

  /**
   * Extracts objects from a packfile into this store.
   * @param pack Packfile to unpack.
   */
  unpack(pack: Packfile): void {
    if (!pack || typeof (pack as any).objects !== 'object') {
      throw new TypeError('pack must be a valid Packfile');
    }
    for (const [oid, data] of (pack as any).objects) {
      const type = this.inferType(data);
      this.write(oid, data, type);
    }
  }

  /**
   * Infers Git object type from raw data.
   * @param data Compressed object bytes.
   * @returns Object type string.
   */
  private inferType(data: Buffer): string {
    if (!Buffer.isBuffer(data)) return 'blob';
    let decompressed: Buffer;
    try {
      decompressed = zlib.inflateSync(data);
    } catch {
      return 'blob';
    }
    const nullIndex = decompressed.indexOf(0);
    if (nullIndex === -1) return 'blob';

    const header = decompressed.subarray(0, nullIndex).toString();
    const spaceIndex = header.indexOf(' ');
    if (spaceIndex === -1) return 'blob';

    return header.substring(0, spaceIndex);
  }

  /**
   * Verifies object integrity.
   * @param oid Object ID.
   * @returns True if valid.
   */
  verify(oid: string): boolean {
    if (!this.isValidOid(oid)) return false;
    let data: Buffer;
    try {
      data = this.read(oid);
    } catch {
      return false;
    }
    let decompressed: Buffer;
    try {
      decompressed = zlib.inflateSync(data);
    } catch {
      return false;
    }

    const nullIndex = decompressed.indexOf(0);
    if (nullIndex === -1) return false;

    const header = decompressed.subarray(0, nullIndex).toString();
    const spaceIndex = header.indexOf(' ');
    if (spaceIndex === -1) return false;

    const size = parseInt(header.substring(spaceIndex + 1), 10);
    if (isNaN(size)) return false;

    const content = decompressed.subarray(nullIndex + 1);
    return content.length === size;
  }

  /**
   * Validates OID format.
   * @param oid Hex string.
   * @returns True if valid.
   */
  private isValidOid(oid: string): boolean {
    return typeof oid === 'string' && /^[0-9a-f]{40}$/i.test(oid);
  }
}
