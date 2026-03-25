/**
 * Agent module — orchestration layer for the autonomous research agent.
 */

export {
  TaskScheduler,
  type Task,
  type TaskStatus,
  type TaskCompleteCallback,
  type TaskExecutor,
} from "./task-scheduler";

export {
  FeedbackLoop,
  type IterationRecord,
  type FeedbackProgress,
  type EvaluateFn,
  type RefineFn,
} from "./feedback-loop";

export {
  ResearchAgent,
  type AgentEventType,
  type AgentEvent,
  type AgentEventListener,
  type ResearchOptions,
  type ResearchResult,
} from "./research-agent";
