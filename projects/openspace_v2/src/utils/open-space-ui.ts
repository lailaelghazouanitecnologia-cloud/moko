import { CLIDisplay } from './cli-display';
import { Colors } from './colors';
import { Box } from './box';
import { AgentStatus } from './index';
import { type OpenStep } from './cli-display';

export class OpenSpaceUI {
  private enable_live: boolean;
  private compact: boolean;
  private term_width: number;
  private term_height: number;
  private readonly agent_status: Record<string, AgentStatus>;
  private readonly agent_activities: Record<string, string[]>;
  private readonly grounding_operations: Array<Record<string, unknown>>;
  private readonly grounding_backends: Array<Record<string, unknown>>;
  private readonly log_buffer: Array<[string, string, Date]>;
  private readonly metrics: Record<string, unknown>;
  private readonly cli: CLIDisplay;
  private loop_task: Promise<void> | null = null;

  constructor(enable_live = true, compact = false) {
    this.enable_live = enable_live;
    this.compact = compact;
    [this.term_width, this.term_height] = this._get_terminal_size();
    this.agent_status = {};
    this.agent_activities = {};
    this.grounding_operations = [];
    this.grounding_backends = [];
    this.log_buffer = [];
    this.metrics = {};
    this.cli = new CLIDisplay();
  }

  print_banner(): void {
    const box = new Box(68, Box.ROUND, 'blue', 2);
    const lines: string[] = [];
    lines.push(box.top_line());
    lines.push(box.empty_line());
    lines.push(box.text_line('OpenSpace Terminal UI', 'center', 2, 'cyan'));
    lines.push(box.empty_line());
    lines.push(box.bottom_line());
    console.log(lines.join('\n'));
  }

  print_initialization(steps: Array<[string, string]> = []): void {
    const box = new Box(68, Box.ROUND, 'blue', 2);
    const lines: string[] = [];
    lines.push(box.top_line());
    lines.push(box.empty_line());
    lines.push(box.text_line('Initialization', 'center', 2, 'cyan'));
    lines.push(box.empty_line());
    for (const [name, status] of steps) {
      const color = status === 'success' ? 'green' : 'yellow';
      lines.push(box.text_line(`${name}: ${this.cli.colorize(status, ` ${status}`)}`, 'left', 2, color));
    }
    lines.push(box.empty_line());
    lines.push(box.bottom_line());
    console.log(lines.join('\n'));
  }

  start_live_display(): void {
    this.loop_task = this._live_update_loop();
  }

  stop_live_display(): void {
    this.loop_task = null;
  }

  render(): void {
    this._clear_screen();
    this.print_banner();
    this._render_agents();
  }

  update_display(): void {
    this.render();
  }

  update_agent_status(name: string, status: AgentStatus): void {
    this.agent_status[name] = status;
  }

  add_agent_activity(name: string, activity: string): void {
    if (!this.agent_activities[name]) {
      this.agent_activities[name] = [];
    }
    this.agent_activities[name].push(activity);
  }

  update_ground_back(backends: Array<Record<string, unknown>>): void {
    this.grounding_backends = [...backends];
  }

  add_operation(backend: string, action: string, status = 'pending'): void {
    this.grounding_operations.push({
      backend,
      action,
      status,
      timestamp: new Date()
    });
  }

  add_log(message: string, level = 'info'): void {
    this.log_buffer.push([message, level, new Date()]);
  }

  update_metrics(kwargs: Record<string, unknown>): void {
    Object.assign(this.metrics, kwargs);
  }

  print_summary(result: Record<string, unknown>): void {
    const box = new Box(68, Box.ROUND, 'blue', 2);
    const lines: string[] = [];
    lines.push(box.top_line());
    lines.push(box.empty_line());
    lines.push(box.text_line('Summary', 'center', 2, 'cyan'));
    lines.push(box.empty_line());
    for (const [key, value] of Object.entries(result)) {
      const color = typeof value === 'string' && value.includes('success') ? 'green' : 'yellow';
      lines.push(box.text_line(`${key}: ${value}`, 'left', 2, color));
    }
    lines.push(box.empty_line());
    lines.push(box.bottom_line());
    console.log(lines.join('\n'));
  }

  private _get_terminal_size(): [number, number] {
    return [80, 24];
  }

  private _clear_screen(): void {
    console.clear();
  }

  private _hide_cursor(): void {
    process.stdout.write('\x1b[?25l');
  }

  private _show_cursor(): void {
    process.stdout.write('\x1b[?25h');
  }

  private async _live_update_loop(): Promise<void> {
    this._hide_cursor();
    while (this.loop_task) {
      this.update_display();
      await new Promise(r => setTimeout(r, 1000));
    }
    this._show_cursor();
  }

  private _render_agents(): void {
    const box = new Box(68, Box.ROUND, 'blue', 2);
    const lines: string[] = [];
    lines.push(box.top_line());
    lines.push(box.empty_line());
    lines.push(box.text_line('Agents', 'center', 2, 'cyan'));
    lines.push(box.empty_line());
    for (const [name, status] of Object.entries(this.agent_status)) {
      const color = status === 'completed' ? 'green' : 'yellow';
      lines.push(box.text_line(`${name}: ${status}`, 'left', 2, color));
    }
    lines.push(box.empty_line());
    lines.push(box.bottom_line());
    console.log(lines.join('\n'));
  }
}
