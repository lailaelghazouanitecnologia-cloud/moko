import { LocalTool } from '../utils';
import { SkillRegistry } from './skill-registry';
import { BackendType } from './backend-type';
import { SkillMeta } from './skill-meta';
import { LLMClient } from '../llm/llm-client';
import { Model } from '../llm/model';
import { SkillQuality } from './skill-quality';

export class RetrieveSkillTool extends LocalTool {
  private readonly registry: SkillRegistry;
  private readonly backend_type: BackendType;

  constructor(
    registry: SkillRegistry,
    backend_type: BackendType = BackendType.SYSTEM
  ) {
    super();
    if (!Object.values(BackendType).includes(backend_type)) {
      throw new RangeError('backend_type must be a valid BackendType value');
    }
    this.registry = registry;
    this.backend_type = backend_type;
  }

  async select_skills_with_llm(
    task: string,
    maxSkills: number = 2
  ): Promise<ReadonlyArray<SkillMeta>> {
    if (!Number.isInteger(maxSkills) || maxSkills <= 0) {
      throw new RangeError('maxSkills must be a positive integer');
    }
    return this.registry.select_skills_with_llm(
      task,
      this.llmClient,
      maxSkills,
      this.model,
      this.skillQuality
    );
  }
}
