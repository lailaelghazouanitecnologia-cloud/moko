import { ResponseHeaders } from './response-headers';
import { ResponseBody } from './response-body';
import { Cookie } from './cookie';
import { CookieOptions } from './cookie-options';
import { ResponseJSON } from './response-json';
import { ResponseInit } from './response-init';

export class Response {
  readonly statusCode: number;
  readonly headers: ResponseHeaders;
  readonly body: ResponseBody;
  readonly cookies: Map<string, Cookie>;

  constructor(init?: ResponseInit) {
    this.statusCode = init?.statusCode ?? 200;
    this.headers = new ResponseHeaders(init?.headers);
    this.body = new ResponseBody(init?.body);
    this.cookies = new Map(init?.cookies);
  }

  status(code: number): Response {
    return new Response({
      statusCode: code,
      headers: this.headers,
      body: this.body,
      cookies: this.cookies
    });
  }

  header(name: string, value: string): Response {
    const newHeaders = new ResponseHeaders(this.headers);
    newHeaders.set(name, value);
    return new Response({
      statusCode: this.statusCode,
      headers: newHeaders,
      body: this.body,
      cookies: this.cookies
    });
  }

  json(data: any): Response {
    const jsonBody = JSON.stringify(data);
    const newHeaders = new ResponseHeaders(this.headers);
    newHeaders.set('content-type', 'application/json');
    return new Response({
      statusCode: this.statusCode,
      headers: newHeaders,
      body: new ResponseBody(jsonBody),
      cookies: this.cookies
    });
  }

  text(content: string): Response {
    const newHeaders = new ResponseHeaders(this.headers);
    newHeaders.set('content-type', 'text/plain');
    return new Response({
      statusCode: this.statusCode,
      headers: newHeaders,
      body: new ResponseBody(content),
      cookies: this.cookies
    });
  }

  html(content: string): Response {
    const newHeaders = new ResponseHeaders(this.headers);
    newHeaders.set('content-type', 'text/html');
    return new Response({
      statusCode: this.statusCode,
      headers: newHeaders,
      body: new ResponseBody(content),
      cookies: this.cookies
    });
  }

  redirect(url: string, code: number = 302): Response {
    const newHeaders = new ResponseHeaders(this.headers);
    newHeaders.set('location', url);
    return new Response({
      statusCode: code,
      headers: newHeaders,
      body: new ResponseBody(),
      cookies: this.cookies
    });
  }

  cookie(name: string, value: string, options?: CookieOptions): Response {
    const newCookies = new Map(this.cookies);
    newCookies.set(name, new Cookie(name, value, options));
    return new Response({
      statusCode: this.statusCode,
      headers: this.headers,
      body: this.body,
      cookies: newCookies
    });
  }

  clearCookie(name: string): Response {
    const newCookies = new Map(this.cookies);
    newCookies.delete(name);
    return new Response({
      statusCode: this.statusCode,
      headers: this.headers,
      body: this.body,
      cookies: newCookies
    });
  }

  attachment(filename?: string): Response {
    const newHeaders = new ResponseHeaders(this.headers);
    const disposition = filename ? `attachment; filename="${filename}"` : 'attachment';
    newHeaders.set('content-disposition', disposition);
    return new Response({
      statusCode: this.statusCode,
      headers: newHeaders,
      body: this.body,
      cookies: this.cookies
    });
  }

  download(path: string, filename?: string): Response {
    const name = filename || path.split('/').pop() || 'download';
    const newHeaders = new ResponseHeaders(this.headers);
    newHeaders.set('content-disposition', `attachment; filename="${name}"`);
    newHeaders.set('content-type', 'application/octet-stream');
    return new Response({
      statusCode: this.statusCode,
      headers: newHeaders,
      body: new ResponseBody(path),
      cookies: this.cookies
    });
  }

  sendStatus(code: number): Response {
    const message = this.getStatusMessage(code);
    const newHeaders = new ResponseHeaders(this.headers);
    newHeaders.set('content-type', 'text/plain');
    return new Response({
      statusCode: code,
      headers: newHeaders,
      body: new ResponseBody(message),
      cookies: this.cookies
    });
  }

  send(data?: any): Response {
    if (data === undefined || data === null) {
      return new Response({
        statusCode: this.statusCode,
        headers: this.headers,
        body: new ResponseBody(),
        cookies: this.cookies
      });
    }

    if (typeof data === 'string') {
      return this.text(data);
    }

    if (Buffer.isBuffer(data)) {
      const newHeaders = new ResponseHeaders(this.headers);
      newHeaders.set('content-type', 'application/octet-stream');
      return new Response({
        statusCode: this.statusCode,
        headers: newHeaders,
        body: new ResponseBody(data),
        cookies: this.cookies
      });
    }

    if (data instanceof ReadableStream) {
      const newHeaders = new ResponseHeaders(this.headers);
      newHeaders.set('content-type', 'application/octet-stream');
      return new Response({
        statusCode: this.statusCode,
        headers: newHeaders,
        body: new ResponseBody(data),
        cookies: this.cookies
      });
    }

    return this.json(data);
  }

  type(contentType: string): Response {
    const newHeaders = new ResponseHeaders(this.headers);
    newHeaders.set('content-type', contentType);
    return new Response({
      statusCode: this.statusCode,
      headers: newHeaders,
      body: this.body,
      cookies: this.cookies
    });
  }

  vary(field: string): Response {
    const newHeaders = new ResponseHeaders(this.headers);
    const existing = newHeaders.get('vary');
    const value = existing ? `${existing}, ${field}` : field;
    newHeaders.set('vary', value);
    return new Response({
      statusCode: this.statusCode,
      headers: newHeaders,
      body: this.body,
      cookies: this.cookies
    });
  }

  links(links: Record<string, string>): Response {
    const linkHeader = Object.entries(links)
      .map(([rel, url]) => `<${url}>; rel="${rel}"`)
      .join(', ');
    const newHeaders = new ResponseHeaders(this.headers);
    newHeaders.set('link', linkHeader);
    return new Response({
      statusCode: this.statusCode,
      headers: newHeaders,
      body: this.body,
      cookies: this.cookies
    });
  }

  location(url: string): Response {
    const newHeaders = new ResponseHeaders(this.headers);
    newHeaders.set('location', url);
    return new Response({
      statusCode: this.statusCode,
      headers: newHeaders,
      body: this.body,
      cookies: this.cookies
    });
  }

  get(field: string): string | undefined {
    return this.headers.get(field);
  }

  hasHeader(field: string): boolean {
    return this.headers.has(field);
  }

  removeHeader(field: string): Response {
    const newHeaders = new ResponseHeaders(this.headers);
    newHeaders.delete(field);
    return new Response({
      statusCode: this.statusCode,
      headers: newHeaders,
      body: this.body,
      cookies: this.cookies
    });
  }

  toJSON(): ResponseJSON {
    const headersObj: Record<string, string> = {};
    this.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    const cookiesObj: Record<string, Cookie> = {};
    this.cookies.forEach((cookie, name) => {
      cookiesObj[name] = cookie;
    });

    return {
      statusCode: this.statusCode,
      headers: headersObj,
      body: this.body.toJSON(),
      cookies: cookiesObj
    };
  }

  static create(init?: ResponseInit): Response {
    return new Response(init);
  }

  private getStatusMessage(code: number): string {
    const messages: Record<number, string> = {
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
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };
    return messages[code] || 'Unknown Status';
  }
}
