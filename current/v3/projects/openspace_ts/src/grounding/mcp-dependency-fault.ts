export class MCPDependencyFault {
  private readonly dependency: string;
  private readonly version: string | undefined;

  constructor(dependency: string, version?: string) {
    if (version !== undefined && typeof version !== 'string') {
      throw new TypeError('Version must be a string when provided');
    }
    this.dependency = dependency.trim();
    this.version = version?.trim();
  }

  toString(): string {
    return `Missing MCP dependency: ${this.dependency}${this.version ? `@${this.version}` : ''}`;
  }

  isCritical(): boolean {
    return this.dependency === 'mcp' || this.dependency.startsWith('@mcp/');
  }

  suggestFix(): string {
    const pkg = this.version ? `${this.dependency}@${this.version}` : this.dependency;
    return `npm install -g ${pkg}`;
  }

  equals(other: MCPDependencyFault): boolean {
    return this.dependency === other.dependency && this.version === other.version;
  }

  getDependency(): string {
    return this.dependency;
  }

  getVersion(): string | undefined {
    return this.version;
  }

  hashCode(): number {
    let hash = 0;
    const str = `${this.dependency}|${this.version ?? ''}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return hash;
  }

  toJSON(): { dependency: string; version?: string } {
    return {
      dependency: this.dependency,
      ...(this.version !== undefined && { version: this.version })
    };
  }

  static fromJSON(data: unknown): MCPDependencyFault {
    const { dependency, version } = data as Record<string, unknown>;
    return new MCPDependencyFault(dependency, version as string | undefined);
  }
}
