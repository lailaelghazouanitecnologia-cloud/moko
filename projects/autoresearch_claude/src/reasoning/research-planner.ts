/**
 * Research Planner — plans and manages research steps with dependency resolution.
 */

export type StepType = "search" | "extract" | "analyze" | "synthesize";
export type StepStatus = "pending" | "ready" | "in_progress" | "completed" | "blocked";

export interface Step {
  id: string;
  description: string;
  type: StepType;
  dependencies: string[];
  status: StepStatus;
  urgency: number;   // 0–1
  importance: number; // 0–1
  children: string[];
  result?: unknown;
}

export interface PlanTree {
  rootId: string;
  steps: Map<string, Step>;
}

/**
 * Manages a tree-structured research plan with dependency-aware scheduling.
 */
export class ResearchPlanner {
  public goals: string[] = [];
  public currentPlan: PlanTree | null = null;
  public completedSteps: Step[] = [];

  private idCounter = 0;

  private generateId(): string {
    return `step_${++this.idCounter}_${Date.now().toString(36)}`;
  }

  /**
   * Creates a full research plan for a topic at the given depth.
   * Depth controls how many decomposition layers are generated.
   */
  createPlan(topic: string, depth: number = 2): PlanTree {
    this.goals = [topic];

    const rootId = this.generateId();
    const root: Step = {
      id: rootId,
      description: `Research: ${topic}`,
      type: "synthesize",
      dependencies: [],
      status: "pending",
      urgency: 1.0,
      importance: 1.0,
      children: [],
    };

    const steps = new Map<string, Step>();
    steps.set(rootId, root);

    this.currentPlan = { rootId, steps };

    // Build out the plan tree to the requested depth
    this.expandStep(rootId, topic, depth);
    this.refreshAllStatuses();

    return this.currentPlan;
  }

  /**
   * Recursively expands a step into sub-steps down to the given depth.
   */
  private expandStep(parentId: string, topic: string, depth: number): void {
    if (depth <= 0 || !this.currentPlan) return;

    const subGoals = this.decompose(topic);
    const childIds: string[] = [];

    for (const sub of subGoals) {
      const step = this.createStepForGoal(sub, parentId);
      this.currentPlan.steps.set(step.id, step);
      childIds.push(step.id);
    }

    const parent = this.currentPlan.steps.get(parentId)!;
    parent.children = childIds;
    // Parent depends on all children completing
    parent.dependencies = childIds;

    // Recurse for analyze/synthesize steps only (leaf search/extract steps don't expand)
    if (depth > 1) {
      for (const childId of childIds) {
        const child = this.currentPlan.steps.get(childId)!;
        if (child.type === "analyze" || child.type === "synthesize") {
          this.expandStep(childId, child.description, depth - 1);
        }
      }
    }
  }

  /**
   * Decomposes a high-level goal into concrete sub-goals.
   * Returns an ordered list of sub-goal descriptions.
   */
  decompose(goal: string): string[] {
    // Produce a canonical research decomposition:
    // 1. Search for foundational information
    // 2. Extract key data points
    // 3. Search for supporting/contrasting views
    // 4. Extract comparative data
    // 5. Analyze the gathered material
    return [
      `Search for foundational information on: ${goal}`,
      `Extract key claims and data from foundational sources on: ${goal}`,
      `Search for alternative perspectives on: ${goal}`,
      `Extract comparative data on: ${goal}`,
      `Analyze and synthesize findings on: ${goal}`,
    ];
  }

  /**
   * Creates a Step from a sub-goal description, inferring the type from keywords.
   */
  private createStepForGoal(description: string, _parentId: string): Step {
    const lower = description.toLowerCase();
    let type: StepType = "search";
    if (lower.startsWith("extract")) type = "extract";
    else if (lower.startsWith("analyze") || lower.startsWith("synthesize")) type = "analyze";
    else if (lower.startsWith("search")) type = "search";

    return {
      id: this.generateId(),
      description,
      type,
      dependencies: [],
      status: "pending",
      urgency: 0.5,
      importance: 0.5,
      children: [],
    };
  }

  /**
   * Scores and sorts steps by a combined urgency + importance metric.
   * Uses an Eisenhower-matrix-inspired weighted score:
   *   score = urgency * wU + importance * wI + dependency_bonus
   *
   * A dependency bonus is added when a step is blocking many others.
   */
  prioritize(steps: Step[]): Step[] {
    if (!this.currentPlan) return steps;

    const wU = 0.4;
    const wI = 0.4;
    const wBlock = 0.2;

    // Count how many other steps each step is blocking
    const blockCounts = new Map<string, number>();
    for (const step of this.currentPlan.steps.values()) {
      for (const depId of step.dependencies) {
        blockCounts.set(depId, (blockCounts.get(depId) ?? 0) + 1);
      }
    }

    const maxBlock = Math.max(1, ...blockCounts.values());

    const scored = steps.map((step) => {
      const blockingScore = (blockCounts.get(step.id) ?? 0) / maxBlock;
      const score = step.urgency * wU + step.importance * wI + blockingScore * wBlock;
      return { step, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.step);
  }

  /**
   * Returns the next step to work on: the highest-priority step whose
   * dependencies are all completed.
   */
  nextStep(): Step | null {
    if (!this.currentPlan) return null;

    this.refreshAllStatuses();

    const ready = Array.from(this.currentPlan.steps.values()).filter(
      (s) => s.status === "ready"
    );

    if (ready.length === 0) return null;

    const prioritized = this.prioritize(ready);
    const chosen = prioritized[0];
    chosen.status = "in_progress";
    return chosen;
  }

  /**
   * Marks a step as completed and propagates status changes.
   */
  markComplete(stepId: string, result?: unknown): void {
    if (!this.currentPlan) return;

    const step = this.currentPlan.steps.get(stepId);
    if (!step) return;

    step.status = "completed";
    step.result = result;
    this.completedSteps.push(step);

    this.refreshAllStatuses();
  }

  /**
   * Re-plans by adjusting urgency/importance based on completed findings.
   * Steps whose siblings have been completed get urgency boosts (momentum).
   * Steps of type "analyze" or "synthesize" get importance boosts when
   * more of their dependencies are satisfied.
   */
  replan(): void {
    if (!this.currentPlan) return;

    const completedIds = new Set(
      this.completedSteps.map((s) => s.id)
    );

    for (const step of this.currentPlan.steps.values()) {
      if (step.status === "completed") continue;

      // Boost urgency based on fraction of dependencies already completed
      if (step.dependencies.length > 0) {
        const completedDeps = step.dependencies.filter((d) => completedIds.has(d)).length;
        const fraction = completedDeps / step.dependencies.length;
        // Urgency increases as more deps are done — the step is "almost ready"
        step.urgency = Math.min(1.0, step.urgency + fraction * 0.3);
      }

      // Importance boost for synthesis/analysis steps when evidence is accumulating
      if (step.type === "analyze" || step.type === "synthesize") {
        const totalCompleted = this.completedSteps.length;
        const totalSteps = this.currentPlan.steps.size;
        const progress = totalCompleted / Math.max(1, totalSteps);
        step.importance = Math.min(1.0, step.importance + progress * 0.2);
      }
    }

    this.refreshAllStatuses();
  }

  /**
   * Refreshes the status of every step based on dependency resolution.
   * - "completed" stays completed.
   * - "in_progress" stays in_progress.
   * - If all dependencies are completed -> "ready".
   * - If any dependency is blocked -> "blocked".
   * - Otherwise -> "pending".
   */
  private refreshAllStatuses(): void {
    if (!this.currentPlan) return;

    for (const step of this.currentPlan.steps.values()) {
      if (step.status === "completed" || step.status === "in_progress") continue;

      if (step.dependencies.length === 0) {
        step.status = "ready";
        continue;
      }

      const depStatuses = step.dependencies.map(
        (id) => this.currentPlan!.steps.get(id)?.status ?? "pending"
      );

      if (depStatuses.every((s) => s === "completed")) {
        step.status = "ready";
      } else if (depStatuses.some((s) => s === "blocked")) {
        step.status = "blocked";
      } else {
        step.status = "pending";
      }
    }
  }

  /**
   * Returns all steps in the plan as a flat array.
   */
  allSteps(): Step[] {
    if (!this.currentPlan) return [];
    return Array.from(this.currentPlan.steps.values());
  }

  /**
   * Returns the fraction of steps that are completed (0–1).
   */
  progress(): number {
    if (!this.currentPlan) return 0;
    const total = this.currentPlan.steps.size;
    if (total === 0) return 0;
    const done = Array.from(this.currentPlan.steps.values()).filter(
      (s) => s.status === "completed"
    ).length;
    return done / total;
  }
}
