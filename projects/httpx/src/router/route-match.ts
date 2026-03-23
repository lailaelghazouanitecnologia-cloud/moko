import { RequestHandler } from './router';

export class RouteMatch {
    handlers: RequestHandler[];
    params: Record<string, string>;
    method: string;
    pathname: string;

    constructor(handlers: RequestHandler[], params: Record<string, string>, method: string, pathname: string) {
        this.handlers = handlers;
        this.params = params;
        this.method = method;
        this.pathname = pathname;
    }

    hasHandlers(): boolean {
        return this.handlers.length > 0;
    }

    getParams(): Record<string, string> {
        return this.params;
    }

    getHandler(): RequestHandler[] {
        return this.handlers;
    }

    getMethod(): string {
        return this.method;
    }

    getPathname(): string {
        return this.pathname;
    }

    toString(): string {
        return `RouteMatch { method: "${this.method}", pathname: "${this.pathname}", handlers: ${this.handlers.length}, params: ${JSON.stringify(this.params)} }`;
    }
}
