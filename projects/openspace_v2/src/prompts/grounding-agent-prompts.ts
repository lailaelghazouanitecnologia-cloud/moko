export class GroundingAgentPrompts {
  static readonly TASK_COMPLETE = '<COMPLETE>';

  static build_system_prompt(backends?: ReadonlyArray<string>): string {
    const backendSection = backends?.length 
      ? `Available backends: ${backends.join(', ')}`
      : 'No specific backends configured';
    
    return `You are a grounding agent that coordinates between task execution and visual analysis.
Your role is to ensure tasks are completed successfully by leveraging available tools and backends.

${backendSection}

When you determine a task is complete, respond with ${GroundingAgentPrompts.TASK_COMPLETE}.`;
  }

  static iteration_summary(instruction: string, iteration: number, maxIterations: number): string {
    return `Iteration ${iteration}/${maxIterations} for instruction: "${instruction}"
Progress check: evaluating current state against expected outcomes.`;
  }

  static visual_analysis(toolName: string, numScreenshots: number, taskDescription: string = ''): string {
    const desc = taskDescription ? ` for task: "${taskDescription}"` : '';
    return `Visual analysis using ${toolName} with ${numScreenshots} screenshot${numScreenshots === 1 ? '' : 's'}${desc}`;
  }

  static final_summary(instruction: string, iterations: number): string {
    return `Task completion summary for: "${instruction}"
Completed after ${iterations} iteration${iterations === 1 ? '' : 's'}.`;
  }

  static workspace_directory(workspaceDir: string): string {
    return `Workspace directory: ${workspaceDir}`;
  }

  static workspace_matching_files(matchingFiles: ReadonlyArray<string>): string {
    if (matchingFiles.length === 0) return 'No matching files found';
    return `Matching files (${matchingFiles.length}):\n${matchingFiles.map(f => `  - ${f}`).join('\n')}`;
  }

  static workspace_recent_files(totalFiles: number, recentFiles: ReadonlyArray<string>): string {
    return `Recent files (${recentFiles.length}/${totalFiles}):\n${recentFiles.map(f => `  - ${f}`).join('\n')}`;
  }

  static workspace_file_list(files: ReadonlyArray<string>): string {
    if (files.length === 0) return 'Workspace is empty';
    return `Workspace contents (${files.length} files):\n${files.map(f => `  - ${f}`).join('\n')}`;
  }

  static iteration_feedback(iteration: number, llmSummary: string, addGuidance: boolean = true): string {
    const guidance = addGuidance ? '\nConsider adjusting approach based on analysis above.' : '';
    return `Iteration ${iteration} feedback:\n${llmSummary}${guidance}`;
  }
}
