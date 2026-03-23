import { ReadableStream } from 'stream/web';
import { Request } from './request';
import { RequestHeaders } from './request-headers';
import { RequestBody } from './request-body';

export class RequestParser {
  private readonly maxSize: number;

  constructor(options?: { maxSize?: number }) {
    this.maxSize = options?.maxSize ?? 1024 * 1024; // 1MB default
  }

  async parse(stream: ReadableStream): Promise<Request> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let headersParsed = false;
    let headers: RequestHeaders = {};
    let method = '';
    let url = '';
    let version = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      if (!headersParsed) {
        const headerEnd = buffer.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const headerPart = buffer.slice(0, headerEnd);
          const lines = headerPart.split('\r\n');
          
          const startLine = this.parseStartLine(lines[0]);
          method = startLine.method;
          url = startLine.url;
          version = startLine.version;
          
          headers = this.parseHeaders(lines.slice(1));
          headersParsed = true;
          
          buffer = buffer.slice(headerEnd + 4);
        }
      }
    }

    if (!headersParsed) {
      throw new Error('Invalid HTTP request: headers not found');
    }

    const bodyStream = new ReadableStream({
      start: (controller) => {
        if (buffer) {
          controller.enqueue(new TextEncoder().encode(buffer));
        }
        controller.close();
      }
    });

    const body = this.parseBody(headers, bodyStream);

    return new Request({
      method,
      url,
      version,
      headers,
      body
    });
  }

  parseStartLine(line: string): { method: string; url: string; version: string } {
    const parts = line.split(' ');
    if (parts.length !== 3) {
      throw new Error('Invalid request line format');
    }
    return {
      method: parts[0],
      url: parts[1],
      version: parts[2]
    };
  }

  parseHeaders(lines: string[]): RequestHeaders {
    const headers: RequestHeaders = {};
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;
      
      const name = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();
      headers[name] = value;
    }
    return headers;
  }

  parseQuery(url: string): Record<string, string> {
    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) return {};
    
    const queryString = url.slice(queryIndex + 1);
    const params = new URLSearchParams(queryString);
    const result: Record<string, string> = {};
    
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    
    return result;
  }

  parseCookies(cookieHeader: string): Record<string, string> {
    const cookies: Record<string, string> = {};
    if (!cookieHeader) return cookies;
    
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const [name, ...valueParts] = pair.trim().split('=');
      if (name) {
        cookies[name.trim()] = valueParts.join('=').trim();
      }
    }
    
    return cookies;
  }

  parseBody(headers: RequestHeaders, stream: ReadableStream): RequestBody {
    return new RequestBody(stream, headers);
  }

  validateMethod(method: string): boolean {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'];
    return validMethods.includes(method.toUpperCase());
  }

  validateUrl(url: string): boolean {
    try {
      new URL(url, 'http://localhost');
      return true;
    } catch {
      return false;
    }
  }

  validateHeaders(headers: RequestHeaders): boolean {
    let totalSize = 0;
    for (const [key, value] of Object.entries(headers)) {
      totalSize += key.length + value.length + 4; // ": \r\n"
      if (totalSize > this.maxSize) {
        return false;
      }
    }
    return true;
  }

  extractIp(headers: RequestHeaders, socket: any): string {
    const forwarded = headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIp = headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }
    
    return socket?.remoteAddress || '0.0.0.0';
  }

  extractProtocol(headers: RequestHeaders, encrypted: boolean): string {
    if (encrypted) return 'https';
    
    const forwardedProto = headers['x-forwarded-proto'];
    if (forwardedProto) {
      return forwardedProto;
    }
    
    return 'http';
  }

  extractHostname(headers: RequestHeaders): string {
    const host = headers['host'];
    if (!host) return 'localhost';
    
    const colonIndex = host.lastIndexOf(':');
    return colonIndex !== -1 ? host.slice(0, colonIndex) : host;
  }

  extractPort(headers: RequestHeaders): number {
    const host = headers['host'];
    if (!host) return 80;
    
    const colonIndex = host.lastIndexOf(':');
    if (colonIndex !== -1) {
      const portStr = host.slice(colonIndex + 1);
      const port = parseInt(portStr, 10);
      return isNaN(port) ? 80 : port;
    }
    
    return 80;
  }
}
