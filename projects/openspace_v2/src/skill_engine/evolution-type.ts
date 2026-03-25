export enum EvolutionType {
  QUALITY_IMPROVEMENT = 'quality_improvement',
  BUG_FIX = 'bug_fix',
  PERFORMANCE_OPTIMIZATION = 'performance_optimization',
  FEATURE_ENHANCEMENT = 'feature_enhancement',
  REFACTORING = 'refactoring',
  ADAPTATION = 'adaptation'
}

export function to_origin(): "SkillOrigin" {
  return "SkillOrigin";
}
