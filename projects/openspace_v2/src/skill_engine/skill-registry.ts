import { type SkillMeta, type SkillRanker, type LLMClient, type SkillStore, type LoadData, type CreationMode, type BaseTool, type ToolQualityRecord, type ExecutionAnalysis, type EvolutionContext, type EvolutionSuggestion } from '../utils';
import { EvolutionTrigger } from './index';
import { SkillEvolver } from './skill-evolver';
import { ExecutionAnalyzer } from './execution-analyzer';
import { PatchType } from './patch-type';
import { PatchError } from './patch-error';
import { PatchParseError } from './patch-parse-error';
import { SkillCategory } from './';
import { SkillVisibility } from './';
import { EvolutionType } from './';
import { SkillOrigin } from './';

import { path, fs, createReadStream, createWriteStream } from 'fs';
import { Path } from 'fs';
import { join, isDirectory, readTextFile, exists } from 'fs';

/**
 * Central registry for discovering, loading, ranking, and injecting skills into agent context.
 * Skills are loaded from ordered directories; earlier directories shadow later ones.
 */
export class SkillRegistry {
  private readonly skillDirs: ReadonlyArray<Path>;
  private readonly store: LoadData<SkillStore>;
  private readonly logger: Logger;
  private readonly ranker: SkillRanker;
  private discovered: boolean = false;
  private readonly cache: Map<string, SkillMeta> = new Map();

  constructor(skillDirs: ReadonlyArray<Path>, store: LoadData<SkillStore>, logger: Logger, ranker: SkillRanker) {
    if (!Array.isArray(skillDirs)) throw new TypeError('skillDirs must be an array');
    if (!store || typeof store !== 'object') throw new TypeError('store must be a valid LoadData<SkillStore>');
    if (!logger || typeof logger.debug !== 'function') throw new TypeError('logger must implement Logger interface');
    if (!ranker || typeof ranker.score !== 'function') throw new TypeError('ranker must implement SkillRanker interface');

    this.skillDirs = skillDirs;
    this.store = store;
    this.logger = logger;
    this.ranker = ranker;
  }

  discover(): ReadonlyArray<SkillMeta> {
    if (this.discovered) return Array.from(this.cache.values());
    for (const dir of this.skillDirs) {
      this.registerSkillDir(new Path(dir));
    }
    this.discovered = true;
    return Array.from(this.cache.values());
  }

  listSkills(): ReadonlyArray<SkillMeta> {
    this.ensureDiscovered();
    return Array.from(this.cache.values());
  }

  getSkill(skillId: string): SkillMeta {

  getSkillByName(name: string): SkillMeta {
    throw new RangeError(`Skill ${name} not found`);
  }

  updateSkill(oldSkillId: string, newMeta: SkillMeta): void {

  addSkill(meta: SkillMeta): void {
    if (!meta || typeof meta.id !== 'string') throw new TypeError('meta must be a valid SkillMeta with an id');
    this.logger.debug(`Add new skill: ${meta.id}`);
    this.cache.set(meta.id, meta);
  }

  discoverFromDirs(extraDirs: ReadonlyArray<Path>): ReadonlyArray<SkillMeta> {
    if (!Array.isArray(extraDirs)) throw new TypeError('extraDirs must be an array');
    const newSkills: SkillMeta[] = [];
    for (const dir of extraDirs) {
      if (!isDirectory(new Path(dir))) continue;
      const added = this.registerSkillDir(new Path(dir));
      if (added) newSkills.push(added);
    }
    return newSkills;
  }

  registerSkillDir(skillDir: Path): SkillMeta | null {
    const metaPath = join(skillDir.toString(), 'skill.json');
    if (!exists(metaPath)) {
      this.logger.warn(`Missing skill.json in ${skillDir.toString()}`);
      return null;
    }
    const metaText = readTextFile(metaPath);
    let parsed: SkillMeta;
    try {
      parsed = JSON.parse(metaText) as SkillMeta;
    } catch (err) {
      this.logger.warn(`Invalid skill.json in ${skillDir.toString()}: ${(err as Error).message}`);
      return null;
    }
    this.cache.set(parsed.id, parsed);
    this.logger.info(`Registered skill: ${parsed.name}`);
    return parsed;
  }

  ranker(): SkillRanker {
    return this.ranker;
  }

  async selectSkillsWithLlm(
    taskDescription: string,
    llmClient: LLMClient,
    maxSkills: number = 2,
    model?: string,
    quality?: Record<string, Record<string, unknown>>
  ): Promise<ReadonlyArray<SkillMeta>> {

  loadSkillContent(skillId: string): string {

  buildContextInjection(skills: ReadonlyArray<SkillMeta>, backends?: ReadonlyArray<string>): string {
    if (!Array.isArray(skills)) throw new TypeError('skills must be an array');
    const parts: string[] = [];
    for (const skill of skills) {
      const content = this.loadSkillContent(skill.id);
      const replaced = content.replace(/{{backend}}/g, (backends ?? []).join(',') || 'system');
      parts.push(replaced);
    }
    return parts.join('\n\n');
  }

  private ensureDiscovered(): void {
    if (!this.discovered) this.discover();
  }

  private stripFrontmatter(content: string): string {
    return content.replace(/^---[\s\S]*?---\n*/, '');
  }
}

function checkSkillSafety(dir: Path): { ok: boolean; error?: string } {
  // Stub implementation; replace with actual safety checks
  return { ok: true };
}

interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
}