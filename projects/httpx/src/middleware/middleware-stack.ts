import { Middleware } from './middleware';

export class MiddlewareStack {
    private middlewares: Middleware[] = [];

    use(middleware: Middleware): void {
        this.middlewares.push(middleware);
    }

    unshift(middleware: Middleware): void {
        this.middlewares.unshift(middleware);
    }

    insert(index: number, middleware: Middleware): void {
        if (index < 0 || index > this.middlewares.length) {
            throw new RangeError('Index out of bounds');
        }
        this.middlewares.splice(index, 0, middleware);
    }

    remove(middleware: Middleware): boolean {
        const index = this.middlewares.indexOf(middleware);
        if (index === -1) {
            return false;
        }
        this.middlewares.splice(index, 1);
        return true;
    }

    removeAt(index: number): Middleware | undefined {
        if (index < 0 || index >= this.middlewares.length) {
            return undefined;
        }
        return this.middlewares.splice(index, 1)[0];
    }

    clear(): void {
        this.middlewares.length = 0;
    }

    clone(): MiddlewareStack {
        const stack = new MiddlewareStack();
        stack.middlewares = this.middlewares.slice();
        return stack;
    }

    length(): number {
        return this.middlewares.length;
    }

    get(index: number): Middleware | undefined {
        return this.middlewares[index];
    }

    indexOf(middleware: Middleware): number {
        return this.middlewares.indexOf(middleware);
    }

    has(middleware: Middleware): boolean {
        return this.middlewares.indexOf(middleware) !== -1;
    }

    forEach(callback: (mw: Middleware, idx: number) => void): void {
        this.middlewares.forEach(callback);
    }

    map<T>(callback: (mw: Middleware, idx: number) => T): T[] {
        return this.middlewares.map(callback);
    }

    filter(predicate: (mw: Middleware, idx: number) => boolean): Middleware[] {
        return this.middlewares.filter(predicate);
    }

    toArray(): Middleware[] {
        return this.middlewares.slice();
    }
}
