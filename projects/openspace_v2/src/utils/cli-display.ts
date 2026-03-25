import { Box } from './box';
import { Colors } from './colors';
import { BoxleyStyle } from './boxley-style';

interface OpenStep {
  name: string;
  status: 'pending' | 'success' | 'failure';
  message?: string;
}

type OpenResult = {
  status: 'success' | 'failure';
  message: string;
  details?: Record<string, unknown>;
};

type OpenStatus = {
  name: string;
  status: 'online' | 'offline' | 'busy';
  uptime: number;
  tasks: number;
};

export class CLIDisplay {
  private readonly colors: Colors;

  constructor() {
    this.colors = new Colors();
  }

  print_banner(): void {
    const box = new Box(68, BoxleyStyle.DOUBLE, 'bl', 2);
    const lines: string[] = [];

    lines.push(box.top_line());
    lines.push(box.empty_line());
    lines.push(box.text_line('  █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ ', 'center'));
    lines.push(box.text_line(' █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █ █', 'center'));
    lines.push(box.text('  █ █ █ █ █ █ █ █ █ █ █ █ █ █', 'center'));
    lines.push(box.bottom_line());

    for (const line of lines) {
      console.log(line);
    }
  }

  print_configuration(config: unknown): void {

      const box = new Box(68, BoxleyStyle.DOUBLE, 'bl', 2);
      const lines: string[] = [];

      lines.push(box.top_line());
      lines.push(box.text_line('Configuration', 'center'));
      lines.push(box.separator_line());
      for (const [key, value] of Object.entries(config)) {
          lines.push(box.text_line(`${key}: ${value}`, 'left'));
      }
      lines.push(box.bottom_line());

      for (const line of lines) {
          console.log(line);
      }
  }

  print_initialization_progress(steps: OpenStep[], showHeader: boolean = true): void {
      if (!Array.isArray(steps)) {
          throw new TypeError('steps must be an array');
      }

      const box = new Box(68, BoxleyStyle.DOUBLE, 'bl', 2);
      const lines: string[] = [];

      if (showHeader) {
          lines.push(box.top_line());
          lines.push(box.text_line('Initialization Progress', 'center'));
          lines.push(box.separator_line());
      }

      for ( const step of steps) {
          const status = step.status === 'success' ? this.colors.green('✓') : step.status === 'failure' ? this.colors.red('✗') : this.colors.yellow('…');
          lines.push(box.text_line(`${status} ${step.name}`, 'left'));
      }

      lines.push(box.bottom_line());

      for (const line of lines) {
          console.log(line);
      }
  }

  print_result_summary(result: OpenResult): void {

      const box = new Box(68, BoxleyStyle.DOUBLE, 'bl', 2);
      const lines: string[] = [];

      lines.push(box.top_line());
      lines.push(box.text_line('Result Summary', 'center'));
      lines.push(box.separator_line());
      lines.push(box.text_line(this.colorize(result.status, result.status), 'center'));
      lines.push(box.text_line(result.message, 'center'));
      if (result.details) {
          for (const [key, value] of Object.entries(result.details)) {
              lines.push(box.text_line(`${key}: ${value}`, 'left'));
          }
      }
      lines.push(box.bottom_line());

      for (const line of lines) {
          console.log(line);
      }
  }

  print_interactive_header(): void {
      const box = new Box(68, BoxleyStyle.DOUBLE, 'bl', 2);
      const lines: string[] = [];

      lines.push(box.top_line());
      lines.push(box.text_line('OpenSpace Interactive Mode', 'center'));
      lines.push(box.separator_line());
      lines.push(this.colorize('info', 'Type commands below. Type help for commands list.'));
      lines.push(box.bottom_line());

      for (const line of lines) {
          console.log(line);
      }
  }

  print_task_header(query: string, title: string = '▶ Executing Task'): void {

      const box = new Box(68, BoxleyStyle.DOUBLE, 'bl', 2);
      const lines: string[] = [];

      lines.push(box.top_line());
      lines.push(box.text_line(title, 'center'));
      lines.push(box.separator_line());
      lines.push(box.text_line(query, 'center'));
      lines.push(box.bottom_line());

      for (const line of lines) {
          console.log(line);
      }
  }

  print_system_ready(): void {
      const box = new Box(68, BoxleyStyle.DOUBLE, 'bl', 2);
      const lines: string[] = [];

      lines.push(box.top_line());
      lines.push(box.text_line('System Ready', 'center'));
      lines.push(this.colorize('success', 'All subsystems initialized successfully'));
      lines.push(box.bottom_line());

      for (const line of lines) {
          console.log(line);
      }
  }

  print_status(agent: OpenStatus): void {

      const box = new Box(68, BoxleyStyle.DOUBLE, 'bl', 2);
      const lines: string[] = [];

      lines.push(box.top_line());
      lines.push(box.text_line('System Status', 'center'));
      lines.push(box.separator_line());
      lines.push(box.text_line(`Name: ${agent.name}`, 'left'));
      lines.push(box.text_line(`Status: ${this.colorize(agent.status, agent.status)}`, 'left'));
      lines.push(box.text_line(`Uptime: ${agent.uptime}s`, 'left'));
      lines.push(box.text_line(`Tasks: ${agent.tasks}`, 'left'));
      lines.push(box.bottom_line());

      for (const line of lines) {
          console.log(line);
      }
  }

  print_help(): void {
      const box = new Box(68, BoxleyStyle.DOUBLE, 'bl', 2);
      const lines: string[] = [];

      lines.push(box.top_line());
      lines.push(box.text_line('Available Commands', 'center'));
      lines.push(box.separator_line());
      lines.push(box.text_line('help - Show this help message', 'left'));
      lines.push(box.text_line('status - Show system status', 'left'));
      lines.push(box.text_line('config - Show configuration', 'left'));
      lines.push(box.text_line('init - Initialize system', 'left'));
      lines.push(box.text_line('ready - Check system ready', 'left'));
      lines.push(this.colorize('info', 'Use Ctrl+C to exit'));
      lines.push(box.bottom_line());

      for (const line of lines) {
          console.log(line);
      }
  }

  private colorize(type: 'success' | 'failure' | 'info' | 'warning' | 'online' | 'offline' | 'busy' | 'pending', message: string): string {
      switch (type) {
          case 'success':
          case 'online':
              return this.colors.green(message);
          case 'failure':
          case 'offline':
              return this.colors.red(message);
          case 'info':
          case 'pending':
              return this.colors.blue(message);
          case 'warning':
          case 'busy':
              return this.colors.yellow(message);
          default:
              return message;
      }
  }
}
