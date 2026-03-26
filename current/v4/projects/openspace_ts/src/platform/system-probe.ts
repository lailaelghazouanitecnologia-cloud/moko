import { os } from 'os';
import { fs } from 'fs';
import { path } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

type DisplayInfo = { id: string; name: string; width: number; height: number; refresh: number; };
type CameraInfo = { id: string; name: string; width: number; height: number; };
type AudioInfo = { id: string; name: string; channels: number; sampleRate: number; };
type CodecInfo = { name: string; type: 'video' | 'audio'; supported: boolean; };

export class SystemProbe {
  private readonly platform: string;
  private readonly isElevated: boolean;

  constructor() {
    this.platform = os();
    this.isElevated = process.getuid?.() === 0 || process.platform === 'win32' && require('is-elevated')();
  }

  async detectPlatform(): Promise<string> {
    return this.platform;
  }

  async checkPrivileges(): Promise<boolean> {
    return this.isElevated;
  }

  async listDisplays(): Promise<DisplayInfo[]> {
    const execAsync = promisify(exec);
    if (this.platform === 'win32') {
      const { stdout } = await execAsync('wmic path win32_desktopmonitor get name, screenwidth, screenheight, refreshrate /value');
      return stdout.split('\n\n').filter(Boolean).map(block => {
        const lines = block.split('\n');
        const name = lines.find(l => l.startsWith('Name='))?.split('=')[1] ?? 'Unknown';
        const width = parseInt(lines.find(l => l.startsWith('ScreenWidth='))?.split('=')[1] ?? '0');
        const height = parseInt(lines.find(l => l.startsWith('ScreenHeight='))?.split('=')[1] ?? '0');
        const refresh = parseInt(lines.find(l => l.startsWith('RefreshRate='))?.split('=')[1] ?? '0');
        return { id: name, name, width, height, refresh };
      });
    } else {
      const { stdout } = await execAsync('xrandr --listmonitors');
      return stdout.split('\n').slice(1).map(line => {
        const parts = line.split(/\s+/);
        const name = parts[3] ?? 'Unknown';
        const resolution = parts[2]?.split('x') ?? ['0', '0'];
        return { id: name, name, width: parseInt(resolution[0]), height: parseInt(resolution[1]), refresh: 60 };
      });
    }
  }

  async listCameras(): Promise<CameraInfo[]> {
    return [];
  }

  async listMicrophones(): Promise<AudioInfo[]> {
    return [];
  }

  async probeCodecs(): Promise<CodecInfo[]> {
    return [];
  }

  validatePaths(paths: ReadonlyArray<string>): Promise<boolean[]> {
    return Promise.all(paths.map(p => fs.access(p).then(() => true).catch(() => false)));
  }

  async estimateSpace(dir: string, durationSec: number): Promise<number> {
    const stat = await fs.stat(dir).catch(() => null);
    if (!stat || !stat.isDirectory()) return 0;
    const free = await require('check-disk-space')(dir);
    return Math.min(free.free, durationSec * 10 * 1024 * 1024);
  }
}
