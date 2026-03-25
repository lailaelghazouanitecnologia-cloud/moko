import { CommandExecutor } from './command-executor';
import { Config } from '../core';
import { Repository } from '../store';

export class CommandParser {
  private readonly executor: CommandExecutor;

  constructor(repository: Repository, config: Config) {
    this.executor = new CommandExecutor(repository, config);
  }

  parse(input: string): void {
    const parts = input.trim().split(/\s+/);
    const command = parts[0]?.toLowerCase();

    switch (command) {
      case 'add': {
        const title = parts.slice(1).join(' ');
        if (!title) throw new Error('Title required for add command');
        const priority = parts.find((p, i) => parts[i - 1] === '--priority' || p === '-p');
        const priorityValue = priority ? parseInt(priority, 10) : undefined;
        this.executor.executeAdd(title, priorityValue);
        break;
      }
      case 'remove': {
        const id = parts[1];
        if (!id) throw new Error('ID required for remove command');
        this.executor.executeRemove(id);
        break;
      }
      case 'list': {
        this.executor.executeList();
        break;
      }
      case 'filter': {
        const status = parts.find((p, i) => parts[i - 1] === '--status' || p === '-s');
        if (!status) throw new Error('Status required for filter command');
        this.executor.executeFilterByStatus(status);
        break;
      }
      case 'sort': {
        const by = parts[1];
        if (by === 'priority') {
          this.executor.executeSortByPriority();
        } else if (by === 'date') {
          this.executor.executeSortByDate();
        } else {
          throw new Error('Sort must be by priority or date');
        }
        break;
      }
      case 'update': {
        const id = parts[1];
        if (!id) throw new Error('ID required for update command');
        const updates: Record<string, unknown> = {};
        for (let i = 2; i < parts.length; i += 2) {
          const key = parts[i];
          const value = parts[i + 1];
          if (key?.startsWith('--')) {
            const k = key.slice(2);
            updates[k] = value;
          }
        }
        this.executor.executeUpdate(id, updates);
        break;
      }
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }
}
