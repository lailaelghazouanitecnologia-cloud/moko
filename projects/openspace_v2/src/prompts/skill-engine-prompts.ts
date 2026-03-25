/**
 * Central registry of prompts used by the skill engine.
 * Provides formatted prompt templates for various skill evolution and analysis operations.
 */
export class SkillEnginePrompts {
  static readonly EVOLUTION_COMPLETE = '<EVOLUTION_COMPLETE>';
  static readonly EVOLUTION_FAILED = '<EVOLUTION_FAILED>';

  static evolution_fix(params: {
    current_content: string;
    direction: string;
    failure_context: string;
    tool_issue_summary?: string;
    metric_summary?: string;
  }): string {
    SkillEnginePrompts.validateRequiredStrings(
      { name: 'current_content', value: params.current_content },
      { name: 'direction', value: params.direction },
      { name: 'failure_context', value: params.failure_context }
    );

    return `[
      Current Content:
      ${params.current_content}

      Direction:
      ${params.direction}

      Failure Context:
      ${params.failure_context}

      Tool Issue Summary:
      ${params.tool_issue_summary ?? ''}

      Metric Summary:
      ${params.metric_summary ?? ''}
      ]
    `.trim();
  }

  static evolution_derived(params: {
    parent_content: string;
    direction: string;
    execution_insights: string;
    metric_summary?: string;
  }): string {
    SkillEnginePrompts.validateRequiredStrings(
      { name: 'parent_content', value: params.parent_content },
      { name: 'direction', value: params.direction },
      { name: 'execution_insights', value: params.execution_insights }
    );

    return `[
      Parent Content:
      ${params.parent_content}

      Direction:
      ${params.direction}

      Execution Insights:
      ${params.execution_insights}

      Metric Summary:
      ${params.metric_summary ?? ''}
      ]
    `.trim();
  }

  static evolution_captured(params: {
    direction: string;
    category: string;
    execution_highlights: string;
  }): string {
    SkillEnginePrompts.validateRequiredStrings(
      { name: 'direction', value: params.direction },
      { name: 'category', value: params.category },
      { name: 'execution_highlights', value: params.execution_highlights }
    );

    return `[
      Direction:
      ${params.direction}

      Category:
      ${params.category}

      Execution Highlights:
      ${params.execution_highlights}
      ]
    `.trim();
  }

  static evolution_confirm(params: {
    skill_id: string;
    skill_content: string;
    proposed_type: string;
    proposed_direction: string;
    trigger_context: string;
    recent_analyses: string;
  }): string {
    SkillEnginePrompts.validateRequiredStrings(
      { name: 'skill_id', value: params.skill_id },
      { name: 'skill_content', value: params.skill_content },
      { name: 'proposed_type', value: params.proposed_type },
      { name: 'proposed_direction', value: params.proposed_direction },
      { name: 'trigger_context', value: params.trigger_context },
      { name: 'recent_analyses', value: params.recent_analyses }
    );

    return `[
      Existing Skill ID:
      ${params.skill_id}

      Existing Skill Content:
      ${params.skill_content}

      Pro Type:
      ${params.proposed_type}

      Pro Direction:
      ${params.proposed_direction}

      Trigger Context:
      ${params.trigger_context}

      Recent Analyses:
      ${params.recent_analyses}
      ]
    `.trim();
  }

  static execution_analysis(params: {
    task_description: string;
    execution_status: string;
    iterations: number;
    tool_list: string;
    skill_section: string;
    conversation_log: string;
    traj_summary: string;
    selected_skill_ids_json: string;
    resource_info?: string;
  }): string {
    SkillEnginePrompts.validateRequiredStrings(
      { name: 'task_description', value: params.task_description },
      { name: 'execution_status', value: params.execution_status },
      { name: 'tool_list', value: params.tool_list },
      { name: 'skill_section', value: params.skill_section },
      { name: 'conversation_log', value: params.conversation_log },
      { name: 'traj_summary', value: params.traj_summary },
      { name: 'selected_skill_ids_json', value: params.selected_skill_ids_json }
    );

    if (!Number.isInteger(params.iterations) || params.iterations < 0) {
      throw new RangeError('iterations must be a non-negative integer');
    }

    return `[
      Task Description:
      ${params.task_description}

      Execution Status:
      ${params.execution_status}

      Iterations:
      ${params.iterations}

      Tool List:
      ${params.tool_list}

      Skill Section:
      ${params.skill_section}

      Conversation Log:
      ${params.conversation_log}

      Trajectory Summary:
      ${params.traj_summary}

      Selected Skill IDs (JSON):
      ${params.selected_skill_ids_json}

      Resource Info:
      ${params.resource_info ?? ''}
      ]
    `.trim();
  }

  private static validateRequiredStrings(
    ...fields: Array<{ name: string; value: unknown }>
  ): void {
    for (const field of fields) {
      if (typeof field.value !== 'string' || field.value.trim().length === 0) {
        throw new TypeError(`${field.name} must be a non-empty string`);
      }
    }
  }
}
