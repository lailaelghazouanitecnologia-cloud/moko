import { AgentStatus, BoxStyle, Box, CLIDisplay, Colors, Colors, FlushFileHandler, Logger, OpenSpaceUI, UIIntegration, UILoggingHandler } from '../utils';
import { ActionRecorder } from './action-recorder';
import { VideoRecorder } from './video-recorder';
import { TrajectoryRecorder } from './trajectory-recorder';

type BackendType = 'mcp' | 'gui' | 'shell' | 'system' | 'web';

interface RecordingMetadata {
  readonly taskId: string;
  readonly agentName: string;
  readonly startTime: string;
  readonly backends: ReadonlyArray<BackendType>;
  readonly enableScreenshot: boolean;
  readonly enableVideo: boolean;
  readonly enableConversationLog: boolean;
}

interface ToolExecutionRecord {
  readonly toolName: string;
  readonly backend: string;
  readonly parameters: Record<string, unknown>;
  readonly result: unknown;
  readonly serverName?: string;
  readonly isSuccess: boolean;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp: string;
}

interface AgentActionRecord {
  readonly agentName: string;
  readonly actionType: string;
  readonly inputData?: Record<string, unknown>;
  readonly reasoning?: Record<string, unknown>;
  readonly outputData?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
  readonly relatedToolSteps?: ReadonlyArray<unknown>;
  readonly correlationId?: string;
  readonly timestamp: string;
}

export class RecordingManager {
  private readonly enabled: boolean;
  private readonly taskId: string;
  private readonly logDir: string;
  private readonly backends: ReadonlySet<BackendType>;
  private readonly enableScreenshot: boolean;
  private readonly enableVideo: boolean;
  private readonly enableConversationLog: boolean;
  private readonly autoSaveInterval: number;
  private readonly serverUrl?: string;
  private readonly agentName: string;

  private isRecordingFlag: boolean = false;
  private trajectoryRecorder?: TrajectoryRecorder;
  private actionRecorder?: ActionRecorder;
  private videoRecorder?: VideoRecorder;
  private startTime?: Date;

  constructor(
    enabled: boolean = true,
    taskId: string = '',
    logDir: string = './logs/recordings',
    backends?: ReadonlyArray<string>,
    enableScreenshot: boolean = true,
    enableVideo: boolean = false,
    enableConversationLog: boolean = true,
    autoSaveInterval: number = 10,
    serverUrl?: string,
    agentName: string = 'GroundingAgent'
  ) {
    this.enabled = enabled;
    this.taskId = taskId;
    this.logDir = logDir;
    this.backends = new Set(backends?.filter((b): b is BackendType => 
      ['mcp', 'gui', 'shell', 'system', 'web'].includes(b as BackendType)
    ) as BackendType[]) as ReadonlySet<BackendType>;
    this.enableScreenshot = enableScreenshot;
    this.enableVideo = enableVideo;
    this.enableConversationLog = enableConversationLog;
    this.autoSaveInterval = autoSaveInterval;
    this.serverUrl = serverUrl;
    this.agentName = agentName;
  }

  static isRecording(): boolean {
    return false;
  }

  async recordRetrievedTools(
    taskInstruction: string,
    tools: ReadonlyArray<unknown>,
    searchDebugInfo?: Record<string, unknown>
  ): Promise<void> {
    if (!this.enabled || !this.isRecordingFlag) return;
    
    await this.trajectoryRecorder?.recordStep(
      'system',
      'retrieve_tools',
      taskInstruction,
      { tools, searchDebugInfo },
      undefined,
      undefined,
      { type: 'tool_retrieval' }
    );
  }

  async recordSkillSelection(
    selectionRecord: Record<string, unknown>
  ): Promise<void> {
    if (!this.enabled || !this.isRecordingFlag) return;
    
    await this.trajectoryRecorder?.recordStep(
      'system',
      'skill_selection',
      selectionRecord.skillName as string ?? 'unknown',
      { selectionRecord },
      undefined,
      undefined,
      { type: 'skill_selection' }
    );
  }

  async recordConversationSetup(
    setupMessages: ReadonlyArray<Record<string, unknown>>,
    tools?: ReadonlyArray<unknown>,
    maxContentLength: number = 5000,
    agentName: string = 'GroundingAgent',
    extra?: Record<string, unknown>
  ): Promise<void> {
    if (!this.enabled || !this.isRecordingFlag) return;
    
    const truncatedMessages = setupMessages.map(msg => ({
      ...msg,
      content: typeof msg.content === 'string' && msg.content.length > maxContentLength
        ? msg.content.substring(0, maxContentLength) + '...'
        : msg.content
    }));

    await this.trajectoryRecorder?.recordStep(
      'system',
      'conversation_setup',
      'setup',
      { messages: truncatedMessages, tools, agentName, extra },
      undefined,
      undefined,
      { type: 'conversation_setup' }
    );
  }

  async recordIterationContext(
    iteration: number,
    deltaMessages: ReadonlyArray<Record<string, unknown>>,
    responseMetadata: Record<string, unknown>,
    maxContentLength: number = 5000,
    agentName: string = 'GroundingAgent',
    extra?: Record<string, unknown>
  ): Promise<void> {
    if (!this.enabled || !this.isRecordingFlag) return;
    
    const truncatedMessages = deltaMessages.map(msg => ({
      ...msg,
      content: typeof msg.content === 'string' && msg.content.length > maxContentLength
        ? msg.content.substring(0, maxContentLength) + '...'
        : msg.content
    }));

    await this.trajectoryRecorder?.recordStep(
      'system',
      'iteration_context',
      `iteration_${iteration}`,
      { messages: truncatedMessages, responseMetadata, agentName, extra },
      undefined,
      undefined,
      { type: 'iteration_context', iteration }
    );
  }

  async recordToolExecution(
    toolName: string,
    backend: string,
    parameters: Record<string, unknown>,
    result: unknown,
    serverName?: string,
    isSuccess: boolean = true,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!this.enabled || !this.isRecordingFlag) return;
    
    const record: ToolExecutionRecord = {
      toolName,
      backend,
      parameters,
      result,
      serverName,
      isSuccess,
      metadata,
      timestamp: new Date().toISOString()
    };

    await this.trajectoryRecorder?.recordStep(
      backend,
      toolName,
      JSON.stringify(parameters),
      { result, metadata },
      undefined,
      undefined,
      { type: 'tool_execution', record }
    );
  }

  async start(taskId?: string): Promise<void> {
    if (!this.enabled) return;
    
    const actualTaskId = taskId ?? this.taskId ?? `task_${Date.now()}`;
    this.isRecordingFlag = true;
    this.startTime = new Date();

    this.trajectoryRecorder = new TrajectoryRecorder(
      actualTaskId,
      this.logDir,
      this.enableScreenshot,
      this.enableVideo,
      this.serverUrl
    );

    this.actionRecorder = new ActionRecorder(
      this.trajectoryRecorder.getTrajectoryDir()
    );

    if (this.enableVideo) {
      this.videoRecorder = new VideoRecorder(
        this.trajectoryRecorder.getTrajectoryDir(),
        this.serverUrl
      );
      await this.videoRecorder.start();
    }
  }

  async saveExecutionOutcome(
    status: string,
    iterations: number,
    executionTime: number = 0
  ): Promise<void> {
    if (!this.enabled || !this.isRecordingFlag) return;
    
    await this.trajectoryRecorder?.addMetadata('executionOutcome', {
      status,
      iterations,
      executionTime,
      endTime: new Date().toISOString()
    });
  }

  async stop(): Promise<void> {
    if (!this.enabled || !this.isRecordingFlag) return;
    
    if (this.videoRecorder) {
      await this.videoRecorder.stop();
    }
    
    if (this.trajectoryRecorder) {
      await this.trajectoryRecorder.finalize();
    }
    
    this.isRecordingFlag = false;
  }

  registerToLlm(llmClient: unknown): void {
    if (!this.enabled) return;
  }

  async addMetadata(key: string, value: unknown): Promise<void> {
    if (!this.enabled || !this.isRecordingFlag) return;
    
    await this.trajectoryRecorder?.addMetadata(key, value);
  }

  async savePlan(
    plan: Record<string, unknown>,
    agentName: string = 'GroundingAgent'
  ): Promise<void> {
    if (!this.enabled || !this.isRecordingFlag) return;
    
    await this.trajectoryRecorder?.recordStep(
      'system',
      'plan',
      'plan',
      { plan, agentName },
      undefined,
      undefined,
      { type: 'plan' }
    );
  }

  async logDecision(
    agentName: string,
    decision: string,
    context?: Record<string, unknown>
  ): Promise<void> {
    if (!this.enabled || !this.isRecordingFlag) return;
    
    await this.actionRecorder?.recordAction(
      agentName,
      'decision',
      { decision },
      context,
      undefined,
      { type: 'decision' }
    );
  }

  async recordAgentAction(
    agentName: string,
    actionType: string,
    inputData?: Record<string, unknown>,
    reasoning?: Record<string, unknown>,
    outputData?: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    relatedToolSteps?: ReadonlyArray<unknown>,
    correlationId?: string
  ): Promise<Record<string, unknown>> {
    if (!this.enabled || !this.isRecordingFlag) {
      return { recorded: false };
    }
    
    const record: AgentActionRecord = {
      agentName,
      actionType,
      inputData,
      reasoning,
      outputData,
      metadata,
      relatedToolSteps,
      correlationId,
      timestamp: new Date().toISOString()
    };

    const result = await this.actionRecorder?.recordAction(
      agentName,
      actionType,
      inputData,
      reasoning,
      outputData,
      metadata,
      relatedToolSteps,
      correlationId
    );

    return { recorded: true, record, actionId: result?.actionId };
  }

  async generateSummary(): Promise<Record<string, unknown>> {
    if (!this.enabled || !this.trajectoryRecorder) {
      return { summary: 'No recording available' };
    }

    const trajectoryDir = this.trajectoryRecorder.getTrajectoryDir();
    const stepCount = this.actionRecorder?.getStepCount() ?? 0;
    
    return {
      taskId: this.taskId,
      trajectoryDir,
      stepCount,
      startTime: this.startTime?.toISOString(),
      enabled: this.enabled,
      backends: Array.from(this.backends),
      metadata: this.trajectoryRecorder
    };
  }

  recordingStatus(): boolean {
    return this.isRecordingFlag;
  }

  trajectoryDir(): string {
    return this.trajectoryRecorder?.getTrajectoryDir() ?? this.logDir;
  }

  recordingClient(): unknown {
    return undefined;
  }

  screenshotClient(): unknown {
    return undefined;
  }

  stepCount(): number {
    return this.actionRecorder?.getStepCount() ?? 0;
  }
}