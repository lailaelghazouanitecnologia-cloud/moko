import { SettingsMixin } from './settings-mixin';
import { BackendOpts } from './backend-opts';
import { ShellOpts } from './shell-opts';
import { WebOpts } from './web-opts';
import { GUIOpts } from './gui-opts';
import { SkillQualityOpts } from './skill-quality-opts';
import { GroundingOpts } from './grounding-opts';
import { MCPOpts } from './mcp-opts';
import { SkillSearchOpts } from './skill-search-opts';

export interface SkillOpts {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly tags: ReadonlyArray<string>;
  readonly backend: BackendOpts;
  readonly shell: ShellOpts;
  readonly web: WebOpts;
  readonly gui: GUIOpts;
  readonly mcp: MCPOpts;
  readonly skillSearch: SkillSearchOpts;
  readonly skillQuality: SkillQualityOpts;
  readonly grounding: GroundingOpts;
  readonly enabled: boolean;
  readonly debug: boolean;
}

export class SkillOpts implements SkillOpts {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly tags: ReadonlyArray<string>;
  readonly backend: BackendOpts;
  readonly shell: ShellOpts;
  readonly web: WebOpts;
  readonly gui: GUIOpts;
  readonly mcp: MCPOpts;
  readonly skillSearch: SkillSearchOpts;
  readonly skillQuality: SkillQualityOpts;
  readonly grounding: GroundingOpts;
  readonly enabled: boolean;
  readonly debug: boolean;

  constructor(opts: {
    readonly name: string;
    readonly version: string;
    readonly description: string;
    readonly author: string;
    tags?: string[];
    readonly backend: BackendOpts;
    readonly shell: ShellOpts;
    readonly web: WebOpts;
    readonly gui: GUIOpts;
    readonly mcp: MCPOpts;
    readonly skillSearch: SkillSearchOpts;
    readonly skillQuality: SkillQualityOpts;
    readonly grounding: GroundingOpts;
    enabled?: boolean;
    debug?: boolean;
  }) {
    if (typeof opts.name !== 'string' || !opts.name.trim()) {
      throw new TypeError('name must be a non-empty string');
    }
    if (typeof opts.version !== 'string' || !opts.version.trim()) {
      throw new TypeError('version must be a non-empty string');
    }
    if (typeof opts.description !== 'string' || !opts.description.trim()) {
      throw new TypeError('description must be a non-empty string');
    }
    if (typeof opts.author !== 'string' || !opts.author.trim()) {
      throw new TypeError('author must be a non-empty string');
    }
    if (opts.tags !== undefined && !Array.isArray(opts.tags)) {
      throw new TypeError('tags must be an array of strings');
    }

    this.name = opts.name.trim();
    this.version = opts.version.trim();
    this.description = opts.description.trim();
    this.author = opts.author.trim();
    this.tags = Object.freeze(opts.tags?.map(t => String(t).trim()) ?? []);
    this.backend = opts.backend;
    this.shell = opts.shell;
    this.web = opts.web;
    this.gui = opts.gui;
    this.mcp = opts.mcp;
    this.skillSearch = opts.skillSearch;
    this.skillQuality = opts.skillQuality;
    this.grounding = opts.grounding;
    this.enabled = opts.enabled ?? true;
    this.debug = opts.debug ?? false;
  }

  static fromJSON(data: Record<string, unknown>): SkillOpts {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new TypeError('name must be a non-empty string');
    }
    if (typeof data.version !== 'string' || !data.version.trim()) {
      throw new TypeError('version must be a non-empty string');
    }
    if (typeof data.description !== 'string' || !data.description.trim()) {
      throw new TypeError('description must be a non-empty string');
    }
    if (typeof data.author !== 'string' || !data.author.trim()) {
      throw new TypeError('author must be a non-empty string');
    }
    if (!Array.isArray(data.tags)) {
      throw new TypeError('tags must be an array');
    }
    if (typeof data.backend !== 'object' || data.backend === null) {
      throw new TypeError('backend must be an object');
    }
    if (typeof data.shell !== 'object' || data.shell === null) {
      throw new TypeError('shell must be an object');
    }
    if (typeof data.web !== 'object' || data.web === null) {
      throw new TypeError('web must be an object');
    }
    if (typeof data.gui !== 'object' || data.gui === null) {
      throw new TypeError('gui must be an object');
    }
    if (typeof data.mcp !== 'object' || data.mcp === null) {
      throw new TypeError('mcp must be an object');
    }
    if (typeof data.skillSearch !== 'object' || data.skillSearch === null) {
      throw new TypeError('skillSearch must be an object');
    }
    if (typeof data.skillQuality !== 'object' || data.skillQuality === null) {
      throw new TypeError('skillQuality must be an object');
    }
    if (typeof data.grounding !== 'object' || data.grounding === null) {
      throw new TypeError('grounding must be an object');
    }

    return new SkillOpts({
      name: data.name,
      version: data.version,
      description: data.description,
      author: data.author,
      tags: data.tags as string[],
      backend: BackendOpts.fromJSON(data.backend as Record<string, unknown>),
      shell: ShellOpts.fromJSON(data.shell as Record<string, unknown>),
      web: WebOpts.fromJSON(data.web as Record<string, unknown>),
      gui: GUIOpts.fromJSON(data.gui as Record<string, unknown>),
      mcp: MCPOpts.from(data.mcp),
      skillSearch: SkillSearchOpts.fromJSON(data.skillSearch as Record<string, unknown>),
      skillQuality: SkillQualityOpts.fromJSON(data.skillQuality as Record<string, unknown>),
      grounding: GroundingOpts.fromJSON(data.grounding as Record<string, unknown>),
      enabled: data.enabled as boolean | undefined,
      debug: data.debug as boolean | undefined,
    });
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: this.author,
      tags: this.tags,
      backend: this.backend.toJSON(),
      shell: this.shell.toDict(),
      web: this.web.toJSON(),
      gui: this.gui.toDict(),
      mcp: this.mcp.toJSON(),
      skillSearch: this.skillSearch.toJSON(),
      skillQuality: this.skillQuality.toJSON(),
      grounding: this.grounding.toEnv(),
      enabled: this.enabled,
      debug: this.debug,
    };
  }

  merge(other: Partial<SkillOpts>): SkillOpts {
    return new SkillOpts({
      name: other.name ?? this.name,
      version: other.version ?? this.version,
      description: other.description ?? this.description,
      author: other.author ?? this.author,
      tags: other.tags ?? this.tags,
      backend: other.backend ? this.backend.merge(other.backend) : this.backend,
      shell: other.shell ? this.shell.merge(other.shell) : this.shell,
      web: other.web ? this.web.merge(other.web) : this.web,
      gui: other.gui ? this.gui.merge(other.gui) : this.gui,
      mcp: other.mcp ? this.mcp.merge(other.mcp) : this.mcp,
      skillSearch: other.skillSearch ? this.skillSearch.merge(other.skillSearch) : this.skillSearch,
      skillQuality: other.skillQuality ? this.skillQuality.merge(other.skillQuality) : this.skillQuality,
      grounding: other.grounding ? this.grounding.merge(other.grounding) : this.grounding,
      enabled: other.enabled ?? this.enabled,
      debug: other.debug ?? this.debug,
    });
  }

  validate(): void {
    if (!this.name.trim()) {
      throw new RangeError('name cannot be empty');
    }
    if (!this.version.trim()) {
      throw new RangeError('version cannot be empty');
    }
    if (!this.description.trim()) {
      throw new RangeError('description cannot be empty');
    }
    if (!this.author.trim()) {
      throw new RangeError('author cannot be empty');
    }
    this.backend.validate();
    this.shell.validate();
    this.web.validate();
    this.gui.validate();
    this.mcp.validate();
    this.skillSearch.validate();
    this.skillQuality.validate();
    this.grounding.validate();
  }
}
