export class SkillForgePrompts {
  private readonly skillEvolutionPrompt: string;
  private readonly patchGenerationPrompt: string;
  private readonly validationPrompt: string;
  private readonly rollbackPrompt: string;

  constructor() {
    this.skillEvolutionPrompt = `You are an expert code evolution assistant. Given the current skill implementation and context, generate an evolved version that improves performance, readability, and maintainability while preserving exact functionality.

Skill: {skill}
Context: {context}

Requirements:
- Preserve all public APIs
- Maintain backward compatibility
- Add comprehensive error handling
- Include performance optimizations
- Add inline documentation
- Follow established patterns

Output only the evolved skill code without explanations.`;
    
    this.patchGenerationPrompt = `Generate a minimal patch to update the skill from its current state to the target state.

Skill: {skill}
Diff: {diff}

Requirements:
- Create minimal, targeted changes
- Preserve existing functionality
- Follow established conventions
- Include proper error handling
- Maintain type safety

Output only the patch code without explanations.`;
    
    this.validationPrompt = `Validate that the skill implementation correctly handles the test scenario.

Skill: {skill}
Test: {test}

Requirements:
- Verify all edge cases are handled
- Confirm error paths work correctly
- Validate performance characteristics
- Check for memory leaks
- Ensure thread safety where applicable

Output a concise validation report.`;
    
    this.rollbackPrompt = `Generate a rollback implementation to revert the skill to a previous version.

Skill: {skill}
Version: {version}

Requirements:
- Restore exact previous behavior
- Preserve data integrity
- Handle migration rollback
- Maintain compatibility
- Include safety checks

Output only the rollback code without explanations.`;
  }

  getSkillEvolutionPrompt(skill: string, context: string): string {
    return this.renderTemplate(this.skillEvolutionPrompt, new Map([
      ['skill', skill],
      ['context', context]
    ]));
  }

  getPatchPrompt(skill: string, diff: string): string {
    return this.renderTemplate(this.patchGenerationPrompt, new Map([
      ['skill', skill],
      ['diff', diff]
    ]));
  }

  getValidationPrompt(skill: string, test: string): string {
    return this.renderTemplate(this.validationPrompt, new Map([
      ['skill', skill],
      ['test', test]
    ]));
  }

  getRollbackPrompt(skill: string, version: string): string {
    return this.renderTemplate(this.rollbackPrompt, new Map([
      ['skill', skill],
      ['version', version]
    ]));
  }

  renderTemplate(template: string, vars: Map<string, string>): string {
    let result = template;
    for (const [key, value] of vars) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }
}
