import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { ExperimentResult } from './experiment-result';

export class ExperimentRunner {
  private experimentId: string;
  private containerImage: string;
  private timeout: number;
  private checkpointPath: string;
  private logPath: string;
  private containerProcess: ChildProcess | null = null;
  private startTime: Date | null = null;
  private endTime: Date | null = null;

  /**
   * Creates a new ExperimentRunner instance.
   * @param experimentId - Unique identifier for the experiment
   * @param containerImage - Docker image to run
   * @param timeout - Timeout in seconds
   * @param checkpointPath - Local path for checkpoint storage
   * @param logPath - Local path for log storage
   */
  constructor(
    experimentId: string,
    containerImage: string,
    timeout: number,
    checkpointPath: string,
    logPath: string
  ) {
    this.validateConstructorParams(experimentId, containerImage, timeout, checkpointPath, logPath);
    this.experimentId = experimentId;
    this.containerImage = containerImage;
    this.timeout = timeout;
    this.checkpointPath = checkpointPath;
    this.logPath = logPath;
  }

  /**
   * Validates constructor parameters.
   */
  private validateConstructorParams(
    experimentId: string,
    containerImage: string,
    timeout: number,
    checkpointPath: string,
    logPath: string
  ): void {
    if (!experimentId || typeof experimentId !== 'string') {
      throw new Error('experimentId must be a non-empty string');
    }
    if (!containerImage || typeof containerImage !== 'string') {
      throw new Error('containerImage must be a non-empty string');
    }
    if (typeof timeout !== 'number' || timeout <= 0) {
      throw new Error('timeout must be a positive number');
    }
    if (!checkpointPath || typeof checkpointPath !== 'string') {
      throw new Error('checkpointPath must be a non-empty string');
    }
    if (!logPath || typeof logPath !== 'string') {
      throw new Error('logPath must be a non-empty string');
    }
  }

  /**
   * Launches the containerized experiment.
   */
  async start(): Promise<void> {
    if (this.containerProcess) {
      throw new Error('Experiment already running');
    }

    try {
      await fs.mkdir(dirname(this.logPath), { recursive: true });
      await fs.mkdir(dirname(this.checkpointPath), { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directories: ${(error as Error).message}`);
    }

    this.startTime = new Date();
    this.containerProcess = spawn('docker', [
      'run',
      '--rm',
      '-v',
      `${this.checkpointPath}:/checkpoints`,
      '-v',
      `${this.logPath}:/logs`,
      this.containerImage
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    this.containerProcess.on('error', (err) => {
      this.containerProcess = null;
      throw new Error(`Failed to start container: ${err.message}`);
    });

    // Handle timeout
    setTimeout(() => {
      if (this.isRunning()) {
        this.stop().catch(() => {
          // Ignore stop errors during timeout
        });
      }
    }, this.timeout * 1000);
  }

  /**
   * Terminates the running container.
   */
  async stop(): Promise<void> {
    if (!this.containerProcess) {
      return;
    }

    this.containerProcess.kill('SIGTERM');
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.containerProcess?.kill('SIGKILL');
      }, 5000);

      this.containerProcess!.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.containerProcess!.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    this.containerProcess = null;
    this.endTime = new Date();
  }

  /**
   * Checks if the experiment is currently running.
   * @returns true if running, false otherwise
   */
  isRunning(): boolean {
    return this.containerProcess !== null && this.containerProcess.exitCode === null;
  }

  /**
   * Fetches the last N lines of logs.
   * @param tail - Number of lines to return
   * @returns Array of log lines
   */
  async getLogs(tail: number): Promise<string[]> {
    if (typeof tail !== 'number' || tail < 0) {
      throw new Error('tail must be a non-negative number');
    }

    try {
      const logContent = await fs.readFile(this.logPath, 'utf-8');
      const lines = logContent.split('\n').filter(line => line.trim() !== '');
      return lines.slice(-tail);
    } catch (error) {
      return [];
    }
  }

  /**
   * Lists checkpoint files.
   * @returns Array of checkpoint filenames
   */
  async getCheckpoints(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.checkpointPath);
      return files.filter(file => file.endsWith('.ckpt'));
    } catch (error) {
      return [];
    }
  }

  /**
   * Waits for the experiment to complete or timeout.
   * @param timeout - Maximum time to wait in seconds
   * @returns ExperimentResult object
   */
  async waitForCompletion(timeout: number): Promise<ExperimentResult> {
    if (typeof timeout !== 'number' || timeout <= 0) {
      throw new Error('timeout must be a positive number');
    }

    const startWaitTime = Date.now();
    
    while (this.isRunning()) {
      if (Date.now() - startWaitTime > timeout * 1000) {
        await this.stop();
        return new ExperimentResult(
          this.experimentId,
          'timeout',
          this.startTime!,
          new Date(),
          [],
          this.checkpointPath,
          {}
        );
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const logs = await this.getLogs(1000);
    const status = this.containerProcess?.exitCode === 0 ? 'completed' : 'failed';
    
    return new ExperimentResult(
      this.experimentId,
      status,
      this.startTime!,
      this.endTime!,
      logs,
      this.checkpointPath,
      {}
    );
  }

  /**
   * Cleans up resources including logs and checkpoints.
   */
  async cleanup(): Promise<void> {
    if (this.isRunning()) {
      await this.stop();
    }
    
    try {
      await fs.rm(this.logPath, { force: true });
      await fs.rm(this.checkpointPath, { force: true, recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}
