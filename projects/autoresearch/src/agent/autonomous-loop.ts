import { EventLogger } from './index';
import { ExitHandler } from './exit-handler';
import { LoopStatus } from './loop-status';

/**
 * Main autonomous research loop orchestration
 * Manages the execution lifecycle of autonomous research iterations
 */
export class AutonomousLoop {
  private running: boolean = false;
  private iteration: number = 0;
  private logger: EventLogger;
  private exitHandler: ExitHandler;
  private maxIterations: number;
  private startTime: Date;
  private lastIterationTime: Date | null = null;
  private lastError: Error | null = null;

  static readonly DEFAULT_MAX_ITERATIONS = 1000;

  /**
   * Creates an instance of AutonomousLoop
   * @param logger - Event logger for logging loop activities
   * @param exitHandler - Handler for graceful shutdown
   * @param maxIterations - Maximum number of iterations (default: 1000)
   * @throws {Error} If logger or exitHandler is not provided
   */
  constructor(logger: EventLogger, exitHandler: ExitHandler, maxIterations: number = AutonomousLoop.DEFAULT_MAX_ITERATIONS) {
    if (!logger) {
      throw new Error('EventLogger is required');
    }
    if (!exitHandler) {
      throw new Error('ExitHandler is required');
    }
    if (maxIterations <= 0) {
      throw new Error('maxIterations must be greater than 0');
    }

    this.logger = logger;
    this.exitHandler = exitHandler;
    this.maxIterations = maxIterations;
    this.startTime = new Date();
  }

  /**
   * Start the main autonomous loop
   * @returns Promise that resolves when the loop completes
   * @throws {Error} If the loop fails to start or encounters a fatal error
   */
  async start(): Promise<void> {
    if (this.running) {
      this.logger.warn('AutonomousLoop already running');
      return;
    }

    this.running = true;
    this.iteration = 0;
    this.startTime = new Date();
    this.lastIterationTime = null;
    this.lastError = null;

    this.logger.info('AutonomousLoop started', { maxIterations: this.maxIterations });

    try {
      while (this.shouldContinue()) {
        try {
          const shouldProceed = await this.runIteration();
          if (!shouldProceed) {
            this.logger.info('Iteration indicated stop condition');
            break;
          }
        } catch (error) {
          this.handleError(error as Error);
          if (!this.shouldContinue()) {
            break;
          }
        }
      }
    } catch (fatalError) {
      this.logger.error('Fatal error in autonomous loop', fatalError as Error);
      this.running = false;
      throw fatalError;
    }

    this.logger.info('AutonomousLoop completed', { totalIterations: this.iteration });
    await this.stop();
  }

  /**
   * Stop the loop gracefully
   * @returns Promise that resolves when cleanup is complete
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.logger.info('AutonomousLoop stopped', { totalIterations: this.iteration });
    
    if (this.exitHandler) {
      try {
        await this.exitHandler.cleanup();
      } catch (error) {
        this.logger.error('Error during cleanup', error as Error);
      }
    }
  }

  /**
   * Execute a single iteration of the loop
   * @returns Promise<boolean> - True to continue, false to stop
   * @throws {Error} If iteration execution fails
   */
  async runIteration(): Promise<boolean> {
    if (!this.running) {
      throw new Error('Cannot run iteration - loop is not running');
    }

    this.iteration++;
    this.lastIterationTime = new Date();

    this.logger.debug(`Running iteration ${this.iteration}`);

    try {
      // Simulate research iteration work
      await this.simulateWork();
      
      // Randomly simulate success/failure for demonstration
      if (Math.random() < 0.05) {
        throw new Error('Simulated iteration failure');
      }

      this.logger.info(`Iteration ${this.iteration} completed successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Iteration ${this.iteration} failed`, error as Error);
      throw error;
    }
  }

  /**
   * Check if the loop should continue running
   * @returns boolean - True if loop should continue
   */
  shouldContinue(): boolean {
    if (!this.running) {
      return false;
    }

    if (this.iteration >= this.maxIterations) {
      this.logger.info('Max iterations reached');
      return false;
    }

    return true;
  }

  /**
   * Process and handle errors that occur during loop execution
   * @param error - The error to handle
   */
  handleError(error: Error): void {
    if (!error) {
      this.logger.warn('handleError called with null/undefined error');
      return;
    }

    this.lastError = error;
    this.logger.error('Error in autonomous loop', error);

    // Log error details
    this.logger.debug('Error details', {
      message: error.message,
      stack: error.stack,
      iteration: this.iteration
    });

    // Check if we should continue after error
    if (this.iteration >= this.maxIterations) {
      this.running = false;
    }
  }

  /**
   * Get the current status of the loop
   * @returns LoopStatus object containing current state
   */
  getStatus(): LoopStatus {
    return {
      running: this.running,
      iteration: this.iteration,
      lastError: this.lastError,
      startTime: this.startTime,
      lastIterationTime: this.lastIterationTime
    };
  }

  /**
   * Simulate work being done in an iteration
   * @private
   */
  private async simulateWork(): Promise<void> {
    const workDuration = Math.floor(Math.random() * 200) + 50; // 50-250ms
    await new Promise(resolve => setTimeout(resolve, workDuration));
  }

  /**
   * Get the current iteration number
   * @returns Current iteration number
   */
  getCurrentIteration(): number {
    return this.iteration;
  }

  /**
   * Check if the loop is currently running
   * @returns True if running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the last error that occurred
   * @returns The last error or null if none
   */
  getLastError(): Error | null {
    return this.lastError;
  }

  /**
   * Get elapsed time since loop started
   * @returns Time in milliseconds or 0 if not started
   */
  getElapsedTime(): number {
    if (!this.startTime) {
      return 0;
    }
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Forcefully terminate the loop
   * @returns Promise that resolves when terminated
   */
  async terminate(): Promise<void> {
    this.logger.warn('AutonomousLoop forcefully terminated');
    this.running = false;
    await this.stop();
  }
}