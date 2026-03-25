import { OpenSpaceUI } from './open-space-ui';
import { AgentStatus } from './agent-status';
import { Logger } from './logger';

export class UIIntegration {
  private readonly ui: OpenSpaceUI;
  private monitoringTask: unknown | null = null;
  private isMonitoring = false;

  constructor(ui?: OpenSpaceUI) {
    this.ui = ui ?? new OpenSpaceUI();
  }

  attach_llm_client(llm_client: unknown): void {
    Logger.get_logger('ui').debug('Attached LLM client to UI integration');
  }

  attach_grounding_client(grounding_client: unknown): void {
    Logger.get_logger('ui').debug('Attached grounding client to UI integration');
  }

  async start_monitoring(poll_interval = 0.5): Promise<void> {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    Logger.get_logger('ui').info('Started UI monitoring');
    
    this.monitoringTask = this.create_task(this._monitor_loop, poll_interval);
  }

  async stop_monitoring(): Promise<void> {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    Logger.get_logger('ui').info('Stopped UI monitoring');
    
    if (this.monitoringTask) {
      this.cancel(this.monitoringTask);
      this.monitoringTask = null;
    }
  }

  on_agent_start(agent_name: string, activity: string): void {
    this.ui.add_agent_activity(agent_name, activity);
    this.ui.add_log(`Agent ${agent_name} started: ${activity}`, 'info');
    this.ui.update_agent_status(agent_name, AgentStatus.EXECUTING);
  }

  on_agent_thinking(agent_name: string): void {
    this.ui.update_agent_status(agent_name, AgentStatus.THINKING);
  }

  on_agent_complete(agent_name: string, result = ''): void {
    this.ui.add_log(`Agent ${agent_name} completed${result ? ': ' + result : ''}`, 'info');
    this.ui.update_agent_status(agent_name, AgentStatus.COMPLETED);
  }

  on_llm_call(model: string, prompt_length: number): void {
    this.ui.add_log(`LLM call: ${model} (${prompt_length} tokens)`, 'info');
    this.ui.update_metrics(llm_calls = this.ui.get('llm_calls', 0) + 1);
  }

  on_grounding_call(backend: string, action: string): void {
    this.ui.add_grounding_operation(backend, action, 'pending');
    this.ui.add_log(`Grounding call: ${backend}.${action}`, 'info');
  }

  on_grounding_complete(backend: string, action: string, success: boolean): void {
    const status = success ? 'completed' : 'failed';
    this.ui.add_grounding_operation(backend, action, status);
    this.ui.add_log(`Grounding ${status}: ${backend}.${action}`, success ? 'info' : 'warning');
  }

  on_iteration(iteration: number): void {
    this.ui.update_metrics(iteration = iteration);
  }

  on_error(message: string): void {
    this.ui.add_log(message, 'error');
  }

  private async _monitor_loop(poll_interval: number): Promise<void> {
    while (this.isMonitoring) {
      await this._update_ui();
      await new Promise(resolve => setTimeout(resolve, poll_interval * 1000));
    }
  }

  private async _update_ui(): Promise<void> {
    this.ui.update_display();
  }

  private create_task(fn: (...args: unknown[]) => unknown, ...args: unknown[]): unknown {
    return { fn, args };
  }

  private cancel(task: unknown): void {
    // Task cancellation logic
  }
}
