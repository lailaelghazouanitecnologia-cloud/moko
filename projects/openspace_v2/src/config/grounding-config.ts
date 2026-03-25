import { ConfigMixin } from './config-mixin';
import { BackendConfig } from './backend-config';
import { ShellConfig } from './shell-config';
import { WebConfig } from './web-config';
import { MCPConfig } from './mcp-config';
import { GUIConfig } from './gui-config';
import { ToolSearchConfig } from './tool-search-config';
import { ToolQualityConfig } from './tool-quality-config';
import { SkillConfig } from './skill-config';

export type SecurityPolicy = Record<string, unknown>;

export interface SessionConfig {
  readonly timeout: number;
  readonly maxRetries: number;
  readonly retryInterval: number;
}

export class GroundingConfig extends ConfigMixin {
  readonly shell: ShellConfig;
  readonly web: WebConfig;
  readonly mcp: MCPConfig;
  readonly gui: GUIConfig;
  readonly system: BackendConfig;
  readonly toolSearch: ToolSearchConfig;
  readonly toolQuality: ToolQualityConfig;
  readonly skills: SkillConfig;
  readonly enabledBackends: ReadonlyArray<Record<string, string>>;
  readonly sessionDefaults: SessionConfig;
  readonly toolCacheTtl: number;
  readonly toolCacheMaxsize: number;
  readonly debug: boolean;
  readonly logLevel: string;
  readonly securityPolicies: Record<string, SecurityPolicy>;

  constructor(config: Record<string, unknown> = {}) {
    super(config);

    this.shell = new ShellConfig(this.get_value('shell', {}) as Record<string, unknown>);
    this.web = new WebConfig(this.get_value('web', {}) as Record<string, unknown>);
    this.mcp = new MCPConfig(this.get_value('mcp', {}) as Record<string, unknown>);
    this.gui = new GUIConfig(this.get_value('gui', {}) as Record<string, unknown>);
    this.system = new BackendConfig(this.get_value('system', {}) as Record<string, unknown>);
    this.toolSearch = new ToolSearchConfig(this.get_value('tool_search', {}) as Record<string, unknown>);
    this.toolQuality = new ToolQualityConfig(this.get_value('tool_quality', {}) as Record<string, unknown>);
    this.skills = new SkillConfig(this.get_value('skills', {}) as Record<string, unknown>);
    
    const backends = this.get_value('enabled_backends', []) as Record<string, string>[];
    this.enabledBackends = Object.freeze(backends.map(b => Object.freeze({ ...b })));

    const sessionDefaults = this.get_value('session_defaults', {}) as Record<string, unknown>;
    this.sessionDefaults = {
      timeout: sessionDefaults.timeout as number ?? 30,
      maxRetries: sessionDefaults.max_retries as number ?? 3,
      retryInterval: sessionDefaults.retry_interval as number ?? 1
    };

    this.toolCacheTtl = this.get_value('tool_cache_ttl', 3600) as number;
    this.toolCacheMaxsize = this.get_value('tool_cache_maxsize', 1000) as number;
    this.debug = this.get_value('debug', false) as boolean;
    this.logLevel = GroundingConfig.validate_log_level(this.get_value('log_level', 'INFO'));
    this.securityPolicies = this.get_value('security_policies', {}) as Record<string, SecurityPolicy>;
  }

  static validate_log_level(v: unknown): string {
    const level = String(v).toUpperCase();
    const validLevels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    return validLevels.includes(level) ? level : 'INFO';
  }

  get_backend_config(backend_type: string): BackendConfig {
    if (backend_type.trim().length === 0) {
      throw new RangeError('backend_type must be a non-empty string');
    }
    const configs: Record<string, BackendConfig> = {
      shell: this.shell,
      web: this.web,
      mcp: this.mcp,
      gui: this.gui,
      system: this.system
    };
    return configs[backend_type] ?? this.system;
  }

  get_security_policy(backend_type: string): SecurityPolicy {
    if (backend_type.trim().length === 0) {
      throw new RangeError('backend_type must be a non-empty string');
    }
    return this.securityPolicies[backend_type] ?? {};
  }
}
