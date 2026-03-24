import { Hypothesis } from './hypothesis';
import { EditPlan } from './edit-plan';
import { ExperimentStatus } from './experiment-status';

/**
 * Represents a code test experiment that links a hypothesis to an edit plan
 * and tracks its execution status.
 */
export interface Experiment {
  /**
   * Unique identifier for this experiment.
   * Must be a non-empty string.
   */
  id: string;

  /**
   * The hypothesis being validated by this experiment.
   */
  hypothesis: Hypothesis;

  /**
   * The plan of edits to be applied to the codebase.
   */
  plan: EditPlan;

  /**
   * Current execution status of the experiment.
   */
  status: ExperimentStatus;
}

/**
 * Validates that an object conforms to the Experiment interface.
 * @throws {TypeError} If any required field is missing or invalid.
 */
export function validateExperiment(exp: unknown): asserts exp is Experiment {
  if (typeof exp !== 'object' || exp === null) {
    throw new TypeError('Experiment must be an object');
  }

  const e = exp as Record<string, unknown>;

  if (typeof e.id !== 'string' || e.id.trim().length === 0) {
    throw new TypeError('Experiment.id must be a non-empty string');
  }

  if (typeof e.hypothesis !== 'object' || e.hypothesis === null) {
    throw new TypeError('Experiment.hypothesis is required');
  }

  if (typeof e.plan !== 'object' || e.plan === null) {
    throw new TypeError('Experiment.plan is required');
 }

  if (!Object.values(ExperimentStatus).includes(e.status as ExperimentStatus)) {
    throw new TypeError('Experiment.status must be a valid ExperimentStatus');
  }
}

/**
 * Creates a new Experiment instance with validated inputs.
 * @returns A new Experiment object.
 * @throws {TypeError} If any argument is invalid.
 */
export function createExperiment(
  id: string,
  hypothesis: Hypothesis,
  plan: EditPlan,
  status: ExperimentStatus = ExperimentStatus.Pending
): Experiment {
  const exp: Experiment = { id, hypothesis, plan, status };
  validateExperiment(exp);
  return exp;
}
