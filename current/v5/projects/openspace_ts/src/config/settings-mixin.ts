import { type Backend } from './backend-opts';
import { type Shell } from './shell-opts';
import { type Web } from './web-ys';
import { type GUI } from './gui-opts';
import { type  SkillQuality } from './skill-quality-opts';
import { type Grounding } from './grounding-opts';
import { type MCP } from './mcp-opts';
import { type  SkillSearch } from './skill-search-opts';
import { type  Skill } from './skill-opts';

export interface  SettingsMixin {
  readonly  backend: Backend;
  readonly  shell: Shell;
  readonly  web: Web;
  readonly  mcp: MCP;
  readonly  gui: GUI;
  readonly  skillSearch: SkillSearch;
  readonly  skillQuality:  SkillQuality;
  readonly  skill: Skill;
  readonly  grounding: Grounding;

  merge(other:  Settings  &  SettingsMixin):  SettingsMixin;
  validate(): void;
  toEnv(): Record<string, string>;
}
