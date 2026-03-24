name: string;
  schedule: ExperimentSpec;
  searchSpace: HyperParameterSpace;
}

export interface ExperimentSpec {
  type: 'linear' | 'exponential' | 'cosine' | 'step';
  steps: number;
  initial: number;
  final?: number;
  decay?: number;
  stepSize?: number;
}

export interface HyperParameterSpace {
  parameters: Map<string, ParameterRange>;
}

export interface ParameterRange {
  type: 'uniform' | 'loguniform' | 'choice';
  min?: number;
  max?: number;
  choices?: any[];
  base?: number;
}

export function validate(spec: ExperimentSpec): boolean {
  if (!spec.name || spec.name.trim().length === 0) {
    return false;
  }
  if (!spec.schedule || !spec.searchSpace) {
    return false;
  }
  if (spec.schedule.steps <= 0) {
    return false;
  }
  if (!spec.searchSpace.parameters || spec.searchSpace.parameters.size === 0) {
    return false;
  }
  return true;
}

export function getExperimentSpec(spec: ExperimentSpec): ExperimentSpec {
  return spec.schedule;
}

export function getSearchSpace(spec: ExperimentSpec): HyperParameterSpace {
  return spec.searchSpace;
}
