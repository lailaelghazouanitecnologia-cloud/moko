export class MCPInstallFailFault extends Error {
  private readonly exitCode: number;
  private readonly stderr: string;
  private readonly package: string;
  private readonly retryable: boolean;

  private constructor(exitCode: number, stderr: string, pkg: string, retryable: boolean) {
    super(`MCP install failed for ${pkg}: exit ${exitCode}`);
    this.exitCode = exitCode;
    this.stderr = stderr;
    this.package = pkg;
    this.retryable = retryable;
  }

  static fromExit(code: number, stderr: string, pkg: string): MCPInstallFailFault {
    const retryable = code === 1 || code === 127 || stderr.includes('EACCES') || stderr.includes('ENOENT');
    return new MCPInstallFailFault(code, stderr, pkg, retryable);
  }

  isRetryable(): boolean {
    return this.retryable;
  }

  toString(): string {
    return `MCPInstallFailFault{package:${this.package}, exit:${this.exitCode}, retryable:${this.retryable}, stderr:${this.stderr.substring(0, 200)}}`;
  }

  getExitCode(): number {
    return this.exitCode;
  }

  getStderr(): string {
    return this.stderr;
  }
}
