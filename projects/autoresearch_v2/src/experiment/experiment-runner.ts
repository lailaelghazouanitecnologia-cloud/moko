import { ExperimentConfig, ExperimentResult, ExperimentMetrics } from './index';

/**
 * Orchestrates experiment execution lifecycle
 */
export class ExperimentRunner {
  private config: ExperimentConfig;
 : ExperimentResult[] = [];
  private status: 'idle' | 'running' | 'completed' | 'failed' = 'idle';

  /**
   * Creates an instance of ExperimentRunner.
   * @param config - The experiment configuration
   * @throws {Error} If config is invalid
   */
  constructor(config: ExperimentConfig) {
    this.validateConfig(config);
    this.config = { ...config };
  }

  /**
   * Sets up the experiment environment
   * @returns Promise that resolves when setup is complete
   * @throws {Error} If experiment is not in idle state
   */
  async setup(): Promise<void> {
    if (this.status !== 'idle') {
      throw new Error('Experiment already initialized');
    }
    try {
      await this.initializeEnvironment();
      this.status = 'running';
    } catch (error) {
      this.status = 'failed';
      throw new Error(`Failed to setup experiment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Launches the experiment
   * @returns Promise that resolves when experiment is launched
   * @throws {Error} If experiment is not in running state
   */
  async launch(): Promise<void> {
    if (this.status !== 'running') {
      throw new Error('Experiment not in running state');
    }
    try {
      await this.executeExperiment();
    } catch (error) {
      this.status = 'failed';
      throw new Error(`Failed to launch experiment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Monitors the experiment progress
   * @returns Promise that resolves when monitoring is complete
   * @throws {Error} If experiment is not in running state
   */
  async monitor(): Promise<void> {
    if (this.status !== 'running') {
      throw new Error('Experiment not in running state');
    }
    try {
      await this.checkProgress();
    } catch (error) {
      this.status = 'failed';
      throw new Error(`Failed to monitor experiment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Finalizes the experiment and returns results
   * @returns Array of experiment results
   * @throws {Error} If experiment is not in running state
   */
  async finalize(): Promise<ExperimentResult[]> {
    if (this.status !== 'running') {
      throw new Error('Experiment not in running state');
    }
    try {
      await this.cleanup();
      this.status = 'completed';
      return [...this.results];
    } catch (error) {
      this.status = 'failed';
      throw new Error(`Failed to finalize experiment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets the current status of the experiment
   * @returns Current experiment status
   */
  getStatus(): string {
    return this.status;
  }

  /**
   * Gets a copy of the experiment results
   * @returns Array of experiment results
   */
  getResults(): ExperimentResult[] {
    return [...this.results];
  }

  /**
   * Gets a copy of the experiment configuration
   * @returns Experiment configuration
   */
  getConfig(): ExperimentConfig {
    return { ...this.config };
  }

  /**
   * Validates the experiment configuration
   * @param config - Configuration to validate
   * @throws {Error} If configuration is invalid
   */
  private validateConfig(config: ExperimentConfig): void {
    if (!config) {
      throw new Error('Experiment configuration is required');
    }
    if (!config.name || typeof config.name !== 'string') {
      throw new Error('Experiment name is required and must be a string');
    }
    if (!config.iterations || config.iterations <= 0) {
      throw new Error('Iterations must be a positive number');
    }
  }

  /**
   * Initializes the experiment environment
   */
  private async initializeEnvironment(): Promise<void> {
    // Simulate environment setup
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Executes the experiment
   */
  private async executeExperiment(): Promise<void> {
    // Simulate experiment execution
    for (let i = 0; i < this.config.iterations; i++) {
      const result: ExperimentResult = {
        iteration: i + 1,
        timestamp: new Date(),
        metrics: {
          accuracy: Math.random(),
          precision: Math.random(),
          recall: Math.random(),
          f1Score: Math.random(),
          duration: Math.random() * 1000,
          samplesProcessed: Math.floor(Math.random() * 1000)
        }
      };
      this.results.push(result);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Checks the experiment progress
   */
  private async checkProgress(): Promise<void> {
    // Simulate progress monitoring
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Cleans up resources after experiment completion
   */
  private async cleanup(): Promise<void> {
    // Simulate cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
