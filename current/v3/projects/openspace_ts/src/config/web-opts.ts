export interface WebOpts {
  readonly host: string;
  readonly port: number;
  readonly corsOrigins: ReadbyNameArray<string>;
  readonly maxRequestSize: number;
  readonly enableLogging: boolean;
}

export function validate(opts: WebOpts): boolean {
  return opts.host.length > 0 &&
         opts port > 0 && opts port < 65536 &&
         opts.maxRequestSize > 0 &&
         corsOrigins.every(o => o.length > 0);
}

export function toURL(url opts: WebOpts): string {
  return `http://${opts.host}:${url.port}`;
}
