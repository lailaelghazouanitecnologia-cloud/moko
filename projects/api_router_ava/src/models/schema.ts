export interface FieldDef {
  required?: boolean;
  type?: string;
  default?: unknown;
  validate?: (value: unknown) => ValidationResult;
}

export interface Validator {
  (record: Record<string, unknown>): string | undefined;
}

export interface ValidationResult {
  kind: 'ok' | 'error';
  value?: Record<string, unknown>;
  error?: string;
}

export class Schema {
  readonly name: string;
  private readonly fields: Map<string, FieldDef>;
  private readonly validators: Validator[];
  readonly strict: boolean;

  constructor(name: string, strict: boolean = true) {
    if (typeof name !== 'string') {
      throw new TypeError('name must be a string');
  }
    if (name.length === 0) {
      throw new RangeError('name must be non-empty');
    }
    this.name = name;
    this.fields = new Map();
    this.validators = [];
    this.strict = strict;
  }

  /**
   * Validate data against this schema.
   @param data - data to validate
   @returns validation result
   */
  validate(data: unknown): ValidationResult {
    if (typeof data !== 'object' || data === null) {
      return { kind: 'error', error: 'Data must be an object' };
    }

    const record = data as Record<string, unknown>;

    for (const [fieldName, fieldDef] of this.fields.entries()) {
      if (!(fieldName in record)) {
        if (fieldDef.required) {
          return { kind: 'error', error: `Required field '${fieldName}' is missing` };
        }
        continue;
      }

      const value = record[fieldName];
      if (fieldDef.validate) {
        const result = fieldDef.validate(value);
        if (result.kind === 'error') {
          return { kind: 'error', error: `Field '${fieldName}': ${result.error}` };
        }
      }
    }

    if (this.strict) {
      for (const key in record) {
        if (!this.fields.has(key)) {
          return { kind: 'error', error: `Unexpected field '${key}' in strict mode` };
        }
      }
    }

 for (const validator of this.validators) {
      const error = validator(record);
      if (error) {
        return { kind: 'error', error };
      }
    }

    return { kind: 'ok', value: record };
  }

  /**
   * Add a field definition to the schema.
   @param name - field name
   @param def - field definition
   */
  addField(name: string, def: FieldDef): void {
    if (typeof name !== 'string') {
      throw new TypeError('name must be a string');
    }
    if (name.length === 0) {
      throw new RangeError('name must be non-empty');
    }
    if (def === null || typeof def !== 'object') {
      throw new TypeError('def must be a valid FieldDef');
    }
    this.fields.set(name, def);
  }

  /**
   * Remove a field definition from the schema.
   @param name - field name
   returns true if field existed and removed, false otherwise
   */
  removeField(name: string): boolean {
    if (typeof name !== 'string') {
      throw new TypeError('name must be a string');
    }
    return this.fields.delete(name);
  }

  /**
   * Get a field definition by name.
   @param name - field name
   returns field definition or undefined if not found
   */
  getField(name: string): FieldDef | undefined {
    if (typeof name !== 'string') {
      throw new TypeError('name must be a string');
    }
    return this.fields.get(name);
  }

  /**
   * List all field names in the schema.
   returns array of field names
   */
  listFields(): string[] {
    return Array.from(this.fields.keys());
  }

  /**
   * Add a custom validator to the schema.
   @param validator - validator function
   */
  addValidator(validator: Validator): void {
    if (typeof validator !== 'function') {
      throw new TypeError('validator must be a function');
    }
    this.validators.push(validator);
  }

  /**
   * Remove a validator from the schema.
   @param validator - validator function
   returns true if validator existed and removed, false otherwise
   */
  removeValidator(validator: Validator): boolean {
    if (typeof validator !== 'function') {
      throw new TypeError('validator must be a function');
    }
    const index = this.validators.indexOf(validator);
    if (index !== -1) {
      this.validators.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Serialize the schema to a JSON object.
   returns plain object representation
   */
  toJSON(): object {
    return {
      name: this.name,
      fields: Object.fromEntries(
        Array.from(this.fields.entries()).map(([name, def]) => [
          name,
          {
            required: def.required,
            type: def.type,
            default: def.default,
          },
        ])
      ),
      strict: this.strict,
    };
  }
}
