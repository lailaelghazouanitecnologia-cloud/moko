import { readFileSync, watch as fsWatch } from 'fs';
import { dirname, resolve as pathResolve } from 'path';
import { load as yamlLoad } from 'js-yaml';
import { ExperimentSpec } from './index';

/**
 * Loads and validates experiment configuration files (YAML or JSON).
 * Supports hot-reload, schema validation, and reference resolution.
 */
export class ConfigLoader {
  private schemaPath: string;
  private validators: Map<string, Validator>;

  /**
   * Creates a new ConfigLoader instance.
   * @param schemaPath - Absolute path to the base schema file used for resolving relative `$ref` entries.
   */
  constructor(schemaPath: string) {
    if (!schemaPath || typeof schemaPath !== 'string') {
      throw new Error('schemaPath is required and must be a non-empty string');
    }
    this.schemaPath = schemaPath;
    this.validators = new Map<string, Validator>();
  }

  /**
   * Loads an experiment specification from a YAML or JSON file.
   * @param filePath - Absolute path to the configuration file.
   * @returns Fully resolved and validated ExperimentSpec.
   * @throws If the file does not exist, is unreadable, or validation fails.
   */
  load(filePath: string): ExperimentSpec {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('filePath is required and must be a non-empty string');
    }

    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to read configuration file "${filePath}": ${error.message}`);
    }

    let raw: any;
    if (filePath.endsWith('.json')) {
      try {
        raw = JSON.parse(content);
      } catch (error: any) {
        throw new Error(`Invalid JSON in "${filePath}": ${error.message}`);
      }
    } else if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      try {
        raw = yamlLoad(content);
      } catch (error: any) {
        throw new Error(`Invalid YAML in "${filePath}": ${error.message}`);
      }
    } else {
      throw new Error(`Unsupported file format: ${filePath}. Only .json, .yaml, and .yml are allowed`);
    }

    const resolved = this.resolveRefs(raw);
    const merged = this.mergeDefaults(resolved);

    const spec: ExperimentSpec = {
      name: merged.name,
      schedule: this.parseSchedule(merged.schedule),
      searchSpace: this.parseSearchSpace(merged.searchSpace),
      validate: function (): boolean {
        return true;
      },
      getSchedule: function (): Schedule {
        return this.schedule;
      },
      getSearchSpace: function (): HyperParameterSpace {
        return this.searchSpace;
      }
    };

    this.validate(spec);
    return spec;
  }

  /**
   * Validates an ExperimentSpec against registered validators and basic rules.
   * @param spec - The experiment specification to validate.
   * @throws If any validation rule fails.
   */
  validate(spec: ExperimentSpec): void {
    if (!spec || typeof spec !== 'object') {
      throw new Error('spec is required and must be an object');
    }

    const errors: ValidationError[] = [];

    if (!spec.name || typeof spec.name !== 'string') {
      errors.push(new ValidationError('name', 'Experiment name is required and must be a string'));
    }

    if (!spec.schedule) {
      errors.push(new ValidationError('schedule', 'Schedule is required'));
    }

    if (!spec.searchSpace) {
      errors.push(new ValidationError('searchSpace', 'Search space is required'));
    }

    for (const [key, validator] of this.validators) {
      try {
        validator.validate(spec);
      } catch (error: any) {
        errors.push(new ValidationError(key, error.message));
      }
    }

    if (errors.length > 0) {
      this.reportErrors(errors);
    }
  }

  /**
   * Recursively resolves JSON-schema style `$ref` pointers relative to `schemaPath`.
   * @param raw - The raw object potentially containing `$ref` entries.
   * @returns Fully dereferenced object.
   */
  resolveRefs(raw: any): any {
    if (typeof raw === 'object' && raw !== null) {
      if (Array.isArray(raw)) {
        return raw.map(item => this.resolveRefs(item));
      }

      const resolved: any = {};
      for (const [key, value] of Object.entries(raw)) {
        if (key === '$ref' && typeof value === 'string') {
          const refPath = pathResolve(dirname(this.schemaPath), value);
          let refContent: string;
          try {
            refContent = readFileSync(refPath, 'utf-8');
          } catch (error: any) {
            throw new Error(`Failed to read $ref file "${refPath}": ${error.message}`);
          }
          return this.resolveRefs(yamlLoad(refContent));
        }
        resolved[key] = this.resolveRefs(value);
      }
      return resolved;
    }
    return raw;
  }

  /**
   * Parses a raw schedule object into a strongly-typed Schedule.
   * @param raw - The raw schedule configuration.
   * @returns Validated Schedule instance.
   * @throws If required fields are missing or invalid.
   */
  parseSchedule(raw: any): Schedule {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Schedule configuration is required and must be an object');
    }

    const phases = Array.isArray(raw.phases) ? raw.phases : [];
    const duration = typeof raw.duration === 'number' && raw.duration >= 0 ? raw.duration : 0;
    const iterations = typeof raw.iterations === 'number' && raw.iterations > 0 ? raw.iterations : 1;

    return { phases, duration, iterations };
  }

  /**
   * Parses a raw search-space object into a strongly-typed SearchSpace.
   * @param raw - The raw search-space configuration.
   * @returns Validated SearchSpace instance.
   * @throws If required fields are missing or invalid.
   */
  parseSearchSpace(raw: any): SearchSpace {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Search space configuration is required and must be an object');
    }

    const space: SearchSpace = {
      parameters: new Map()
    };

    if (raw.parameters && typeof raw.parameters === 'object') {
      for (const [key, param] of Object.entries(raw.parameters)) {
        if (typeof param !== 'object' || param === null) {
          throw new Error(`Parameter "${key}" must be a non-null object`);
        }
        space.parameters.set(key, param as any);
      }
    }

    return space;
  }

  /**
   * Merges user-provided configuration with sensible defaults.
   * @param raw - The raw user configuration.
   * @returns New object with defaults applied where missing.
   */
  mergeDefaults(raw: any): any {
    if (!raw || typeof raw !== 'object') {
      throw new Error('raw configuration must be a non-null object');
    }

    const defaults = {
      iterations: 1,
      parallel: false,
      logging: {
        level: 'info',
        format: 'json'
      }
    };

    return {
      ...defaults,
      ...raw,
      logging: {
        ...defaults.logging,
        ...(raw.logging || {})
      }
    };
  }

  /**
   * Reports validation errors by logging and throwing an aggregated error.
   * @param errors - Array of validation errors.
   * @throws Always throws an Error summarizing all issues.
   */
  private reportErrors(errors: ValidationError[]): void {
    const errorMessages = errors.map(e => `${e.field}: ${e.message}`).join('\n');
    console.error('Configuration validation errors:\n', errorMessages);
    throw new Error(`Configuration validation failed with ${errors.length} error(s)`);
  }

  /**
   * Watches a configuration file for changes and reloads it automatically.
   * @param filePath - Absolute path to the file to watch.
   * @param callback - Invoked with the reloaded ExperimentSpec on successful change.
   */
  watch(filePath: string, callback: (spec: ExperimentSpec) => void): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('filePath is required and must be a non-empty string');
    }
    if (!callback || typeof callback !== 'function') {
      throw new Error('callback is required and must be a function');
    }

    fsWatch(filePath, (eventType) => {
      if (eventType === 'change') {
        try {
          const spec = this.load(filePath);
          callback(spec);
        } catch (error: any) {
          console.error(`Failed to reload configuration: ${error.message}`);
        }
      }
    });
  }

  /**
   * Registers an external validator to be run during validate().
   * @param key - Unique name for this validator.
   * @param validator - The validator instance.
   */
  addValidator(key: string, validator: Validator): void {
    if (!key || typeof key !== 'string') {
      throw new Error('key is required and must be a non-empty string');
    }
    if (!validator || typeof validator.validate !== 'function') {
      throw new Error('validator is required and must implement Validator interface');
    }
    this.validators.set(key, validator);
  }

  /**
   * Removes a previously registered validator.
   * @param key - Unique name of the validator to remove.
   * @returns True if the validator existed and was removed, false otherwise.
   */
  removeValidator(key: string): boolean {
    if (!key || typeof key !== 'string') {
      throw new Error('key is required and must be a non-empty string');
    }
    return this.validators.delete(key);
  }

  /**
   * Returns a copy of all registered validator keys.
   */
  listValidators(): string[] {
    return Array.from(this.validators.keys());
  }
}