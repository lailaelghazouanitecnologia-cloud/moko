import { Schema } from './schema';

export type ValidationError = {
  readonly path: string;
  readonly message: string;
  readonly code?: string;
};

export type ValidationRule = {
  readonly validate: (value: unknown, path: string) => ValidationError | null;
  readonly message?: string;
};

export class Validator {
  private readonly schema: Schema;
  private readonly strict: boolean;
  private readonly rules: Map<string, ValidationRule>;

  constructor(schema: Schema, strict = false) {
    this.schema = schema;
    this.strict = strict;
    this.rules = new Map();
  }

  validate(data: unknown): boolean {
    const result = this.schema.validate(data);
    return result.kind === 'ok' && this.validateCustomRules(data);
  }

  validateWithErrors(data: unknown): ValidationError[] {
    const errors: ValidationError[] = [];
    const result = this.schema.validate(data);
    
    if (result.kind === 'error') {
      errors.push(...result.errors);
    }
    
    this.collectCustomRuleErrors(data, '', errors);
    return errors;
  }

  assert(data: unknown): void {
    const errors = this.validateWithErrors(data);
    if (errors.length > 0) {
      throw new TypeError(`Validation failed: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`);
    }
  }

  isValidType(value: unknown, type: string): boolean {
    switch (type) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return value !== null && typeof value === 'object' && !Array.isArray(value);
      case 'null': return value === null;
      case 'undefined': return value === undefined;
      default: return false;
    }
  }

  coerce(data: unknown): unknown {

    const coerced: Record<string, unknown> = {};
    const fields = this.schema.fields;

    for (const [key, fieldType] of fields) {
      const value = (data as Record<string, unknown>)?.[key];
      
      if (value != null) {
        coerced[key] = this.coerceValue(value, fieldType);
      } else if (this.schema.isRequired(key)) {
        throw new TypeError(`Missing required field: ${key}`);
      }
    }

    return coerced;
  }

  addRule(path: string, rule: ValidationRule): void {
    this.rules.set(path, rule);
  }

  removeRule(path: string): void {
    this.rules.delete(path);
  }

  listRules(): Map<string, ValidationRule> {
    return new Map(this.rules);
  }

  private validateCustomRules(data: unknown): boolean {
    const errors = this.validateCustomRuleErrors(data, '');
    return errors.length === 0;
  }

  private collectCustomRuleErrors(data: unknown, path: string, errors: ValidationError[]): void {
    const prefix = path ? `${path}.` : '';
    
    for (const [rulePath, rule] of this.rules) {
      const fullPath = prefix + rulePath;
      const value = this.getValueAtPath(data, fullPath);
      const error = rule.validate(value, fullPath);
      
      if (error) {
        errors.push(error);
      }
    }
  }

  private validateCustomRuleErrors(data: unknown, path: string): ValidationError[] {
    const errors: ValidationError[] = [];
    this.collectCustomRuleErrors(data, path, errors);
    return errors;
  }

  private getValueAtPath(data: unknown, path: string): unknown {

    const keys = path.split('.');
    let current = data;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private coerceValue(value: unknown, fieldType: unknown): unknown {
    if (fieldType === 'string' && typeof value !== 'string') {
      return String(value);
    }
    
    if (fieldType === 'number' && typeof value !== 'number') {
      const num = Number(value);
      return isNaN(num) ? value : num;
    }
    
    if (fieldType === 'boolean' && typeof value !== 'boolean') {
      return Boolean(value);
    }

    return value;
  }
}
