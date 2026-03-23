import { Engine } from './engine';
import { EngineConfig } from './engine-config';

export class LocalEngine implements Engine {
  private _status: 'idle' | 'running' | 'stopped' = 'idle';

  constructor(private config: EngineConfig) {}

  async run(): Promise<void> {
    if (this._status === 'running') {
      throw new Error('Engine is already running');
    }
    this._status = 'running';
  }

  async stop(): Promise<void> {
    if (this._status !== 'running') {
      throw new Error('Engine is not running');
    }
    this._status = 'stopped';
  }

  get status(): 'idle' | 'running' | 'stopped' {
    return this._status;
  }
}
