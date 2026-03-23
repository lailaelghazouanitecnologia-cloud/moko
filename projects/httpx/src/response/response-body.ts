import { Readable, Writable } from 'stream';
import { createReadStream } from 'fs';
import { lookup } from 'mime-types';

export enum BodyType {
  EMPTY = 'empty',
  TEXT = 'text',
  JSON = 'json',
  BUFFER = 'buffer',
  STREAM = 'stream'
}

export class ResponseBody {
  readonly type: BodyType;
  readonly data: Buffer | string | object | null;
  readonly stream: Readable | null;

  private constructor(type: BodyType, data: Buffer | string | object | null, stream: Readable | null) {
    this.type = type;
    this.data = data;
    this.stream = stream;
  }

  isEmpty(): boolean {
    return this.type === BodyType.EMPTY;
  }

  isStream(): boolean {
    return this.type === BodyType.STREAM;
  }

  isBuffer(): boolean {
    return this.type === BodyType.BUFFER;
  }

  isText(): boolean {
    return this.type === BodyType.TEXT;
  }

  isJSON(): boolean {
    return this.type === BodyType.JSON;
  }

  getSize(): number {
    if (this.type === BodyType.EMPTY) return 0;
    if (this.type === BodyType.STREAM) return -1;
    if (this.type === BodyType.BUFFER) return (this.data as Buffer).length;
    if (this.type === BodyType.TEXT) return Buffer.byteLength(this.data as string, 'utf8');
    if (this.type === BodyType.JSON) return Buffer.byteLength(JSON.stringify(this.data), 'utf8');
    return 0;
  }

  getContentType(): string | undefined {
    if (this.type === BodyType.EMPTY) return undefined;
    if (this.type === BodyType.TEXT) return 'text/plain';
    if (this.type === BodyType.JSON) return 'application/json';
    if (this.type === BodyType.BUFFER) return 'application/octet-stream';
    if (this.type === BodyType.STREAM && this.stream) {
      const stream = this.stream as any;
      if (stream.path) {
        const mime = lookup(stream.path);
        return mime || 'application/octet-stream';
      }
    }
    return 'application/octet-stream';
  }

  toBuffer(): Buffer {
    if (this.type === BodyType.EMPTY) return Buffer.alloc(0);
    if (this.type === BodyType.BUFFER) return this.data as Buffer;
    if (this.type === BodyType.TEXT) return Buffer.from(this.data as string, 'utf8');
    if (this.type === BodyType.JSON) return Buffer.from(JSON.stringify(this.data), 'utf8');
    if (this.type === BodyType.STREAM) throw new Error('Cannot convert stream to buffer synchronously');
    throw new Error('Unknown body type');
  }

  toString(): string {
    if (this.type === BodyType.EMPTY) return '';
    if (this.type === BodyType.TEXT) return this.data as string;
    if (this.type === BodyType.JSON) return JSON.stringify(this.data);
    if (this.type === BodyType.BUFFER) return (this.data as Buffer).toString('utf8');
    if (this.type === BodyType.STREAM) throw new Error('Cannot convert stream to string synchronously');
    throw new Error('Unknown body type');
  }

  toJSON(): any {
    if (this.type === BodyType.JSON) return this.data;
    if (this.type === BodyType.TEXT) {
      try {
        return JSON.parse(this.data as string);
      } catch {
        throw new Error('Body is not valid JSON');
      }
    }
    if (this.type === BodyType.BUFFER) {
      try {
        return JSON.parse((this.data as Buffer).toString('utf8'));
      } catch {
        throw new Error('Body is not valid JSON');
      }
    }
    if (this.type === BodyType.EMPTY) return null;
    throw new Error('Cannot convert stream to JSON synchronously');
  }

  getStream(): Readable | null {
    return this.stream;
  }

  pipe(destination: Writable): Writable {
    if (this.type === BodyType.STREAM && this.stream) {
      return this.stream.pipe(destination);
    }
    if (this.type === BodyType.EMPTY) {
      destination.end();
      return destination;
    }
    const buffer = this.toBuffer();
    destination.write(buffer);
    destination.end();
    return destination;
  }

  static create(data: any): ResponseBody {
    if (data === null || data === undefined) {
      return ResponseBody.EMPTY;
    }
    if (data instanceof Buffer) {
      return new ResponseBody(BodyType.BUFFER, data, null);
    }
    if (typeof data === 'string') {
      return new ResponseBody(BodyType.TEXT, data, null);
    }
    if (data instanceof Readable) {
      return new ResponseBody(BodyType.STREAM, null, data);
    }
    if (typeof data === 'object') {
      return new ResponseBody(BodyType.JSON, data, null);
    }
    return new ResponseBody(BodyType.TEXT, String(data), null);
  }

  static fromStream(stream: Readable): ResponseBody {
    return new ResponseBody(BodyType.STREAM, null, stream);
  }

  static fromFile(path: string): ResponseBody {
    const stream = createReadStream(path);
    return new ResponseBody(BodyType.STREAM, null, stream);
  }

  static readonly EMPTY = new ResponseBody(BodyType.EMPTY, null, null);
}
