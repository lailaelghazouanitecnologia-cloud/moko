import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AgentStatus, BoxStyle, Box, CLIDisplay, Colors, Colors, FlushFileHandler, Logger, OpenSpaceUI, UIIntegration, UILoggingHandler } from '../utils';
import { ActionRecorder } from './action-recorder';
import { RecordingManager } from './recording-manager';
import { VideoRecorder } from './video-recorder';
import { RecordingViewer } from './recording-viewer';

type StepRecord = {
  readonly backend: string;
  readonly tool: string;
  readonly command: string;
  readonly result?: Record<string, unknown>;
  readonly parameters?: Record<string, unknown>;
  readonly screenshot?: string;
  readonly extra?: Record<string, unknown>;
  readonly auto_screenshot: boolean;
  readonly timestamp: string;
};

type Metadata = {
  readonly task_name: string;
  readonly start_time: string;
  readonly enable_screenshot: boolean;
  readonly enable_video: boolean;
  [key: string]: unknown;
};

export class TrajectoryRecorder {
  private readonly trajectory_dir: string;
  private readonly screenshots_dir: string;
  private readonly task_name: string;
  private readonly enable_screenshot: boolean;
  private readonly enable_video: boolean;
  private readonly server_url?: string;
  private readonly steps: StepRecord[];
  private readonly metadata: Metadata;

  constructor(
    task_name: string = '',
    log_dir: string = './logs/trajectories',
    enable_screenshot: boolean = true,
    enable_video: boolean = false,
    server_url?: string
  ) {
    if (server_url !== undefined && typeof server_url !== 'string') {
      throw new TypeError('server_url must be a string or undefined');
    }

    this.task_name = task_name;
    this.enable_screenshot = enable_screenshot;
    this.enable_video = enable_video;
    this.server_url = server_url;
    this.trajectory_dir = join(log_dir, task_name || 'default');
    this.screenshots_dir = join(this.trajectory_dir, 'screenshots');
    this.steps = [];
    this.metadata = {
      task_name,
      start_time: new Date().toISOString(),
      enable_screenshot,
      enable_video,
    };

    if (!existsSync(this.trajectory_dir)) {
      mkdirSync(this.trajectory_dir, { recursive: true });
    }
    if (!existsSync(this.screenshots_dir)) {
      mkdirSync(this.screenshots_dir, { recursive: true });
    }
  }

  async record_step(
    backend: string,
    tool: string,
    command: string,
    result?: Record<string, unknown>,
    parameters?: Record<string, unknown>,
    screenshot?: Uint8Array,
    extra?: Record<string, unknown>,
    auto_screenshot: boolean = false
  ): Promise<Record<string, unknown>> {
    if (result !== undefined && (typeof result !== 'object' || result === null)) {
      throw new TypeError('result must be an object or undefined');
    }
    if (parameters !== undefined && (typeof parameters !== 'object' || parameters === null)) {
      throw new TypeError('parameters must be an object or undefined');
    }
    if (screenshot !== undefined && !(screenshot instanceof Uint8Array)) {
      throw new TypeError('screenshot must be a Uint8Array or undefined');
    }
    if (extra !== undefined && (typeof extra !== 'object' || extra === null)) {
      throw new TypeError('extra must be an object or undefined');
    }

    const timestamp = new Date().toISOString();
    let screenshot_path: string | undefined;

    if (screenshot && this.enable_screenshot) {
      const filename = `step_${this.steps.length + 1}.png`;
      screenshot_path = join(this.screenshots_dir, filename);
      writeFileSync(screenshot_path, screenshot);
    }

    const step: StepRecord = {
      backend,
      tool,
      command,
      result,
      parameters,
      screenshot: screenshot_path,
      extra,
      auto_screenshot,
      timestamp,
    };

    this.steps.push(step);
    return { step_id: this.steps.length, timestamp };
  }

  async save_init_screenshot(screenshot: Uint8Array, filename: string = 'init.png'): Promise<void> {
    if (!this.enable_screenshot) return;
    const path = join(this.screenshots_dir, filename);
    writeFileSync(path, screenshot);
  }

  async start_video_recording(): Promise<void> {
    if (!this.enable_video) return;
  }

  async stop_video_recording(): Promise<void> {
    if (!this.enable_video) return;
  }

  async add_metadata(key: string, value: unknown): Promise<void> {
    (this.metadata as Record<string, unknown>)[key] = value;
  }

  async finalize(): Promise<void> {
    const trajectory = {
      metadata: this.metadata,
      steps: this.steps,
    };
    const trajectory_file = join(this.trajectory_dir, 'trajectory.json');
    writeFileSync(trajectory_file, JSON.stringify(trajectory, null, 2));
  }

  get_trajectory_dir(): string {
    return this.trajectory_dir;
  }
}