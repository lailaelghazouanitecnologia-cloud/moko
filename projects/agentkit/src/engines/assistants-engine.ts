import { Engine } from './engine';
import { LocalEngine } from './local-engine';
import { EngineConfig } from './engine-config';

export class AssistantsEngine extends LocalEngine {
  constructor(config: EngineConfig) {
    super(config);
  }
}
