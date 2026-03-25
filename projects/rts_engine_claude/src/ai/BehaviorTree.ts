/**
 * Behavior tree implementation for AI decision-making.
 *
 * Node types:
 * - Selector: tries children in order, returns success on first success
 * - Sequence: runs children in order, fails on first failure
 * - Condition: evaluates a boolean predicate
 * - Action: executes a game action
 * - Decorator: wraps a child node (inverter, repeater, etc.)
 */

/** Result of evaluating a behavior tree node */
export enum BTStatus {
  Success = 'Success',
  Failure = 'Failure',
  Running = 'Running',
}

/** Context passed to behavior tree nodes during evaluation */
export interface BTContext {
  readonly playerId: number;
  readonly deltaTime: number;
  /** Blackboard for sharing data between nodes */
  readonly blackboard: Map<string, unknown>;
}

/** Base interface for all behavior tree nodes */
export interface BTNode {
  readonly name: string;
  tick(context: BTContext): BTStatus;
}

/**
 * Selector: tries each child in order.
 * Returns Success if any child succeeds, Failure if all fail.
 * Returns Running if a child is running.
 */
export class SelectorNode implements BTNode {
  public readonly name: string;
  private readonly _children: BTNode[];

  constructor(name: string, children: BTNode[]) {
    this.name = name;
    this._children = children;
  }

  tick(context: BTContext): BTStatus {
    for (const child of this._children) {
      const status = child.tick(context);
      if (status !== BTStatus.Failure) {
        return status;
      }
    }
    return BTStatus.Failure;
  }
}

/**
 * Sequence: runs each child in order.
 * Returns Failure if any child fails, Success if all succeed.
 * Returns Running if a child is running.
 */
export class SequenceNode implements BTNode {
  public readonly name: string;
  private readonly _children: BTNode[];

  constructor(name: string, children: BTNode[]) {
    this.name = name;
    this._children = children;
  }

  tick(context: BTContext): BTStatus {
    for (const child of this._children) {
      const status = child.tick(context);
      if (status !== BTStatus.Success) {
        return status;
      }
    }
    return BTStatus.Success;
  }
}

/**
 * Condition: evaluates a predicate.
 * Returns Success if true, Failure if false.
 */
export class ConditionNode implements BTNode {
  public readonly name: string;
  private readonly _predicate: (context: BTContext) => boolean;

  constructor(name: string, predicate: (context: BTContext) => boolean) {
    this.name = name;
    this._predicate = predicate;
  }

  tick(context: BTContext): BTStatus {
    return this._predicate(context) ? BTStatus.Success : BTStatus.Failure;
  }
}

/**
 * Action: performs a game action.
 * Returns the status of the action (may be Running for multi-tick actions).
 */
export class ActionNode implements BTNode {
  public readonly name: string;
  private readonly _action: (context: BTContext) => BTStatus;

  constructor(name: string, action: (context: BTContext) => BTStatus) {
    this.name = name;
    this._action = action;
  }

  tick(context: BTContext): BTStatus {
    return this._action(context);
  }
}

/** Inverter decorator: flips Success/Failure, passes Running through */
export class InverterNode implements BTNode {
  public readonly name: string;
  private readonly _child: BTNode;

  constructor(name: string, child: BTNode) {
    this.name = name;
    this._child = child;
  }

  tick(context: BTContext): BTStatus {
    const status = this._child.tick(context);
    if (status === BTStatus.Success) return BTStatus.Failure;
    if (status === BTStatus.Failure) return BTStatus.Success;
    return BTStatus.Running;
  }
}

/** Repeater decorator: repeats child N times or until failure */
export class RepeaterNode implements BTNode {
  public readonly name: string;
  private readonly _child: BTNode;
  private readonly _maxRepeats: number;

  constructor(name: string, child: BTNode, maxRepeats: number) {
    this.name = name;
    this._child = child;
    this._maxRepeats = maxRepeats;
  }

  tick(context: BTContext): BTStatus {
    for (let i = 0; i < this._maxRepeats; i++) {
      const status = this._child.tick(context);
      if (status === BTStatus.Failure) return BTStatus.Failure;
      if (status === BTStatus.Running) return BTStatus.Running;
    }
    return BTStatus.Success;
  }
}
