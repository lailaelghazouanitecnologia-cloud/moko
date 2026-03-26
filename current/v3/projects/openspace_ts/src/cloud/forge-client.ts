import { CloudFault } from './index';
import { SkillIndex } from './skill-index';

type ForgeConfig = {
  apiVersion: string;
  uploadEndpoint: string;
  downloadEndpoint: string;
  patchEndpoint: string;
  recordEndpoint: string;
};

type SkillMetadata = {
  name: string;
  version: string;
  tags: string[];
  description: string;
  author: string;
  dependencies: string[];
};

type SkillMatch = {
  skill: SkillIndex;
  score: number;
  matchedTags: string[];
};

export class ForgeClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(baseUrl: string, apiKey: string, timeout = 30000) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
    this.timeout = timeout;
  }

  async searchSkills(query: string, limit = 20): Promise<SkillIndex[]> {

    const url = new URL('/search', this.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', limit.toString());

    const response = await this.fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: this.headers(),
    });

    if (!response.ok) {
      throw CloudFault.fromError(new Error(`Search failed: ${response.statusText}`));
    }

    return response.json() as Promise<SkillIndex[]>;
  }

  async downloadSkill(id: string, targetDir: string): Promise<void> {

    const url = new URL(`/skills/${id}/download`, this.baseUrl);
    const response = await this.fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: this.headers(),
    });

    if (!response.ok) {
      throw CloudFault.fromError(new Error(`Download failed: ${response.status}`));
    }

    const archive = await response.arrayBuffer();
    await this.extractArchive(archive, targetDir);
  }

  async uploadSkill(skillPath: string, metadata: SkillMetadata): Promise<string> {
    if (!metadata || typeof metadata !== 'object') {
      throw new TypeError('metadata must be an object');
    }

    const formData = new FormData();
    const file = new Blob([await this.readFile(skillPath)]);
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    const response = await this.fetchWithTimeout(`${this.baseUrl}/upload`, {
      method: 'POST',
      headers: this.headers(),
      body: formData,
    });

    if (!response.ok) {
      throw CloudFault.fromError(new Error(`Upload failed: ${response.status}`));
    }

    const result = await response.json() as { id: string };
    return result.id;
  }

  async deleteSkill(id: string): Promise<void> {

    const response = await this.fetchWithTimeout(`${this.baseUrl}/skills/${id}`, {
      method: 'DELETE',
      headers: this.headers(),
    });

    if (!response.ok) {
      throw CloudFault.fromError(new Error(`Delete failed: ${response.status}`));
    }
  }

  async listSkills(tags?: string[]): Promise<SkillIndex[]> {
    if (tags !== undefined && !Array.isArray(tags)) {
      throw new TypeError('tags must be an array of strings');
    }

    const url = new URL('/skills', this.baseUrl);
    if (tags?.length) {
      tags.forEach(tag => url.searchParams.append('tag', tag));
    }

    const response = await this.fetchWithTimeout(url.toString(), {
      method: 'GET',
      headers: this.headers(),
    });

    if (!response.ok) {
      throw CloudFault.fromError(new Error(`List failed: ${response.status}`));
    }

    return response.json() as Promise<SkillIndex[]>;
  }

  async applyPatch(skillId: string, patch: string): Promise<void> {

    const response = await this.fetchWithTimeout(`${this.baseUrl}/skills/${skillId}/patch`, {
      method: 'PATCH',
      headers: { ...this.headers(), 'Content-Type': 'text/plain' },
      body: patch,
    });

    if (!response.ok) {
      throw CloudFault.fromError(new Error(`Patch failed: ${response.status}`));
    }
  }

  async getConfig(): Promise<ForgeConfig> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/config`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (!response.ok) {
      throw CloudFault.fromError(new Error('Config fetch failed'));
    }

    return response.json() as Promise<ForgeConfig>;
  }

  async recordExecution(sessionId: string, data: Record<string, unknown>): Promise<void> {
    if (!data || typeof data !== 'object') {
      throw new TypeError('data must be an object');
    }

    const response = await this.fetchWithTimeout(`${this.baseUrl}/records/${sessionId}`, {
      method: 'POST',
      headers: { ...this.headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw CloudFault.fromError(new Error(`Record failed: ${response.status}`));
    }
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async readFile(path: string): Promise<Uint8Array> {
    const fs = await import('node:fs/promises');
    return fs.readFile(path);
  }

  private async extractArchive(data: ArrayBuffer, target: string): Promise<void> {

    const fs = await import('node:fs/promises');
    await fs.mkdir(target, { recursive: true });

    const stream = await import('node:stream');
    const prom = await import('node:stream/promises');
    const tar = await import('tar');

    const extract = tar.extract({
      file: '-',
      cwd: target,
    });

    stream.Readable.from(Buffer.from(data)).pipe(extract);

    await new Promise<void>((resolve, reject) => {
      extract.on('end', resolve);
      extract.on('error', reject);
    });
  }
}