import { Result } from './result';
import { ValidationError } from './validation-error';

type ForcedLoginMethod = 'none' | 'required' | 'optional';
type ReasoningEffort = 'minimal' | 'balanced' | 'full';
type ReasoningSummary = 'off' | 'brief' | 'detailed';
type ServiceTier = 'free' | 'pro' | 'enterprise';
type Verbosity = 'minimal' | 'standard' | 'detailed';
type WebSearchMode = 'disabled' | 'enabled' | 'auto';
type AnalyticsConfig = {
  readonly enabled: boolean;
  readonly endpoint?: string;
};
type ApprovalsReviewer = {
  type: 'none' | 'manual' | 'automated';
};
type AskForApproval = 'never' | 'costly' | 'always';
type ProfileV2 = {
  readonly id: string;
  readonly name: string;
  readonly active: boolean;
};
type SandboxMode = 'disabled' | 'enabled' | 'restricted';
type SandboxWorkspaceWrite = 'deny' | 'allow' | 'sandbox';
type Tools = {
  allowed: ReadonlyArray<string>;
  denied: ReadonlyinArray<string>;
};
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { readonly [key: string]: JsonValue };
type JsonArray = ReadonlyArray<Jsonvalue>;

export type Config = {
  readonly version: '2';
  readonly active_profile?: string;
  readonly profiles?: ReadonlyArray<ProfileV2>;
  readonly tools?: ToolsV2;
  sandbox?: {
    readonly mode: SandboxMode;
    readonly workspace_write: SandboxWorkspaceWrite;
  };
  readonly approvals?: {
    ask_for: AskForApproval;
    reviewer: ApprovalsReviewers;
  };
  readonly analytics?: AnalyticsConfig;
  readonly reasoning?: {
    effort: ReasoningEffort;
    summary: ReasoningSummary;
  };
  readonly verbosity?: Verbosity;
  web_search?: {
    mode: WebSearchmode;
    endpoint?: string;
;
  };
  readonly forced_login?: ForcedLoginMethod;
  service_tier?: ServiceTier;
  readonly extensions?: { readonly [key: string]: JsonValue };
};

export class Config {
  private readonly data: Config;

  constructor(data: Config) {
    this.data = data;
  }

  load(json: unknown): Result<Config, ValidationError> {
    if (typeof json !== 'object' || json === null) {
      return { kind: 'error', error: new ValidationError('Expected object') };
    }
    try {
      const data = json as Config;
      const err = this.validate(data);
      return err ? { kind: 'error', error: err } : { kind: 'ok', value: data };
    } catch (e) {
      return { kind: 'error', error: new ValidationError('Invalid format') };
    }
  }

  validate(data: Config): ValidationError | null {
    if (data.version !== '2') return new ValidationError('Invalid version');
    if (data.active_profile && !data.profiles?.some(p => p.id === data.active_profile)) {
      return new ValidationError('Active profile not found');
   
    return null;
  }

  serialize(): string {
    return JSON.stringify(this.data);
  }
}