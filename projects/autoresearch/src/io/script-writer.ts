import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Configuration for an experiment.
 */
export interface ExperimentConfig {
  name: string;
  metrics: string[];
  duration: number;
  traffic: number;
  tags?: Record<string, string>;
}

/**
 * Configuration for a variant.
 */
export interface VariantConfig {
  id: string;
  payload: Record<string, any>;
}

/**
 * Represents a single metric.
 */
export interface Metric {
  name: string;
  value: number;
}

/**
 * Represents the status of an experiment.
 */
export type Status = 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Writes experiment-related scripts and files to disk.
 */
export class ScriptWriter {
  private outputPath: string;
  private templateEngine: TemplateEngine;

  /**
   * Creates a new instance of ScriptWriter.
   * @param outputPath The directory where files will be written.
   */
  constructor(outputPath: string = './output') {
    if (!outputPath || typeof outputPath !== 'string') {
      throw new Error('outputPath must be a non-empty string');
    }
    this.outputPath = outputPath;
    this.templateEngine = new TemplateEngine();
  }

  /**
   * Writes a training script for the given experiment and variant.
   * @param config The experiment configuration.
   * @param variant The variant configuration.
   * @returns The path to the written file.
   */
  writeTrainingScript(config: ExperimentConfig, variant: VariantConfig): string {
    this.validateConfig(config);
    this.validateVariant(variant);

    const template = this.templateEngine.load('training');
    const context = {
      name: this.sanitizeName(config.name),
      variant: this.sanitizeName(variant.id),
      payload: JSON.stringify(variant.payload),
      metrics: config.metrics,
      duration: config.duration,
      traffic: config.traffic
    };

    const script = this.templateEngine.render(template, context);
    const filename = `${this.sanitizeName(config.name)}-${this.sanitizeName(variant.id)}.py`;
    const filepath = join(this.outputPath, filename);

    this.writeFile(filepath, script);
    return filepath;
  }

  /**
   * Writes an evaluation script for the given experiment and variant.
   * @param config The experiment configuration.
   * @param variant The variant configuration.
   * @returns The path to the written file.
   */
  writeEvaluationScript(config: ExperimentConfig, variant: VariantConfig): string {
    this.validateConfig(config);
    this.validateVariant(variant);

    const template = this.templateEngine.load('evaluation');
    const context = {
      name: this.sanitizeName(config.name),
      variant: this.sanitizeName(variant.id),
      payload: JSON.stringify(variant.payload),
      metrics: config.metrics
    };

    const script = this.templateEngine.render(template, context);
    const filename = `${this.sanitizeName(config.name)}-${this.sanitizeName(variant.id)}-eval.py`;
    const filepath = join(this.outputPath, filename);

    this.writeFile(filepath, script);
    return filepath;
  }

  /**
   * Writes a deployment script for the given experiment and variant.
   * @param config The experiment configuration.
   * @param variant The variant configuration.
   * @returns The path to the written file.
   */
  writeDeploymentScript(config: ExperimentConfig, variant: VariantConfig): string {
    this.validateConfig(config);
    this.validateVariant(variant);

    const template = this.templateEngine.load('deployment');
    const context = {
      name: this.sanitizeName(config.name),
      variant: this.sanitizeName(variant.id),
      payload: JSON.stringify(variant.payload),
      tags: JSON.stringify(config.tags || {})
    };

    const script = this.templateEngine.render(template, context);
    const filename = `${this.sanitizeName(config.name)}-${this.sanitizeName(variant.id)}-deploy.py`;
    const filepath = join(this.outputPath, filename);

    this.writeFile(filepath, script);
    return filepath;
  }

  /**
   * Creates an empty log file for the given experiment and variant.
   * @param config The experiment configuration.
   * @param variant The variant configuration.
   * @returns The path to the created log file.
   */
  writeLogStream(config: ExperimentConfig, variant: VariantConfig): string {
    this.validateConfig(config);
    this.validateVariant(variant);

    const filename = `${this.sanitizeName(config.name)}-${this.sanitizeName(variant.id)}.log`;
    const filepath = join(this.outputPath, 'logs', filename);

    this.writeFile(filepath, '');
    return filepath;
  }

  /**
   * Writes a metrics file for the given experiment and variant.
   * @param metrics The metrics to write.
   * @param config The experiment configuration.
   * @param variant The variant configuration.
   * @returns The path to the written file.
   */
  writeMetricsFile(metrics: Metric[], config: ExperimentConfig, variant: VariantConfig): string {
    if (!Array.isArray(metrics)) {
      throw new Error('metrics must be an array');
    }
    this.validateConfig(config);
    this.validateVariant(variant);

    const filename = `${this.sanitizeName(config.name)}-${this.sanitizeName(variant.id)}-metrics.json`;
    const filepath = join(this.outputPath, 'metrics', filename);

    const data = {
      variant: variant.id,
      metrics: metrics.map(m => ({
        name: m.name,
        value: m.value,
      })),
      timestamp: new Date().toISOString()
    };

    this.writeFile(filepath, JSON.stringify(data, null, 2));
    return filepath;
  }

  /**
   * Writes a status file for the given experiment and variant.
   * @param status The status to write.
   * @param config The experiment configuration.
   * @param variant The variant configuration.
   * @returns The path to the written file.
   */
  writeStatusFile(status: Status, config: ExperimentConfig, variant: VariantConfig): string {
    if (!this.isValidStatus(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    this.validateConfig(config);
    this.validateVariant(variant);

    const filename = `${this.sanitizeName(config.name)}-${this.sanitizeName(variant.id)}-status.json`;
    const filepath = join(this.outputPath, 'status', filename);

    const data = {
      variant: variant.id,
      status: status,
      timestamp: new Date().toISOString()
    };

    this.writeFile(filepath, JSON.stringify(data, null, 2));
    return filepath;
  }

  /**
   * Writes content to a file, creating directories as needed.
   * @param filepath The path to the file.
   * @param content The content to write.
   */
  private writeFile(filepath: string, content: string): void {
    if (!filepath || typeof filepath !== 'string') {
      throw new Error('filepath must be a non-empty string');
    }
    if (typeof content !== 'string') {
      throw new Error('content must be a string');
    }

    const dir = dirname(filepath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    try {
      writeFileSync(filepath, content, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file ${filepath}: ${(error as Error).message}`);
    }
  }

  /**
   * Validates an experiment configuration.
   * @param config The configuration to validate.
   */
  private validateConfig(config: ExperimentConfig): void {
    if (!config || typeof config !== 'object') {
      throw new Error('config must be an object');
    }
    if (!config.name || typeof config.name !== 'string') {
      throw new Error('config.name must be a non-empty string');
    }
    if (!Array.isArray(config.metrics)) {
      throw new Error('config.metrics must be an array');
    }
    if (typeof config.duration !== 'number' || config.duration <= 0) {
      throw new Error('config.duration must be a positive number');
    }
    if (typeof config.traffic !== 'number' || config.traffic < 0 || config.traffic > 100) {
      throw new Error('config.traffic must be a number between 0 and 100');
    }
  }

  /**
   * Validates a variant configuration.
   * @param variant The configuration to validate.
   */
  private validateVariant(variant: VariantConfig): void {
    if (!variant || typeof variant !== 'object') {
      throw new Error('variant must be an object');
    }
    if (!variant.id || typeof variant.id !== 'string') {
      throw new Error('variant.id must be a non-empty string');
    }
    if (!variant.payload || typeof variant.payload !== 'object') {
      throw new Error('variant.payload must be an object');
    }
  }

  /**
   * Checks if a status is valid.
   * @param status The status to check.
   * @returns True if the status is valid.
   */
  private isValidStatus(status: any): status is Status {
    return ['running', 'completed', 'failed', 'cancelled'].includes(status);
  }

  /**
   * Sanitizes a name for use in filenames.
   * @param name The name to sanitize.
   * @returns The sanitized name.
   */
  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9-_]/g, '_');
  }
}

/**
 * Handles loading and rendering templates.
 */
class TemplateEngine {
  private templates: Map<string, string> = new Map();

  constructor() {
    this.loadTemplates();
  }

  /**
   * Loads a template by name.
   * @param name The name of the template.
   * @returns The template content.
   */
  load(name: string): string {
    if (typeof name !== 'string' || !name) {
      throw new Error('name must be a non-empty string');
    }
    return this.templates.get(name) || '';
  }

  /**
   * Renders a template with the given context.
   * @param template The template to render.
   * @param context The context to render with.
   * @returns The rendered template.
   */
  render(template: string, context: any): string {
    if (typeof template !== 'string') {
      throw new Error('template must be a string');
    }
    if (!context || typeof context !== 'object') {
      throw new Error('context must be an object');
    }

    let result = template;

    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  /**
   * Loads the default templates.
   */
  private loadTemplates(): void {
    this.templates.set('training', `
import mlflow
import pandas as pd
from datetime import datetime

def train_{{name}}_{{variant}}():
    # Training script for {{name}} variant {{variant}}
    payload = {{payload}}

    {{#each metrics}}
    mlflow.log_metric("{{this}}", 0.0)
    {{/each}}

    for epoch in range({{duration}}):
        # Training logic here
        pass

    return model
`);

    this.templates.set('evaluation', `
import mlflow
import pandas as pd

def evaluate_{{name}}_{{variant}}():
    # Evaluation script for {{name}} variant {{variant}}
    payload = {{payload}}

    {{#each metrics}}
    score = calculate_{{this}}()
    mlflow.log_metric("{{this}}", score)
    {{/each}}

    return metrics
`);

    this.templates.set('deployment', `
import docker
import kubernetes

def deploy_{{name}}_{{variant}}():
    # Deployment script for {{name}} variant {{variant}}
    payload = {{payload}}
    tags = {{tags}}

    # Deployment logic here
    pass
`);
  }
}
