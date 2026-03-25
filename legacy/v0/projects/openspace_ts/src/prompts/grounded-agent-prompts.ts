import { SkillForgePrompts } from './skill-forge-prompts';

export class GroundedAgentPrompts {
  private readonly agentPrompt: string;
  private readonly groundingPrompt: string;
  private readonly reflectionPrompt: string;
  private readonly actionPrompt: string;

  constructor() {
    this.agentPrompt = `You are a grounded agent operating in a real environment.
Your responses must be based on observable facts and current state.
Always verify assumptions before acting.`;
    
    this.groundingPrompt = `Ground your response in the current context:
- Available tools: {tools}
- Current state: {state}
- Recent observations: {observations}
- Constraints: {constraints}`;
    
    this.reflectionPrompt = `Before taking action, reflect:
1. What is the current state?
2. What are the available options?
3. Which option is most likely to succeed?
4. What are the potential risks?`;
    
    this.actionPrompt = `Execute the planned action with these parameters:
{parameters}
Confirm the expected outcome: {expectedOutcome}`;
  }

  getAgentPrompt(): string {
    return this.agentPrompt;
  }

  getGroundingPrompt(tools: ReadonlyArray<string>, state: string, observations: ReadonlyArray<string>, constraints: string): string {
    const vars = new Map<string, string>([
      ['tools', tools.join(', ')],
      ['state', state],
      ['observations', observations.join('\n')],
      ['constraints', constraints]
    ]);
    return this.renderTemplate(this.groundingPrompt, vars);
  }

  getReflectionPrompt(): string {
    return this.reflectionPrompt;
  }

  getActionPrompt(parameters: Record<string, unknown>, expectedOutcome: string): string {
    const vars = new Map<string, string>([
      ['parameters', JSON.stringify(parameters)],
      ['expectedOutcome', expectedOutcome]
    ]);
    return this.renderTemplate(this.actionPrompt, vars);
  }

  renderTemplate(template: string, vars: Map<string, string>): string {
    let result = template;
    for (const [key, value] of vars) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    return result;
  }
}
