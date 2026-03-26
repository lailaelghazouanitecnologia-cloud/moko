import { type BackendType } from './backends';

export interface MCPOpts extends Settings {
  server: {
    name: string;
    version: string;
    description: string;
  };
  transport: 'stdio' | 'websocket' | 'http';
  auth: {
    type: 'none' | 'static' | 'dynamic';
    token?: string;
    endpoint?: string;
  };
  limits: {
    maxTools: number;
    maxCallsPerMinute: number;
    maxConcurrentCalls: number;
  };
  features: {
    enableTools: boolean;
    enableResources: boolean;
    enablePrompts: boolean;
    enableSampling: boolean;
  };
  overrides: {
    toolPrefix?: string;
    resourcePrefix?: string;
    promptPrefix?: string;
  };
}

export class MCPOpts implements Settings {
  constructor(
    private readonly server: {
      name: string;
      version: string;
      description: string;
    },
    private readonly transport: 'stdio' | 'websocket' | 'http',
    private readonly auth: {
      type: 'none' | 'static' | 'dynamic';
      token?: string;
      endpoint?: string;
    },
    private readonly limits: {
      maxTools: number;
      maxCallsPerMinute: number;
      maxConcurrentCalls: number;
    },
    private readonly features: {
      enableTools: boolean;
      enableResources: boolean;
      enablePrompts: boolean;
      enableSampling: boolean;
    },
    private readonly overrides: {
      toolPrefix?: string;
      resourcePrefix?: string;
      promptPrefix?: string;
    }
  ) {}

  static from(data: unknown): MCPOpts {
    if (!data || typeof data !== 'object') {
      throw new TypeError('MCPOpts.from expects a plain object');
    }

    const d = data as Record<string, unknown>;

    const server = d.server;
    if (!server || typeof server !== 'object') {
      throw new TypeError('Missing or invalid server object');
    }
    const { name, version, description } = server as Record<string, unknown>;

    const transport = d.transport;
    if (transport !== 'stdio' && transport !== 'websocket' && transport !== 'http') {
      throw new TypeError("transport must be one of 'stdio', 'websocket', 'http'");
    }

    const auth = d.auth;
    if (!auth || typeof auth !== 'object') {
      throw new TypeError('Missing or invalid auth object');
    }
    const { type, token, endpoint } = auth as Record<string, unknown>;
    if (type !== 'none' && type !== 'static' && type !== 'dynamic') {
      throw new TypeError("auth.type must be one of 'none', 'static', 'dynamic'");
    }
    if (token !== undefined && typeof token !== 'string') {
      throw new TypeError('auth.token must be a string if provided');
    }
    if (endpoint !== undefined && typeof endpoint !== 'string') {
      throw new TypeError('auth.endpoint must be a string if provided');
    }

    const limits = d.limits;
    if (!limits || typeof limits !== 'object') {
      throw new TypeError('Missing or invalid limits object');
    }
    const { maxTools, maxCallsPerMinute, maxConcurrentCalls } = limits as Record<string, unknown>;

    const features = d.features;
    if (!features || typeof features !== 'object') {
      throw new TypeError('Missing or invalid features object');
    }
    const { enableTools, enableResources, enablePrompts, enableSampling } = features as Record<string, unknown>;

    const overrides = d.overrides;
    if (overrides !== undefined && typeof overrides !== 'object') {
      throw new TypeError('overrides must be a plain object if provided');
    }
    const { toolPrefix, resourcePrefix, promptPrefix } = (overrides || {}) as Record<string, unknown>;
    if (toolPrefix !== undefined && typeof toolPrefix !== 'string') {
      throw new TypeError('overrides.toolPrefix must be a string if provided');
    }
    if (resourcePrefix !== undefined && typeof resourcePrefix !== 'string') {
      throw new TypeError('overrides.resourcePrefix must be a string if provided');
    }
    if (promptPrefix !== undefined && typeof promptPrefix !== 'string') {
      throw new TypeError('overrides.promptPrefix must be a string if provided');
    }

    return new MCPOpts(
      { name, version, description },
      transport,
      { type, token, endpoint },
      { maxTools, maxCallsPerMinute, maxConcurrentCalls },
      { enableTools, enableResources, enablePrompts, enableSampling },
      { toolPrefix, resourcePrefix, promptPrefix }
    );
  }

  validate(): boolean {
    return (
      this.server.name.length > 0 &&
      this.server.version.length > 0 &&
      this.server.description.length >= 0 &&
      this.limits.maxTools > 0 &&
      this.limits.maxCallsPerMinute > 0 &&
      this.limits.maxConcurrentCalls > 0
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      server: this.server,
      transport: this.transport,
      auth: this.auth,
      limits: this.limits,
      features: this.features,
      overrides: this.overrides,
    };
  }
}
