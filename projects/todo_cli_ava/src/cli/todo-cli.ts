type ParsedCommand = {
  readonly command: string;
  readonly args: ReadonlyArray<string>;
};

type CommandHandler = (args: ReadonlyArray<string>) => void;

export class TodoCLI {
  private readonly commands: Map<string, CommandHandler>;
  private readonly reader: readline.Interface;
  private readonly taskList: TaskList;
  private readonly storage: FileStorage;
  private readonly filter: TaskFilter;
  private readonly sorter: TaskSorter;
  private readonly formatter: TableFormatter;

  constructor(storage: FileStorage, taskList: TaskList) {
    this.storage = storage;
    this.taskList = taskList;
    this.filter = new TaskFilter();
    this.sorter = new TaskSorter(taskList);
    this.formatter = new TableFormatter();
    
    this.commands = new Map<string, CommandHandler>();
    this.reader = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'todo> '
    });

    this.setupCommands();
  }

  private setupCommands(): void {
    this.commands.set('list', this.list.bind(this));
    this.commands.set('add', this.add.bind(this));
    this.commands.set('toggle', this.toggle.bind(this));
    this.commands.set('remove', this.remove.bind(this));
    this.commands.set('help', this.help.bind(this));
    this.commands.set('exit', this.exit.bind(this));
    this.commands.set('quit', this.exit.bind(this));
  }

  async start(): Promise<void> {
    console.log('Welcome to Todo CLI');
    this.help();
    this.reader.prompt();

    this.reader.on('line', (input: string) => {
      const trimmed = input.trim();
      if (trimmed === '') {
        this.reader.prompt();
        return;
      }

      const parsed = this.parse(trimmed);
      this.dispatch(parsed);
      this.reader.prompt();
    });

    this.reader.on('close', () => {
      this.exit();
    });

    return new Promise<void>(() => {});
  }

  parse(input: string): ParsedCommand {
      try {
        const parts = input.trim().split(/\s+/);
        const command = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        return {
          command,
          args: args as ReadonlyArray<string>
        };
      } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to parse: ${message}`);
      }
  }

  dispatch(cmd: ParsedCommand): void {
    const handler = this.commands.get(cmd.command);
    if (handler) {
      handler(cmd.args);
    } else {
      console.log(`Unknown command: ${cmd.command}. Type 'help' for available commands.`);
    }
  }

  list(args: ReadonlyArray<string>): void {
    let tasks = this.taskList.getAllTasks();
    
    if (args.length > 0) {
      const statusFilter = args[0].toLowerCase();
      if (statusFilter === 'completed') {
        tasks = this.taskList.getCompleted();
      } else if (statusFilter === 'pending') {
        tasks = this.taskList.getPending();
      }
    }

    if (tasks.length === 0) {
      console.log('No tasks found.');
      return;
    }

    this.formatter.rows = tasks.map(task => [
      task.id.toString(),
      task.title,
      task.description || '',
      task.priority,
      task.status,
      task.createdAt.toISOString().split('T')[0]
    ]);

    this.formatter.setColumnWidths([5, 20, 30, 8, 10, 10]);
    console.log(this.formatter.format());
  }

  add(args: ReadonlyArray<string>): void {
    if (args.length === 0) {
      console.log('Usage: add <title> [description] [priority]');
      return;
    }

    const title = args[0];
    const description = args[1] || '';
    const priority = (args[2] as 'low' | 'medium' | 'high') || 'medium';

    const task = new Task(
      Date.now().toString() as TaskId,
      title,
      description,
      priority,
      'pending' as TaskStatus,
      new Date()
    );

    this.taskList.addTask(task);
    console.log(`Added task: ${title}`);
  }

  toggle(args: ReadonlyArray<string>): void {
    if (args.length === 0) {
      console.log('Usage: toggle <task-id>');
      return;
    }

    const taskId = args[0] as TaskId;
    const task = this.taskList.getTask(taskId);

    if (!task) {
      console.log(`Task not found: ${taskId}`);
      return;
    }

    if (task.isCompleted()) {
      task.markPending();
      console.log(`Task marked as pending: ${task.title}`);
    } else {
      task.markCompleted();
      console.log(`Task marked as completed: ${task.title}`);
    }
  }

  remove(args: ReadonlyArray<string>): void {
    if (args.length === 0) {
      console.log('Usage: remove <task-id>');
      return;
    }

    const taskId = args[0] as TaskId;
    const task = this.taskList.getTask(taskId);

    if (!task) {
      console.log(`Task not found: ${taskId}`);
      return;
    }

    this.taskList.removeTask(taskId);
    console.log(`Removed task: ${task.title}`);
  }

  help(): void {
    console.log(`
Available commands:
  list [status]     - List all tasks (optionally filter by status: completed/pending)
  add <title> [desc] [priority] - Add a new task
  toggle <id>     - Toggle task completion status
  remove <id>     - Remove a task
  help             - Show this help message
  exit/quit        - Exit the application
    `.trim());
  }

  exit(): void {
    console.log('Goodbye!');
    this.reader.close();
    process.exit(0);
  }
}
