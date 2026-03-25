import { AgentStatus, BoxStyle, Box, CLIDisplay, Colors, Colors, FlushFileHandler, Logger, OpenSpaceUI, UIIntegration, UILoggingHandler } from '../utils';
import { promises as fs } from 'fs';
import { join } from 'path';

type ActionRecord = {
  readonly timestamp: string;
  readonly agent_name: string;
  readonly action_type: string;
  readonly input_data?: Record<string, unknown>;
  readonly reasoning?: Record<string, unknown>;
  readonly output_data?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
  readonly related_tool_steps?: ReadonlyArray<string>;
  readonly correlation_id?: string;
};

export class ActionRecorder {
  private readonly trajectory_dir: string;
  private readonly actions_file: string;
  private step_count: number = 0;

  constructor(trajectory_dir: string = 'trajectory_dir') {
    if (trajectory_dir.trim().length === 0) {
      throw new RangeError('trajectory_dir cannot be empty');
    }
    this.trajectory_dir = trajectory_dir;
    this.actions_file = join(trajectory_dir, 'agent_actions.jsonl');
  }

  async record_action(
    agent_name: string,
    action_type: string,
    input_data?: Record<string, unknown>,
    reasoning?: Record<string, unknown>,
    output_data?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    related_tool_steps?: ReadonlyArray<string>,
    correlation_id?: string
  ): Promise<Record<string, unknown>> {
    if (agent_name.trim().length === 0) {
      throw new RangeError('agent_name cannot be empty');
    }
    if (action_type.trim().length === 0) {
      throw new RangeError('action_type cannot be empty');
    }

    const record: ActionRecord = {
      timestamp: new Date().toISOString(),
      agent_name,
      action_type,
      input_data,
      reasoning,
      output_data,
      metadata,
      related_tool_steps,
      correlation_id
    };

    const line = JSON.stringify(record) + '\n';
    await fs.mkdir(this.trajectory_dir, { recursive: true });
    await fs.appendFile(this.actions_file, line, 'utf8');

    this.step_count++;
    return { ...record, step: this.step_count };
  }

  get_step_count(): number {
    return this.step_count;
  }
}