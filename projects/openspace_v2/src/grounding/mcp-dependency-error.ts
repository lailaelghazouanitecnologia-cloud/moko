export class MCPDependencyError extends Error {
  private readonly dependency: string;
  private readonly requiredVersion: string;
  private readonly actualVersion: string;

  constructor(dependency: string, requiredVersion: string, actualVersion?: string) {

    super();
    this.name = 'MCPDependencyError';
    this.dependency = dependency;
    this.requiredVersion = requiredVersion;
    this.actualVersion = actualVersion ?? 'none';
  }

  getDependency(): string {
    return this.dependency;
  }

  getRequiredVersion(): string {
    return this.requiredVersion;
  }

  getActualVersion(): string {
    return this.actualVersion;
  }

  toString(): string {
    return `MCP dependency error: ${this.dependency} required version ${this.requiredVersion} but found ${this.actualVersion}`;
  }
}
