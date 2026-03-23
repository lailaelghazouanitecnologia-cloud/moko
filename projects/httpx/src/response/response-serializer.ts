import { Response } from './response';
import { ResponseHeaders } from './response-headers';
import { ResponseBody } from './response-body';
import { SerializedResponse } from './serialized-response';
import { Cookie } from './cookie';
import { createHash } from 'crypto';
import { createGzip } from 'zlib';
import { promisify } from 'util';

const gzip = promisify(createGzip);

export class ResponseSerializer {
    serialize(response: Response): SerializedResponse {
        let headers = this.serializeHeaders(response.headers);
        let body = this.serializeBody(response.body);
        
        if (body !== null) {
            const contentLength = this.calculateContentLength(response.body);
            headers['content-length'] = contentLength.toString();
            
            const contentType = this.determineContentType(response.body);
            if (contentType) {
                headers['content-type'] = contentType;
            }
        }
        
        headers = this.addSecurityHeaders(headers);
        
        if (response.cors) {
            headers = this.addCorsHeaders(headers, response.cors.origin);
        }
        
        if (response.cache) {
            headers = this.addCacheHeaders(headers, response.cache.maxAge);
        }
        
        if (body instanceof Buffer) {
            const etag = this.addEtag(body);
            headers['etag'] = etag;
            headers = this.addLastModified(headers, new Date());
        }
        
        this.validateHeaders(headers);
        
        const cookies = this.serializeCookies(response.cookies);
        const statusLine = this.createStatusLine(response.status);
        
        if (body instanceof Buffer && this.shouldCompress(response)) {
            body = this.compress(body);
            headers['content-encoding'] = 'gzip';
            headers['content-length'] = body.length.toString();
        }
        
        return {
            statusLine,
            headers,
            cookies,
            body
        };
    }
    
    serializeHeaders(headers: ResponseHeaders): Record<string, string> {
        const result: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
            if (value !== undefined && value !== null) {
                result[key.toLowerCase()] = this.formatHeader(key, String(value));
            }
        }
        return result;
    }
    
    serializeBody(body: ResponseBody): Buffer | string | null {
        if (body === null || body === undefined) {
            return null;
        }
        
        if (body instanceof Buffer) {
            return body;
        }
        
        if (typeof body === 'string') {
            return body;
        }
        
        if (typeof body === 'object') {
            return JSON.stringify(body);
        }
        
        return String(body);
    }
    
    serializeCookies(cookies: Map<string, Cookie>): string[] {
        const result: string[] = [];
        for (const [name, cookie] of cookies) {
            let cookieStr = `${name}=${cookie.value}`;
            
            if (cookie.domain) {
                cookieStr += `; Domain=${cookie.domain}`;
            }
            
            if (cookie.path) {
                cookieStr += `; Path=${cookie.path}`;
            }
            
            if (cookie.expires) {
                cookieStr += `; Expires=${cookie.expires.toUTCString()}`;
            }
            
            if (cookie.maxAge !== undefined) {
                cookieStr += `; Max-Age=${cookie.maxAge}`;
            }
            
            if (cookie.secure) {
                cookieStr += '; Secure';
            }
            
            if (cookie.httpOnly) {
                cookieStr += '; HttpOnly';
            }
            
            if (cookie.sameSite) {
                cookieStr += `; SameSite=${cookie.sameSite}`;
            }
            
            result.push(cookieStr);
        }
        return result;
    }
    
    calculateContentLength(body: ResponseBody): number {
        if (body === null || body === undefined) {
            return 0;
        }
        
        if (body instanceof Buffer) {
            return body.length;
        }
        
        if (typeof body === 'string') {
            return Buffer.byteLength(body, 'utf8');
        }
        
        if (typeof body === 'object') {
            return Buffer.byteLength(JSON.stringify(body), 'utf8');
        }
        
        return Buffer.byteLength(String(body), 'utf8');
    }
    
    determineContentType(body: ResponseBody): string | undefined {
        if (body === null || body === undefined) {
            return undefined;
        }
        
        if (body instanceof Buffer) {
            return 'application/octet-stream';
        }
        
        if (typeof body === 'string') {
            return 'text/plain; charset=utf-8';
        }
        
        if (typeof body === 'object') {
            return 'application/json; charset=utf-8';
        }
        
        return 'text/plain; charset=utf-8';
    }
    
    createStatusLine(code: number): string {
        const statusTexts: Record<number, string> = {
            200: 'OK',
            201: 'Created',
            204: 'No Content',
            301: 'Moved Permanently',
            302: 'Found',
            304: 'Not Modified',
            400: 'Bad Request',
            401: 'Unauthorized',
            403: 'Forbidden',
            404: 'Not Found',
            405: 'Method Not Allowed',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable'
        };
        
        const statusText = statusTexts[code] || 'Unknown';
        return `HTTP/1.1 ${code} ${statusText}`;
    }
    
    formatHeader(name: string, value: string): string {
        return value.replace(/[\r\n]/g, '').trim();
    }
    
    shouldCompress(response: Response): boolean {
        const compressibleTypes = [
            'text/',
            'application/json',
            'application/javascript',
            'application/xml',
            'application/rss+xml',
            'application/atom+xml',
            'image/svg+xml'
        ];
        
        const contentType = this.determineContentType(response.body);
        if (!contentType) {
            return false;
        }
        
        const isCompressible = compressibleTypes.some(type => 
            contentType.startsWith(type)
        );
        
        const contentLength = this.calculateContentLength(response.body);
        return isCompressible && contentLength > 1024;
    }
    
    compress(data: Buffer): Buffer {
        return createGzip().write(data);
    }
    
    addSecurityHeaders(headers: ResponseHeaders): ResponseHeaders {
        const securityHeaders = {
            'x-content-type-options': 'nosniff',
            'x-frame-options': 'DENY',
            'x-xss-protection': '1; mode=block',
            'referrer-policy': 'strict-origin-when-cross-origin',
            'content-security-policy': "default-src 'self'"
        };
        
        return { ...headers, ...securityHeaders };
    }
    
    addCorsHeaders(headers: ResponseHeaders, origin?: string): ResponseHeaders {
        const corsHeaders: ResponseHeaders = {
            'access-control-allow-origin': origin || '*',
            'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'access-control-allow-headers': 'Content-Type, Authorization',
            'access-control-max-age': '86400'
        };
        
        return { ...headers, ...corsHeaders };
    }
    
    addCacheHeaders(headers: ResponseHeaders, maxAge?: number): ResponseHeaders {
        const cacheControl = maxAge ? `max-age=${maxAge}` : 'no-cache';
        return {
            ...headers,
            'cache-control': cacheControl
        };
    }
    
    addEtag(body: Buffer): string {
        const hash = createHash('md5').update(body).digest('hex');
        return `"${hash}"`;
    }
    
    addLastModified(headers: ResponseHeaders, date: Date): ResponseHeaders {
        return {
            ...headers,
            'last-modified': date.toUTCString()
        };
    }
    
    validateHeaders(headers: ResponseHeaders): void {
        for (const [key, value] of Object.entries(headers)) {
            if (key.toLowerCase() === 'content-length') {
                const num = Number(value);
                if (isNaN(num) || num < 0) {
                    throw new Error('Invalid content-length header');
                }
            }
            
            if (typeof value === 'string') {
                if (value.includes('\r') || value.includes('\n')) {
                    throw new Error(`Header value for ${key} contains invalid characters`);
                }
            }
        }
    }
}
