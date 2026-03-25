
import { Observable, Observer, Subscription } from './observable';

export class Computed<T> {
  private observable: Observable<T>;
  private deps: Observable<unknown>[];
  private computeFn: () => T;
  private subscriptions: Subscription[] = [];

  constructor(deps: Observable<unknown>[], computeFn: () => T) {
    this.deps = deps;
    this.computeFn = computeFn;
    this.observable = new Observable<T>(computeFn());

    for (const dep of deps) {
      const sub = dep.subscribe({
        next: () => this.recompute(),
      });
      this.subscriptions.push(sub);
    }
  }

  get value(): T {
    return this.observable.value;
  }

  subscribe(observer: Observer<T>): Subscription {
    return this.observable.subscribe(observer);
  }

  private recompute(): void {
    const newValue = this.computeFn();
    this.observable.next(newValue);
  }

  dispose(): void {
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
    this.subscriptions = [];
  }
}
