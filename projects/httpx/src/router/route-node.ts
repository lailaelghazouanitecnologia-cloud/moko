import { RequestHandler } from '../router';
import { RouteMatch } from './route-match';

export class RouteNode {
  children: Map<string, RouteNode> = new Map();
  paramChild: RouteNode | null = null;
  wildcardChild: RouteNode | null = null;
  handlers: Map<string, RequestHandler[]> = new Map();
  paramName: string | null = null;
  isWildcard: boolean = false;

  insert(method: string, segments: string[], handlers: RequestHandler[]): void {
    if (segments.length === 0) {
      this.addHandler(method, handlers);
      return;
    }

    const segment = segments[0];
    const remaining = segments.slice(1);

    if (this.isWildcard(segment)) {
      if (!this.wildcardChild) {
        this.wildcardChild = this.createWildcardChild();
      }
      this.wildcardChild.insert(method, remaining, handlers);
    } else if (this.isParameter(segment)) {
      const paramName = this.extractParamName(segment);
      if (!this.paramChild) {
        this.paramChild = this.createParamChild(paramName);
      }
      this.paramChild.insert(method, remaining, handlers);
    } else {
      let child = this.children.get(segment);
      if (!child) {
        child = new RouteNode();
        this.children.set(segment, child);
      }
      child.insert(method, remaining, handlers);
    }
  }

  match(segments: string[], params: Record<string, string>): RouteMatch | null {
    if (segments.length === 0) {
      const handlers = this.getHandler('GET');
      if (handlers) {
        return { handlers, params };
      }
      return null;
    }

    const segment = segments[0];
    const remaining = segments.slice(1);

    let child = this.children.get(segment);
    if (child) {
      const result = child.match(remaining, params);
      if (result) return result;
    }

    if (this.paramChild) {
      const paramName = this.paramChild.paramName!;
      params[paramName] = segment;
      const result = this.paramChild.match(remaining, params);
      if (result) return result;
      delete params[paramName];
    }

    if (this.wildcardChild) {
      params['*'] = segments.join('/');
      const result = this.wildcardChild.match([], params);
      if (result) return result;
      delete params['*'];
    }

    return null;
  }

  addHandler(method: string, handlers: RequestHandler[]): void {
    const existing = this.handlers.get(method) || [];
    this.handlers.set(method, [...existing, ...handlers]);
  }

  getHandler(method: string): RequestHandler[] | null {
    return this.handlers.get(method) || null;
  }

  isParameter(segment: string): boolean {
    return segment.startsWith(':');
  }

  isWildcard(segment: string): boolean {
    return segment === '*';
  }

  extractParamName(segment: string): string {
    return segment.slice(1);
  }

  createParamChild(paramName: string): RouteNode {
    const node = new RouteNode();
    node.paramName = paramName;
    return node;
  }

  createWildcardChild(): RouteNode {
    const node = new RouteNode();
    node.isWildcard = true;
    return node;
  }

  hasChildren(): boolean {
    return this.children.size > 0 || this.paramChild !== null || this.wildcardChild !== null;
  }
}
