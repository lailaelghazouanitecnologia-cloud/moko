import { EventEmitter } from './event_emitter';
import { Timer } from './timer';
import { ResourceLoader } from './resource_loader';
import { Tags } from './tags';

export class Platform {
  private static _instance: Platform | null = null;

  public readonly isNode: boolean;
  public readonly isBrowser: boolean;
  public readonly isElectron: boolean;
  public readonly isWindows: boolean;
  public readonly isMacOS: boolean;
  public readonly isLinux: boolean;
  public readonly pathSeparator: string;
  public readonly EOL: string;

  private constructor() {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const process = (globalThis as any).process;

    this.isNode = typeof process !== 'undefined' && process.versions?.node !== undefined;
    this.isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined' && !this.isNode;
    this.isElectron = this.isNode && process.versions?.electron !== undefined;

    if (this.isNode) {
      this.isWindows = process.platform === 'win32';
      this.isMacOS = process.platform === 'darwin';
      this.isLinux = process.platform === 'linux';
      this.pathSeparator = this.isWindows ? '\\' : '/';
      this.EOL = this.isWindows ? '\r\n' : '\n';
    } else {
      this.isWindows = userAgent.includes('Windows');
      this.isMacOS = userAgent.includes('Macintosh');
      this.isLinux = userAgent.includes('Linux');
      this.pathSeparator = '/';
      this.EOL = '\n';
    }
  }

  public static getInstance(): Platform {
    if (Platform._instance === null) {
      Platform._instance = new Platform();
    }
    return Platform._instance;
  }

  public getEnvVar(key: string): string | undefined {
    if (this.isNode) {
      return (globalThis as any).process.env[key];
    }
    return undefined;
  }

  public getEnvVars(): Record<string, string> {
    if (this.isNode) {
      return { ...(globalThis as any).process.env };
    }
    return {};
  }

  public getOS(): 'windows' | 'macos' | 'linux' | 'unknown' {
    if (this.isWindows) return 'windows';
    if (this.isMacOS) return 'macos';
    if (this.isLinux) return 'linux';
    return 'unknown';
  }
}
