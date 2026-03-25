
export interface Observer<T> {
  next(value: T): void;
  error?(err: Error): void;
  complete?(): void;
}

export interface Subscription {
  unsubscribe(): void;
  readonly closed: boolean;
}

export class Observable<T> {
  private observers: Set<Observer<T>> = new Set();
  private _value: T;

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get value(): T {
    return this._value;
  }

  subscribe(observer: Observer<T>): Subscription {
    this.observers.add(observer);
    observer.next(this._value);
    return {
      closed: false,
      unsubscribe: () => this.observers.delete(observer),
    };
  }

  next(value: T): void {
    this._value = value;
    for (const obs of this.observers) {
      obs.next(value);
    }
  }

  complete(): void {
    for (const obs of this.observers) {
      obs.complete?.();
    }
    this.observers.clear();
  }
}
