import { VariantConfig } from './variant-config';

/**
 * Configuration for an experiment including its name, description, variants,
 * metrics, traffic allocation, duration, and optional tags.
 */
export interface ExperimentConfig {
  name: string;
  description: string;
  variants: VariantConfig[];
  metrics: string[];
  traffic: number;
  duration: number;
  tags: Record<string, string>;
}

export namespace ExperimentConfig {
  /**
   * Validates that the provided ExperimentConfig object meets all constraints.
   *
   * @param config - The experiment configuration to validate.
   * @returns true if the configuration is valid; false otherwise.
   */
  export function validate(config: ExperimentConfig): boolean {
    if (!config) {
      return false;
    }

    if (typeof config.name !== 'string' || config.name.trim().length === 0) {
      return false;
    }

    if (!Array.isArray(config.variants) || config.variants.length === 0) {
      return false;
    }

    // Validate each variant
    for (const variant of config.variants) {
      if (!variant || typeof variant !== 'object') {
        return false;
      }
    }

    if (!Array.isArray(config.metrics) || config.metrics.length === 0) {
      return false;
    }

    if (typeof config.traffic !== 'number' || config.traffic < 0 || config.traffic > 1) {
      return false;
    }

    if (typeof config.duration !== 'number' || !Number.isFinite(config.duration) || config.duration <= 0) {
      return false;
    }

    if (config.tags !== undefined && (typeof config.tags !== 'object' || config.tags === null)) {
      return false;
    }

    return true;
  }

  /**
   * Serializes an ExperimentConfig instance to a plain JSON object.
   *
   * @param config - The experiment configuration to serialize.
   * @returns A plain object suitable for JSON serialization.
   */
  export function toJSON(config: ExperimentConfig): object {
    if (!config) {
      throw new Error('ExperimentConfig.toJSON: config is required');
    }

    return {
      name: config.name,
      description: config.description,
      variants: config.variants.map(v => ({ ...v })),
      metrics: [...config.metrics],
      traffic: config.traffic,
      duration: config.duration,
      tags: config.tags ? { ...config.tags } : {}
    };
  }

  /**
   * Deserializes a plain object into an ExperimentConfig instance.
   *
   * @param data - The plain object to deserialize.
   * @returns A new ExperimentConfig instance.
   * @throws If the input data is null, undefined, or not an object.
   */
  export function fromJSON(data: object): ExperimentConfig {
    if (!data || typeof data !== 'object') {
      throw new Error('ExperimentConfig.fromJSON: data must be a non-null object');
    }

    const src = data as any;

    return {
      name: typeof src.name === 'string' ? src.name.trim() : '',
      description: typeof src.description === 'string' ? src.description : '',
      variants: Array.isArray(src.variants) ? src.variants : [],
      metrics: Array.isArray(src.metrics) ? src.metrics : [],
      traffic: typeof src.traffic === 'number' && !Number.isNaN(src.traffic) ? src.traffic : 0,
      duration: typeof src.duration === 'number' && !Number.isNaN(src.duration) ? src.duration : 0,
      tags: src.tags && typeof src.tags === 'object' && !Array.isArray(src.tags) ? { ...src.tags } : {}
    };
  }
}
