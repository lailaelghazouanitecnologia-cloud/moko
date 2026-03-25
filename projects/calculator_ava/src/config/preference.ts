export interface Preference {
  readonly key: string;
  value: string | number | boolean;

  getKey(): string;
  getValue(): string | number | boolean;
  setValue(value: string | number | boolean): void;
}

export class PreferenceImpl implements Preference {
  readonly key: string;
  value: string | number | boolean;

  constructor(key: string, value: string | number | boolean) {
    this.key = key;
    this.value = value;
  }

  getKey(): string {
    return this.key;
  }

  getValue(): string | number | boolean {
    return this.value;
  }

  setValue(value: string | number | boolean): void {
      this.value = value;
  }
}
