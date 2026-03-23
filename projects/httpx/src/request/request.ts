import { RequestHeaders } from './request-headers';
import { RequestBody } from './request-body';

export class Request {
    readonly method: string;
    readonly url: string;
    readonly headers: RequestHeaders;
    readonly body: RequestBody;
    readonly params: Record<string, string>;
    readonly query: Record<string, string>;
    readonly cookies: Record<string, string>;
    readonly ip: string;
    readonly protocol: string;
    readonly hostname: string;
    readonly port: number;

    constructor(
        method: string,
        url: string,
        headers: RequestHeaders,
        body: RequestBody,
        params: Record<string, string> = {},
        query: Record<string, string> = {},
        cookies: Record<string, string> = {},
        ip: string = '',
        protocol: string = 'http',
        hostname: string = '',
        port: number = 80
    ) {
        this.method = method;
        this.url = url;
        this.headers = headers;
        this.body = body;
        this.params = params;
        this.query = query;
        this.cookies = cookies;
        this.ip = ip;
        this.protocol = protocol;
        this.hostname = hostname;
        this.port = port;
    }

    clone(updates?: Partial<Request>): Request {
        return new Request(
            updates?.method ?? this.method,
            updates?.url ?? this.url,
            updates?.headers ?? this.headers,
            updates?.body ?? this.body,
            updates?.params ?? { ...this.params },
            updates?.query ?? { ...this.query },
            updates?.cookies ?? { ...this.cookies },
            updates?.ip ?? this.ip,
            updates?.protocol ?? this.protocol,
            updates?.hostname ?? this.hostname,
            updates?.port ?? this.port
        );
    }

    get(header: string): string | undefined {
        const normalizedHeader = header.toLowerCase();
        for (const [key, value] of Object.entries(this.headers)) {
            if (key.toLowerCase() === normalizedHeader) {
                return value;
            }
        }
        return undefined;
    }

    has(header: string): boolean {
        return this.get(header) !== undefined;
    }

    accepts(type: string): boolean {
        const accept = this.get('accept');
        if (!accept) return true;
        return accept.split(',').some(t => t.trim().startsWith(type));
    }

    acceptsEncodings(encoding: string): boolean {
        const acceptEncoding = this.get('accept-encoding');
        if (!acceptEncoding) return true;
        return acceptEncoding.split(',').some(e => e.trim().startsWith(encoding));
    }

    acceptsCharsets(charset: string): boolean {
        const acceptCharset = this.get('accept-charset');
        if (!acceptCharset) return true;
        return acceptCharset.split(',').some(c => c.trim().startsWith(charset));
    }

    acceptsLanguages(language: string): boolean {
        const acceptLanguage = this.get('accept-language');
        if (!acceptLanguage) return true;
        return acceptLanguage.split(',').some(l => l.trim().startsWith(language));
    }

    is(type: string): boolean {
        const contentType = this.get('content-type');
        if (!contentType) return false;
        return contentType.toLowerCase().includes(type.toLowerCase());
    }

    range(size: number): Range[] | undefined {
        const rangeHeader = this.get('range');
        if (!rangeHeader) return undefined;

        const ranges: Range[] = [];
        const parts = rangeHeader.replace('bytes=', '').split(',');
        
        for (const part of parts) {
            const [start, end] = part.trim().split('-');
            const startNum = start ? parseInt(start, 10) : 0;
            const endNum = end ? parseInt(end, 10) : size - 1;
            
            if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum && endNum < size) {
                ranges.push({ start: startNum, end: endNum });
            }
        }
        
        return ranges.length > 0 ? ranges : undefined;
    }

    fresh(etag: string, lastModified: Date): boolean {
        const ifNoneMatch = this.get('if-none-match');
        const ifModifiedSince = this.get('if-modified-since');

        if (ifNoneMatch) {
            return ifNoneMatch === etag;
        }

        if (ifModifiedSince) {
            const modifiedSince = new Date(ifModifiedSince);
            return lastModified.getTime() <= modifiedSince.getTime();
        }

        return false;
    }

    stale(etag: string, lastModified: Date): boolean {
        return !this.fresh(etag, lastModified);
    }

    secure(): boolean {
        return this.protocol === 'https';
    }

    xhr(): boolean {
        const requestedWith = this.get('x-requested-with');
        return requestedWith?.toLowerCase() === 'xmlhttprequest';
    }

    subdomains(): string[] {
        if (!this.hostname) return [];
        const parts = this.hostname.split('.');
        return parts.slice(0, -2);
    }

    path(): string {
        try {
            const url = new URL(this.url, `http://${this.hostname || 'localhost'}`);
            return url.pathname;
        } catch {
            return '/';
        }
    }
}

interface Range {
    start: number;
    end: number;
}
