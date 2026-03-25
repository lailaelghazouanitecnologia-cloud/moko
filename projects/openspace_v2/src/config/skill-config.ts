import { ConfigMixin } from './config-mixin';

export interface SkillConfigInput {
  enabled?: boolean;
  skill_dirs?: ReadonlyArray<string>;
  max_select?: number;
}

/**
 * Skill engine configuration.
 * Controls how skills are discovered, selected and injected.
 * Built-in skills (`openspace/skills/`) are always auto-discovered.
 */
export class SkillConfig extends ConfigMixin {
  readonly enabled: boolean;
  readonly skill_dirs: ReadonlyArray<string>;
  readonly max_select: number;

  constructor(config: SkillConfigInput = {}) {
    super(config as Record<string, unknown>);
    this.enabled = this.parseBoolean(config.enabled, 'enabled') ?? true;
    this.skill_dirs = this.parseStringArray(config.skill_dirs, 'skill_dirs') ?? ['openspace/skills/'];
    this.max_select = this.parsePositiveInt(config.max_select, 'max_select') ?? 5;
  }

  with(partial: Partial<SkillConfigInput>): SkillConfig {
    return new SkillConfig({
      enabled: partial.enabled ?? this.enabled,
      skill_dirs: partial.skill_dirs ?? this.skill_dirs,
      max_select: partial.max_select ?? this.max_select,
    });
  }

  validate(): void {
    if (this.max_select <= 0) {
      throw new RangeError('max_select must be a positive integer');
    }
    if (this.skill_dirs.length === 0) {
      throw new Error('skill_dirs cannot be empty');
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      skill_dirs: this.skill_dirs,
      max_select: this.max_select,
    };
  }

  private parseBoolean(value: unknown, field: string): boolean | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    throw new TypeError(`Invalid boolean value for ${field}: ${value}`);
  }

  private parseStringArray(value: unknown, field: string): ReadonlyArray<string> | undefined {
    if (value === undefined) return undefined;
    if (Array.isArray(value) && value.every(item => typeof item === 'string')) return value;
    throw new TypeError(`Invalid string array for ${field}: ${value}`);
  }

  private parsePositiveInt(value: unknown, field: string): number | undefined {
    if (value === undefined) return undefined;
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    throw new TypeError(`Invalid positive integer for ${field}: ${value}`);
  }

  static fromJSON(json: Record<string, unknown>): SkillConfig {
    return new SkillConfig({
      enabled: json.enabled as boolean | undefined,
      skill_dirs: json.skill_dirs as ReadonlyArray<string> | undefined,
      max_select: json.max_select as number | undefined,
    });
  }
}
