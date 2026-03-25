import { TaskScheduler } from './task-scheduler';
import { FeedbackLoop } from './feedback-loop';

/**
 * Autonomous research workflow orchestrator.
 * Manages task scheduling, execution, and adaptive planning based on feedback.
 */
export class ResearchAgent {
  private scheduler: TaskScheduler;
  private feedback: FeedbackLoop;
  private isRunning: boolean;
  private currentTask: string;

  constructor() {
    this.scheduler = new TaskScheduler();
    this.feedback = new FeedbackLoop();
    this.isRunning = false;
    this.currentTask = '';
  }

  /**
   * Initialize agent runtime.
   * Starts the internal scheduler if not already running.
   * @throws {Error} If the scheduler fails to start.
   */
  start(): void {
    if (this.isRunning) {
      return;
    }
    try {
      this.scheduler.start();
      this.isRunning = true;
    } catch (error) {
      throw new Error(`Failed to start ResearchAgent: ${(error as Error).message}`);
    }
  }

  /**
   * Shutdown agent runtime.
   * Stops the internal scheduler and clears the current task.
   * @throws {Error} If the scheduler fails to stop gracefully.
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    try {
      this.scheduler.stop();
      this.isRunning = false;
      this.currentTask = '';
    } catch (error) {
      throw new Error(`Failed to stop ResearchAgent: ${(error as Error).message}`);
    }
  }

  /**
   * Add a task to the execution queue.
   * @param task - Unique identifier for the task.
   * @throws {TypeError} If task is not a non-empty string.
   * @throws {Error} If the agent is not running.
   */
  queueTask(task: string): void {
    if (typeof task !== 'string' || task.trim().length === 0) {
      throw new TypeError('Task must be a non-empty string');
    }
    if (!this.isRunning) {
      throw new Error('Cannot queue task: agent is not running');
    }
    this.scheduler.schedule({ id: task, name: task, status: 'pending' });
  }

  /**
   * Run the next queued task.
   * @throws {Error} If the agent is not running or no pending tasks exist.
   */
  async executeNext(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Cannot execute task: agent is not running');
    }
    const tasks = this.scheduler.list({ status: 'pending' });
    if (tasks.length === 0) {
      throw new Error('No pending tasks to execute');
    }
    const nextTask = tasks[0];
    this.currentTask = nextTask.id;
    try {
      await this.scheduler.start();
    } catch (error) {
      this.currentTask = '';
      throw new Error(`Task execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process the output of the current task.
   * @param result - Arbitrary result data from the task.
   * @throws {TypeError} If result is undefined.
   * @throws {Error} If no task is currently being processed.
   */
  handleResult(result: any): void {
    if (result === undefined) {
      throw new TypeError('Result cannot be undefined');
    }
    if (!this.currentTask) {
      throw new Error('No active task to handle result for');
    }
    this.feedback.record({
      taskId: this.currentTask,
      result: result,
      timestamp: Date.now()
    });
    this.currentTask = '';
  }

  /**
   * Adjust the research plan based on accumulated feedback.
   * @throws {Error} If feedback analysis or application fails.
   */
  adaptPlan(): void {
    try {
      const summary = this.feedback.analyze();
      this.feedback.apply(summary);
    } catch (error) {
      throw new Error(`Failed to adapt plan: ${(error as Error).message}`);
    }
  }

  /**
   * Return the current agent state.
   * @returns Object indicating whether the agent is running and the active task id.
   */
  getStatus(): { running: boolean; task: string } {
    return {
      running: this.isRunning,
      task: this.currentTask
    };
  }

  /**
   * Private helper to validate task identifier format.
   * @param id - Task identifier to validate.
   * @returns True if valid, false otherwise.
   */
  private isValidTaskId(id: string): boolean {
    return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id);
  }

  /**
   * Private helper to safely reset the current task.
   */
  private resetCurrentTask(): void {
    this.currentTask = '';
  }
}