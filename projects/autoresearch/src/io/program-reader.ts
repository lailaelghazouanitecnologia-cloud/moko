import { readFileSync } from 'node:fs';
import { load as yamlLoad } from 'js-yaml';

interface ExperimentSpec {
  name: string;
  description: string;
  variants: Array<{
    id: string;
    name: string;
    weight: number;
    payload: Record<string, any>;
  }>;
  metrics: string[];
  traffic: number;
  duration: number;
  tags: Record<string, string>;
  model?: ModelConfig;
  training?: TrainingConfig;
}

interface ModelConfig {
  type: string;
  version: string;
  parameters: Record<string, any>;
}

interface TrainingConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  optimizer: string;
}

class ExperimentSpecValidator {
  validate(spec: any): boolean {
    if (!spec || typeof spec !== 'object') return false;
    if (!spec.name || typeof spec.name !== 'string') return false;
    if (!spec.description || typeof spec.description !== 'string') return false;
    if (!Array.isArray(spec.variants) || spec.variants.length === 0) return false;
    if (!Array.isArray(spec.metrics) || spec.metrics.length === 0) return false;
    if (typeof spec.traffic !== 'number' || spec.traffic < 0 || spec.traffic > 100) return false;
    if (typeof spec.duration !== 'number' || spec.duration <= 0) return false;
    if (!spec.tags || typeof spec.tags !== 'object') return false;

    for (const variant of spec.variants) {
      if (!variant.id || typeof variant.id !== 'string') return false;
      if (!variant.name || typeof variant.name !== 'string') return false;
      if (typeof variant.weight !== 'number' || variant.weight < 0) return false;
      if (!variant.payload || typeof variant.payload !== 'object') return false;
    }

    return true;
  }
}

export class ProgramReader {
  private specPath: string | undefined;
  private validator: ExperimentSpecValidator;

  constructor() {
    this.validator = new ExperimentSpecValidator();
  }

  /**
   * Reads and validates an experiment specification from a YAML file.
   * @param path - Path to the YAML file.
   * @returns Parsed and validated experiment specification.
   * @throws Error if file cannot be read or validation fails.
   */
  read(path: string): ExperimentSpec {
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid file path provided');
    }

    let content: string;
    try {
      content = readFileSync(path, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file at path "${path}": ${error}`);
    }

    return this.parseSpec(content);
  }

  /**
   * Parses YAML content into an experiment specification and validates it.
   * @param content - YAML content as string.
   * @returns Parsed experiment specification.
   * @throws Error if validation fails or YAML is malformed.
   */
  parseSpec(content: string): ExperimentSpec {
    if (!content || typeof content !== 'string') {
      throw new Error('Invalid YAML content provided');
    }

    let spec: any;
    try {
      spec = yamlLoad(content) as ExperimentSpec;
    } catch (error) {
      throw new Error(`Failed to parse YAML: ${error}`);
    }

    if (!this.validateSpec(spec)) {
      throw new Error('Invalid experiment specification');
    }

    return spec;
  }

  /**
   * Validates the experiment specification.
   * @param spec - Experiment specification to validate.
   * @returns True if valid, false otherwise.
   */
  validateSpec(spec: ExperimentSpec): boolean {
    return this.validator.validate(spec);
  }

  /**
   * Extracts the model configuration from the experiment specification.
   * @param spec - Experiment specification.
   * @returns Model configuration.
   * @throws Error if no model configuration is present.
   */
  getModelConfig(spec: ExperimentSpec): ModelConfig {
    if (!spec || typeof spec !== 'object') {
      throw new Error('Invalid experiment specification provided');
    }
    if (!spec.model) {
      throw new Error('No model configuration found in spec');
    }
    return spec.model;
  }

  /**
   * Extracts the training configuration from the experiment specification.
   * @param spec - Experiment specification.
   * @returns Training configuration.
   * @throws Error if no training configuration is present.
   */
  getTrainingConfig(spec: ExperimentSpec): TrainingConfig {
    if (!spec || typeof spec !== 'object') {
      throw new Error('Invalid experiment specification provided');
    }
    if (!spec.training) {
      throw new Error('No training configuration found in spec');
    }
    return spec.training;
  }

  /**
   * Validates the sum of variant weights.
   * @param spec - Experiment specification.
   * @returns True if weights sum to 100, false otherwise.
   */
  validateVariantWeights(spec: ExperimentSpec): boolean {
    if (!spec || !Array.isArray(spec.variants)) return false;
    const total = spec.variants.reduce((sum, v) => sum + (v.weight || 0), 0);
    return Math.abs(total - 100) < 1e-6;
  }

  /**
   * Checks for duplicate variant IDs.
   * @param spec - Experiment specification.
   * @returns True if duplicates found, false otherwise.
   */
  hasDuplicateVariantIds(spec: ExperimentSpec): boolean {
    if (!spec || !Array.isArray(spec.variants)) return false;
    const ids = new Set();
    for (const variant of spec.variants) {
      if (ids.has(variant.id)) return true;
      ids.add(variant.id);
    }
    return false;
  }

  /**
   * Validates metric names are non-empty and unique.
   * @param spec - Experiment specification.
   * @returns True if metrics are valid, false otherwise.
   */
  validateMetrics(spec: ExperimentSpec): boolean {
    if (!spec || !Array.isArray(spec.metrics) || spec.metrics.length === 0) return false;
    const seen = new Set();
    for (const metric of spec.metrics) {
      if (!metric || typeof metric !== 'string' || metric.trim() === '') return false;
      if (seen.has(metric)) return false;
      seen.add(metric);
    }
    return true;
  }

  /**
   * Validates tags are non-empty strings.
   * @param tags - Tags object.
   * @returns True if tags are valid, false otherwise.
   */
  validateTags(tags: Record<string, string>): boolean {
    if (!tags || typeof tags !== 'object') return false;
    for (const [key, value] of Object.entries(tags)) {
      if (typeof key !== 'string' || key.trim() === '') return false;
      if (typeof value !== 'string' || value.trim() === '') return false;
    }
    return true;
  }

  /**
   * Validates model configuration if present.
   * @param model - Model configuration.
   * @returns True if valid, false otherwise.
   */
  validateModelConfig(model?: ModelConfig): boolean {
    if (!model) return true;
    if (typeof model.type !== 'string' || model.type.trim() === '') return false;
    if (typeof model.version !== 'string' || model.version.trim() === '') return false;
    if (!model.parameters || typeof model.parameters !== 'object') return false;
    return true;
  }

  /**
   * Validates training configuration if present.
   * @param training - Training configuration.
   * @returns True if valid, false otherwise.
   */
  validateTrainingConfig(training?: TrainingConfig): boolean {
    if (!training) return true;
    if (typeof training.epochs !== 'number' || training.epochs <= 0) return false;
    if (typeof training.batchSize !== 'number' || training.batchSize <= 0) return false;
    if (typeof training.learningRate !== 'number' || training.learningRate <= 0) return false;
    if (typeof training.optimizer !== 'string' || training.optimizer.trim() === '') return false;
    return true;
  }
}
