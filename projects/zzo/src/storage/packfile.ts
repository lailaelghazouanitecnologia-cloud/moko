import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Compressed object container for Git-like packfiles.
 * Stores objects with SHA-1 identifiers and handles checksum validation.
 */
export class Packfile {
  private version: number;
  private objects: Map<string, Buffer>;
  private offset: number;
  private checksum: Buffer;

  /**
   * Creates a new Packfile instance.
   * @param version - Packfile version (default: 2)
   * @throws {Error} If version is not a positive integer
   */
  constructor(version: number = 2) {
    if (!Number.isInteger(version) || version <= 0) {
      throw new Error('Version must be a positive integer');
    }
    this.version = version;
    this.objects = new Map();
    this.offset = 0;
    this.checksum = Buffer.alloc(20);
  }

  /**
   * Append an object to the packfile.
   * @param oid - SHA-1 object identifier (40 hex chars)
   * @param data - Object data buffer
   * @throws {Error} If oid is invalid or data is not a Buffer
   */
  addObject(oid: string, data: Buffer): void {
    if (!this.isValidOid(oid)) {
      throw new Error('Invalid OID format: must be 40 hexadecimal characters');
    }
    if (!Buffer.isBuffer(data)) {
      throw new Error('Data must be a Buffer');
    }
    if (data.length === 0) {
      throw new Error('Data cannot be empty');
    }
    this.objects.set(oid, data);
  }

  /**
   * Retrieve an object from the packfile.
   * @param oid - SHA-1 object identifier
   * @returns Object data buffer
   * @throws {Error} If oid is invalid or object not found
   */
  getObject(oid: string): Buffer {
    if (!this.isValidOid(oid)) {
      throw new Error('Invalid OID format: must be 40 hexadecimal characters');
    }
    const obj = this.objects.get(oid);
    if (!obj) {
      throw new Error(`Object ${oid} not found`);
    }
    return obj;
  }

  /**
   * Check if an object exists in the packfile.
   * @param oid - SHA-1 object identifier
   * @returns True if object exists
   * @throws {Error} If oid is invalid
   */
  hasObject(oid: string): boolean {
    if (!this.isValidOid(oid)) {
      throw new Error('Invalid OID format: must be 40 hexadecimal characters');
    }
    return this.objects.has(oid);
  }

  /**
   * Persist the packfile to disk.
   * @param path - File path to write
   * @throws {Error} If path is invalid or write fails
   */
  async write(filePath: string): Promise<void> {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      throw new Error('Invalid path: must be a non-empty string');
    }
    if (this.objects.size === 0) {
      throw new Error('Cannot write empty packfile');
    }

    const chunks: Buffer[] = [];
    const header = Buffer.alloc(8);
    header.writeUInt32BE(0x5041434b, 0); // 'PACK'
    header.writeUInt32BE(this.version, 4);
    chunks.push(header);

    const index: { oid: string; offset: number }[] = [];
    let offset = 8;

    for (const [oid, data] of this.objects) {
      index.push({ oid, offset });
      const compressed = data; // simple store, no compression for now
      const size = compressed.length;
      const sizeEncoded = this.encodeSize(size);
      const entry = Buffer.concat([sizeEncoded, compressed]);
      chunks.push(entry);
      offset += entry.length;
    }

    const checksum = this.calculateChecksum();
    chunks.push(checksum);

    const buffer = Buffer.concat(chunks);
    
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, buffer);
    } catch (error) {
      throw new Error(`Failed to write packfile: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load a packfile from disk.
   * @param path - File path to read
   * @throws {Error} If path is invalid, file is corrupted, or read fails
   */
  async read(filePath: string): Promise<void> {
    if (typeof filePath !== 'string' || filePath.trim()..length === 0) {
      throw new Error('Invalid path: must be a non-empty string');
    }

    let data: Buffer;
    try {
      data = await fs.readFile(filePath);
    } catch (error) {
      throw new Error(`Failed to read packfile: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (data.length < 12) { // header (8) + min object (1) + checksum (20) = 29, but allow 12 for basic validation
      throw new Error('Packfile too small to be valid');
    }

    let offset = 0;

    const magic = data.readUInt32BE(offset);
    if (magic !== 0x5041434b) throw new Error('Invalid packfile magic');
    offset += 4;

    const version = data.readUInt32BE(offset);
    if (version !== this.version) throw new Error('Unsupported packfile version');
    offset += 4

    this.objects.clear();

    while (offset < data.length - 20) {
      const sizeEncoded = this.decodeSize(data, offset);
      offset = sizeEncoded.offset;
      const size = sizeEncoded.size;
      
      if (size <= 0) {
        throw new Error('Invalid object size');
      }
      if (offset + size > data.length - 20) {
        throw new Error('Object extends beyond packfile bounds');
      }
      
      const objData = data.slice(offset, offset + size);
      offset += size;
      const oid = this.inferOid(objData);
      this.objects.set(oid, objData);
    }

    if (offset !== data.length - 20) {
      throw new Error('Packfile contains extra data before checksum');
    }

    const expectedChecksum = data.slice(-20);
    this.checksum = expectedChecksum;
    
    if (!this.verifyChecksum()) {
      throw new Error('Packfile checksum verification failed');
    }
  }

  /**
   * Compute SHA-1 checksum of the packfile content.
   * @returns 20-byte SHA-1 hash buffer
   */
  calculateChecksum(): Buffer {
    const chunks: Buffer[] = [];
    const header = Buffer.alloc(8);
    header.writeUInt32BE(0x5041434b, 0);
    header.writeUInt32BE(this.version, 4);
    chunks.push(header);

    for ( const [, data] of this.objects) {
      const sizeEncoded = this.encodeSize(data.length);
      chunks.push(sizeEncoded, data);
    }

    const content = Buffer.concat(chunks);
    const hash = createHash('sha1');
    hash.update(content);
    this.checksum = hash.digest();
    return this.checksum;
  }

  /**
   * Validate the current checksum against computed value.
   * @returns True if checksum is valid
   */
  verifyChecksum(): boolean {
    const oldChecksum = this.checksum;
    if (!oldChecksum || oldChecksum.length !== 20) {
      return false;
    }
    const newChecksum = this.calculateChecksum();
    return oldChecksum.equals(newChecksum);
  }

  /**
   * Get the number of objects in the packfile.
   * @returns Object count
   */
  getObjectCount(): number {
    return this.objects.size;
  }

  /**
   * Get all object IDs in the packfile.
   * @returns Array of SHA-1 OIDs
   */
  getObjectIds(): string[] {
    return Array.from(this.objects.keys());
  }

  /**
   * Remove an object from the packfile.
   * @param oid - SHA-1 object identifier
   * @returns True if object was removed
   * @throws {Error} If oid is invalid
   */
  removeObject(oid: string): boolean {
    if (!this.isValidOid(oid)) {
      throw new Error('Invalid OID format: must be 40 hexadecimal characters');
    }
    return this.objects.delete(oid);
  }

  /**
   * Clear all objects from the packfile.
   */
  clear(): void {
    this.objects.clear();
    this.checksum = Buffer.alloc(20);
  }

  private encodeSize(size: number): Buffer {
    if (!Number.isInteger(size) || size < 0) {
      throw new Error('Size must be a non-negative integer');
    }
    if (size < 128) return Buffer.from([size]);
    const buf = Buffer.alloc(4);
    let written = 0;
    let byte = 0;
    while (size > 0) {
      byte = (size & 0x7f) | (written > 0 ? 0x80 : 0);
      buf[written++] = byte;
      size >>>= 7;
    }
    return buf.slice(0, written);
  }

  private decodeSize(data: Buffer, offset: number): { size: number; offset: number } {
    if (!Buffer.isBuffer(data)) {
      throw new Error('Data must be a Buffer');
    }
    if (!Number.isInteger(offset) || offset < 0 || offset >= data.length) {
      throw new Error('Invalid offset');
    }
    
    let size = 0;
    let shift = 0;
    let byte = 0;
    const startOffset = offset;
    
    do {
      if (offset >= data.length - 20) { // Leave room for checksum
        throw new Error('Size encoding extends beyond packfile bounds');
      }
      byte = data[offset++];
      size |= (byte & 0x7f) << shift;
      shift += 7;
      if (shift > 35) { // Prevent infinite loops on corrupted data
        throw new Error('Invalid size encoding: too many bytes');
      }
    } while (byte & 0x80);
    
    if (size < 0) {
      throw new Error('Invalid size: negative value');
    }
    
    return { size, offset };
  }

  private inferOid(data: Buffer): string {
    if (!Buffer.isBuffer(data) || data.length === 0) {
      throw new Error('Invalid data: must be a non-empty Buffer');
    }
    const hash = createHash('sha1');
    hash.update(data);
    return hash.digest('hex');
  }

  private isValidOid(oid: string): boolean {
    return typeof oid === 'string' && 
           oid.length === 40 && 
           /^[0-9a-f]{40}$/i.test(oid);
  }
}
