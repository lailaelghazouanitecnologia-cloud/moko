export interface CookieOpts {
  readonly maxAge?: number;
  readonly expires?: Date;
  readonly path?: string;
  readonly domain?: string;
  readonly secure?: boolean;
  readonly httpOnly?: boolean;
  readonly sameSite?: 'strict' | 'lax' | 'none';
}

export interface HttpResponse {
  readonly statusCode: number;
  readonly headers: Record<string, string>;
  body: unknown;
}

export class ResponseBuilder {
  private statusCode: number;
  private readonly headers: Record<string, string>;
  private body: unknown;

  constructor() {
    this.status = this.status.bind(this);
    this.header = this.header.bind(this);
    this.json = this.json.bind(this);
    this.text = this.text.bind(this);
    this.redirect = this.redirect.bind(this);
this.error = this.error.bind(this);
    this.cookie = this.cookie.bind(this);
    this.build = this.build.bind(this);
    this.statusCode = 200;
    this.headers = {};
    this.body = undefined;
  }

  /**
   * Set the HTTP status code for the response.
   * @param code - Status code (e.g., 200, 404, 500)
   * @returns ResponseBuilder instance for chaining
   * @throws RangeError if code is not an integer between 100 and 999
   */
  status(code: number): ResponseBuilder {
       if (!Number.isInteger(code) || code < 100 || code > 999) {
      throw new RangeError('Invalid HTTP status code');
    }
    this.statusCode = code;
    return this;
  }

  /**
   * Add a header to the response.
   * @param name - Header name
   * @param value - Header value
   * @returns ResponseBuilder instance for chaining
   * @throws TypeError if name or value is not a non-empty string
   */
  header(name: string, value: string): ResponseBuilder {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new TypeError('Header name must be a non-empty string');
    }
    if (typeof value !== 'string') {
      throw new TypeError('Header value must be a string');
    }
    this.headers[name] = value;
    return this;
  }

  /**
   * Set the response body to a JSON value and content-type to application/json.
   * @param data - Any value that can be serialized as JSON
  * @returns ResponseBuilder instance for chaining
   */
  json(data: unknown): ResponseBuilder {
    this.body = data;
    this.headers['content-type'] = 'application/json';
    return this;
  }

  /**
   * Set the response body to plain text and content-type to text/plain.
   * @param text - Plain text
   * @returns ResponseBuilder instance for chaining
   * @throws TypeError if text is not a string
   */
  text(text: string): ResponseBuilder {
    if (typeof text !== 'string') {
      throw new TypeError('Text must be a string');
    }
    this.body = text;
    this.headers['content-type'] = 'text/plain';
    return this;
  }

  /**
   * Set redirect status and location header.
   * @param url - URL to redirect to
   * @param code - Redirect status code (default 302)
   * @returns ResponseBuilder instance for chaining
   * @see RangeError for invalid code
   */
  redirect(url: string, code: number = 302): ResponseBuilder {
    if (typeof url !== 'string' || url.trim().length === 0) {
      throw new TypeError('Redirect URL must be a non-empty string');
    }
    this.status(code);
    this.headers['location'] = url;
    return this;
  }

  /**
   * Set an error response with message and status code.
   * @param message - Error message
   * @param code - Error status code (default 500)
   * @returns ResponseBuilder instance for chaining
   * @throws TypeError if message is not a string
   * @see RangeError for invalid code
   */
  error(message: string, code: number = 500): ResponseBuilder {
    if (typeof message !== 'string') {
      throw new TypeError('Error message must be a string');
    }
    this.status(code);
    this.headers['content-type'] = 'application/json';
    this.body = { error: message };
    return this;
  }

  /**
   * Set a cookie with optional attributes.
   * @param name - Cookie name
   * @param value - Cookie value
   * @param opts - Optional cookie attributes
   * @returns ResponseBuilder instance for chaining
   * @throws TypeError if name or value is not a non-empty string
   */
  cookie(name: string, value: string, opts?: CookieOpts): ResponseBuilder {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new TypeError('Cookie name must be a non-empty string');
    }
    if (typeof value !== 'string') {
      throw new TypeError('Cookie value must be a string');
    }
    let cookieHeader = `${name}=${value}`;
    if (opts) {
      if (opts.maxAge !== undefined) {
        if (!Number.isInteger(opts.maxAge) || opts.maxAge < 0) {
          throw new RangeError('maxAge must be a non-negative integer');
        }
        cookieHeader += `; Max-Age=${opts.maxAge}`;
      }
      if (opts.expires !== undefined) {
        if (!(opts.expires instanceof Date)) {
          throw new TypeError('expires must be a Date object');
        }
        cookieHeader += `; Expires=${opts.expires.toUTCString()}`;
      }
      if (opts.path !== undefined) {
        if (typeof opts.path !== 'string' || opts.path.trim().length === 0) {
          throw new TypeError('path must be a non-empty string');
        }
        cookieHeader += `; Path=${opts.path}`;
      }
      if (opts.domain !== undefined) {
        if (typeof opts.domain !== 'string' || opts.domain.trim().length === 0) {
          throw new TypeError('domain must be a non-empty string');
        }
        cookieHeader += `; Domain=${opts.domain}`;
      }
      if (opts.secure === true) {
        cookieHeader += '; Secure';
      }
      if (opts.httpOnly === true) {
        cookieHeader += '; HttpOnly';
      }
      if (opts.sameSite !== undefined) {
        if (!['strict', 'lax', 'none'].includes(opts.sameSite)) {
          throw new TypeError('sameSite must be "strict", "lax", or "none"');
        }
        cookieHeader += `; SameSite=${opts.sameSite}`;
      }
    }

    const existing = this.headers['set-cookie'];
    this.headers['set-cookie'] = existing ? `${existing}, ${cookieHeader}` : cookieHeader;
    return this;
  }

  /**
   * Build the final HttpResponse object.
   * @returns Readonly HttpResponse ready to be sent
   */
  build(): HttpResponse {
    return {
      statusCode: this.statusCode,
      headers: { ...this.headers },
      body: this.body
    };
  }
}
