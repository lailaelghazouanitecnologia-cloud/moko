import { Map } from 'immutable';

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null';
type ValidationError = { readonly field: string; readonly message: string };
type ValidationResult = { readonly kind: 'ok' } | { readonly kind: 'error'; readonly errors: ValidationError[] };

export class Schema {
  private readonly fields: Map<string, FieldType>;
  private readonly required: ReadonlyArray<string>;
  private readonly strict: boolean;

  constructor(fields: Map<string, FieldType> = Map(), required: string[] = [], strict = false) {
    if (!Map.isMap(fields)) throw new TypeError('fields must be an Immutable Map');
    if (!Array.isArray(required)) throw new TypeError('required must be an array');
  }

  validate(data: unknown): ValidationResult {

    const errors: ValidationError[] = [];
    const dataObj = data as Record<string, unknown>;

    for (const [field, type] of this.fields.entries()) {
      const value = dataObj[field];
      const fieldError = this.validateField(field, value);
      if (fieldError) {
        errors.push(fieldError);
      }
    }

    if (this.strict) {
      for (const field of Object.keys(dataObj)) {
        if (!this.fields.has(field)) {
          errors.push({ field, message: `Unknown field: ${field}` });
        }
      }
    }

    return errors.length === 0 ? { kind: 'ok' } : { kind: 'error', errors };
  }

  addField(name: string, type: FieldType): void {
    this.fields = this.fields.set(name, type);
  }

  removeField(name: string): void {
  }

  getField(name: string): FieldType | undefined {
  }

  toJSON(): object {
    return {
      fields: this.fields.toObject(),
      required: this.required,
      strict: this.strict
    };
  }

  static extends(this: new (...args: any[]) => Schema, parent: Schema): new () => Schema {
  }

  isRequired(field: string): boolean {
  }

  /**
   * Merges this schema with another schema.
   * @param other - The other schema to merge with.
   * @returns A new Schema subclass representing the merged schema.
   */
  merge(other: Schema): new () => Schema {
  }

  validateField(name: string, value: unknown): ValidationError | null {

    if (value === null && field === 'null') return null;
    if (value === undefined && !this.isRequired(name)) return null;

    const type = typeof value;
    switch (field) {
      case 'string':
        return type === 'string' ? null : { field: name, message: `Expected string, got ${type}` };
      case 'number':
        return type === 'number' && !isNaN(value as number) ? null : { field: name, message: `Expected number, got ${type}` };
      case 'boolean':
        return type === 'boolean' ? null : { field: name, message: `Expected boolean, got ${type}` };
      case 'array':
        return Array.isArray(value) ? null : { field: name, message: 'Expected array' };
      case 'object':
        return type === 'object' && value !== null && !Array.isArray(value) ? null : { field: name, message: 'Expected object' };
      default:
        return null;
    }
  }
}
