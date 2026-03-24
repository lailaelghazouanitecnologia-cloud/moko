import { EventEmitter } from 'node:events';
import { spawn, ChildProcess } from 'node:child_process';
import { ExperimentConfig, ExperimentResult } from './index';
import { ProcessMonitor } from './process-monitor';
import { TimeoutController } from './timeout-controller';

/**
 * Orchestrates fixed-duration ML training experiments.
 * Manages process lifecycle, monitoring, and timeout handling.
 */
export class ExperimentRunner extends EventEmitter {
  private config!: ExperimentConfig;
  private monitor: ProcessMonitor;
  private timeoutController: TimeoutController;
  private startTime: number;
  private endTime: number;
  private process: ChildProcess | null = null;
  private isActive: boolean = false;
  private resultResolve: ((result: ExperimentResult) => void) | null = null;

  constructor() {
    super();
    this.monitor = new ProcessMonitor();
    this.timeoutController = new TimeoutController();
    this.startTime = 0;
    this.endTime = 0;
  }

  /**
   * Launch and supervise an experiment with the given configuration.
   * @param config - The experiment configuration
   * @returns Promise that resolves with the experiment result
   * @throws Error if configuration is invalid or experiment fails to start
   */
  async run(config: ExperimentConfig): Promise<ExperimentResult> {
    if (!this.validateConfig(config)) {
      throw new Error('Invalid experiment configuration');
    }

    // Prevent concurrent runs
    if (this.isActive) {
      throw new Error('Experiment is already running');
    }

    this.config = config;
    this.startTime = Date.now();
    this.isActive = true;

    return new Promise<ExperimentResult>((resolve, reject) => {
      this.resultResolve = resolve;

      try {
        this.initializeMonitoring();

        const spawnOptions = {
          cwd: this.config.workingDir || process.cwd(),
          env: { ...process.env, ...this.config.env },
          stdio: 'pipe' as const,
          shell: false
        };

        // Validate command exists
        if (!this.isCommandValid(this.config.command)) {
          throw new Error(`Command not found: ${this.config.command}`);
        }

        this.process = spawn(this.config.command, this.config.args || [], spawnOptions);

        if (!this.process.pid) {
          throw new Error('Failed to spawn process');
        }

        this.monitor.attach(this.process.pid);

        // Set up process event handlers
        this.process.on('exit', (code: number | null, signal: string | null) => {
          this.handleProcessExit(code || 0, signal || '');
        });

        this.process.on('error', (error: Error) => {
          this.handleError(error);
        });

        // Handle stdout/stderr if needed
        this.process.stdout?.on('data', (data: any) => {
          this.emit('stdout', data.toString());
        });

        this.process.stderr?.on('data', (data: any) => {
          this.emit('stderr', data.toString());
        });

        // Start timeout controller
        this.timeoutController.start(this.config.duration);
        this.timeoutController.onTimeout(() => {
          this.handleTimeout();
        });

      } catch (error) {
        this.cleanup();
        reject(error);
      }
    });
  }

  /**
   * Validate experiment configuration.
   * @param config - The configuration to validate
   * @returns true if configuration is valid, false otherwise
   */
  validateConfig(config: ExperimentConfig): boolean {
    if (!config || typeof config !== 'object') {
      return false;
    }
    if (typeof config.duration !== 'number' || config.duration <= 0) {
      return false;
    }
    if (typeof config.command !== 'string' || config.command.trim() === '') {
      return false;
    }
    if (config.args && !Array.isArray(config.args)) {
      return false;
    }
    if (config.workingDir && typeof config.workingDir !== 'string') {
      return false;
    }
    if (config.env && typeof config.env !== 'object') {
      return false;
    }
    if (config.maxRetries !== undefined && typeof config.maxRetries !== 'number') {
      return false;
    }
    return true;
  }

  /**
   * Initialize process monitoring.
   * @private
   */
  private initializeMonitoring(): void {
    this.monitor.onHealthChange((status: any) => {
      this.emit('health', status);
    });

    this.monitor.onResourceLimit((limit: any) => {
      this.emit('resourceLimit', limit);
    });
  }

  /**
   * Stop the currently running experiment.
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.endTime = Date.now();

    if (this.process && !this.process.killed) {
      try {
        this.monitor.kill('SIGTERM');
      } catch (error) {
        this.emit('warning', new Error(`Failed to terminate process: ${error}`));
      }
    }

    this.timeoutController.stop();
    this.monitor.detach();
    this.cleanup();
  }

  /**
   * Handle timeout event.
   * @private
   */
  private handleTimeout(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.endTime = Date.now();

    if (this.process && !this.process.killed) {
      try {
        this.monitor.forceKill();
      } catch (error) {
        this.emit('warning', new Error(`Failed to force kill process: ${error}`));
      }
    }

    const result: ExperimentResult = {
      success: false,
      exitCode: -1,
      signal: 'SIGKILL',
      duration: this.getElapsedTime(),
      timeout: true,
      error: new Error('Experiment timed out')
    };

    if (this.resultResolve) {
      this.resultResolve(result);
      this.resultResolve = null;
    }

    this.emit('timeout', result);
    this.cleanup();
  }

  /**
   * Handle process exit event.
   * @param code - Exit code
   * @param signal - Signal that caused termination
   * @private
   */
  private handleProcessExit(code: number, signal: string): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.endTime = Date.now();

    this.timeoutController.stop();
    this.monitor.detach();

    const success = code === 0 && !signal;
    const result: ExperimentResult = {
      success,
      exitCode: code,
      signal: signal || '',
      duration: this.getElapsedTime(),
      timeout: false,
      error: success ? undefined : new Error(`Process exited with code ${code} and signal ${signal}`)
    };

    if (this.resultResolve) {
      this.resultResolve(result);
      this.resultResolve = null;
    }

    this.emit('complete', result);
    this.cleanup();
  }

  /**
   * Handle process error.
   * @param error - The error that occurred
   * @private
   */
  private handleError(error: Error): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;
    this.endTime = Date.now();

    if (this.process && !this.process.killed) {
      try {
        this.monitor.forceKill();
      } catch (killError) {
        this.emit('warning', new Error(`Failed to force kill process: ${killError}`));
      }
    }

    this.timeoutController.stop();
    this.monitor.detach();

    const result: ExperimentResult = {
      success: false,
      exitCode: -1,
      signal: '',
      duration: this.getElapsedTime(),
      timeout: false,
      error
    };

    if (this.resultResolve) {
      this.resultResolve(result);
      this.resultResolve = null;
    }

    this.emit('error', error);
    this.cleanup();
  }

  /**
   * Check if experiment is currently running.
   * @returns true if running, false otherwise
   */
  isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Get elapsed time since experiment started.
   * @returns Time in milliseconds
   */
  getElapsedTime(): number {
    if (this.startTime === 0) {
      return 0;
    }
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }

  /**
   * Get remaining time until timeout.
   * @returns Time in milliseconds
   */
  getRemainingTime(): number {
    if (!this.isActive) {
      return 0;
    }
    return this.timeoutController.getRemaining();
  }

  /**
   * Check if a command is valid and executable.
   * @param command - The command to check
   * @returns true if command is valid, false otherwise
   * @private
   */
  private isCommandValid(command: string): boolean {
    try {
      (spawn as any).execSync(`which ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up resources and reset state.
   * @private
   */
  private cleanup(): void {
    this.process = null;
    this.resultResolve = null;
    this.startTime = 0;
    this.endTime = 0;
  }
}
