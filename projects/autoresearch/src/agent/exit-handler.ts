import { EventLogger } from './event-logger';
import { ExitHandlerFunction } from './index';

/**
 * Handles graceful shutdown and cleanup for the application.
 * Registers cleanup handlers and ensures they are executed on exit signals.
 */
export class ExitHandler {
  private handlers: ExitHandlerFunction[] = [];
  private isShuttingDown: boolean = false;
  private logger: EventLogger;
  private readonly maxShutdownTime: number = 30000; // 30 seconds
  private shutdownTimer: NodeJS.Timeout | null = null;

  constructor(logger: EventLogger) {
    if (!logger) {
      throw new Error('EventLogger is required for ExitHandler');
    }
    this.logger = logger;
    this.setupSignalHandlers();
  }

  /**
   * Register a cleanup handler to be executed during shutdown
   * @param handler - Function to be called during cleanup
   * @throws {Error} If handler is not a function
   */
  register(handler: ExitHandlerFunction): void {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    
    if (this.handlers.includes(handler)) {
      this.logger.warn('Handler already registered, ignoring duplicate');
      return;
    }

    this.handlers.push(handler);
    this.logger.debug('Exit handler registered', { handlerCount: this.handlers.length });
  }

  /**
   * Remove a registered cleanup handler
   * @param handler - Function to remove from cleanup handlers
   * @throws {Error} If handler is not a function
   */
  unregister(handler: ExitHandlerFunction): void {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }

    const index = this.handlers.indexOf(handler);
    if (index !== -1) {
      this.handlers.splice(index, 1);
      this.logger.debug('Exit handler unregistered', { handlerCount: this.handlers.length });
    } else {
      this.logger.warn('Attempted to unregister unknown handler');
    }
  }

  /**
   * Initiate graceful shutdown of the application
   * @param signal - Optional signal name that triggered the shutdown
   */
  async shutdown(signal?: string): Promise<void> {
    if (this.isShusttingDown) {
      this.logger.warn('Already shutting down, ignoring duplicate signal');
      return;
    }

    this.isShuttingDown = true;
    const signalMsg = signal ? ` (signal: ${signal})` : '';
    this.logger.info(`Initiating graceful shutdown${signalMsg}`);

    // Set up forced exit timeout
    this.shutdownTimer = setTimeout(() => {
      this.logger.error('Shutdown timeout exceeded, forcing exit');
      this.forceExit(1);
    }, this.maxShutdownTime);

    try {
      await this.cleanup();
      this.clearShutdownTimer();
      this.logger.info('Graceful shutdown completed');
      this.forceExit(0);
    } catch (error) {
      this.clearShutdownTimer();
      this.logger.error('Error during shutdown', error instanceof Error ? error : new Error(String(error)));
      this.forceExit(1);
    }
  }

  /**
   * Run all registered cleanup handlers
   */
  async cleanup(): Promise<void> {
    if (this.handlers.length === 0) {
      this.logger.info('No cleanup handlers to run');
      return;
    }

    this.logger.info('Running cleanup handlers', { handlerCount: this.handlers.length });

    const promises = this.handlers.map(async (handler, index) => {
      const startTime = Date.now();
      try {
        const result = handler();
        if (result && typeof result.then === 'function') {
          await result;
        }
        const duration = Date.now() - startTime;
        this.logger.debug(`Cleanup handler ${index} completed`, { duration });
      } catch (error) {
        const duration = Date.now() - startTime;
        this.logger.error(`Cleanup handler ${index} failed after ${duration}ms`, 
          error instanceof Error ? error : new Error(String(error)));
      }
    });

    const results = await Promise.allSettled(prominences);
    
    // Count failures
    const failures = results.filter(r => r.status === 'rejected').length;
    if (failures > 0) {
      this.logger.warn(`${failures} cleanup handlers failed during shutdown`);
    }

    this.handlers = [];
  }

  /**
   * Force process exit with specified code
   * @param code - Exit code (0 for success, non-zero for failure)
   * @throws {Error} If code is not a valid number
   */
  forceExit(code: number): void {
    if (typeof code !== 'number' || !Number.isInteger(code)) {
      throw new Error('Exit code must be an integer');
    }

    this.logger.info(`Forcing process exit with code ${code}`);
    process.exit(code);
  }

  /**
   * Set up OS signal handlers for graceful shutdown
   */
  setupSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGHUP'];
    
    signals.forEach(signal => {
      process.on(signal, () => {
        this.logger.warn(`Received ${signal} signal`);
        this.shutdown(signal);
      });
    });

    process.on('uncaughtException', (error: Error) => {
      this.logger.error('Uncaught exception', error);
      this.shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason: any) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.error('Unhandled rejection', error);
      this.shutdown('unhandledRejection');
    });

    this.logger.debug('Signal handlers installed');
  }

  /**
   * Clear the shutdown timeout timer
   * @private
   */
  private clearShutdownTimer(): void {
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = null;
    }
  }

  /**
   * Check if currently shutting down
   * @returns {boolean} True if shutdown is in progress
   */
  isShuttingDown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Get count of registered handlers
   * @returns {number} Number of registered cleanup handlers
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  /**
   * Remove all registered handlers
   */
  clearAllHandlers(): void {
    const count = this.handlers.length;
    this.handlers = [];
    this.logger.debug('All handlers cleared', { clearedCount: count });
  }
}