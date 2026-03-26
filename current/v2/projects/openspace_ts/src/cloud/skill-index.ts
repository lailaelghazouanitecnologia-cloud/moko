import { CloudFault } from './cloud-fault';
import { ForgeClient } from './forge-client';

export type SkillMatch = {
  readonly skillId: string;
  readonly name: string;
  readonly description: string;
  readonly score: number;
  readonly tags: ReadonlyArray<string>;
};

export type SkillMeta = {
  readonly skillId: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly tags: ReadonlyArray<string>;
  readonly dependencies: ReadonlyArray<string>;
  readonly rating: number;
  readonly downloadCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SkillBundle = {
  readonly skillId: string;
  readonly metadata: SkillMeta;
  readonly files: Record<string, Uint8Array>;
};

export class SkillIndex {
  private readonly client: ForgeClient;
  private readonly cache: Map<string, unknown>;
  private indexVersion: string;

  constructor(client: ForgeClient) {
    this.client = client;
    this.cache = new Map<string, unknown>();
    this.indexVersion = '1.0.0';
  }

  async search(query: string, limit = 10): Promise<SkillMatch[]> {

    try {
      const results = await this.client.searchSkills(query, limit);
      return results.map(r => ({
        skillId: r.skillId ?? '',
        name: r.name ?? '',
        description: r.description ?? '',
        score: r.score ?? 0,
        tags: r.tags ?? []
      }));
    } catch (err) {
      throw CloudFault.fromError(err as Error);
    }
  }

  async publish(skill: SkillMeta): Promise<void> {
    if (!skill || typeof skill !== 'object') {
      throw new TypeError('skill must be an object');
    }
    if (typeof skill.skillId !== 'string' || !skill.skillId.trim()) {
      throw new TypeError('skill.skillId must be a non-empty string');
    }
    if (typeof skill.name !== 'string' || !skill.name.trim()) {
      throw new TypeError('skill.name must be a non-empty string');
    }
    if (typeof skill.version !== 'string' || !skill.version.trim()) {
      throw new TypeError('skill.version must be a non-empty string');
    }

    try {
      const tempDir = `/tmp/skill-${skill.skillId}`;
      await this.client.uploadSkill(tempDir, {
        skillId: skill.skillId,
        name: skill.name,
        version: skill.version,
        description: skill.description,
        author: skill.author,
        tags: skill.tags,
        dependencies: skill.dependencies
      });
      this.cache.delete(skill.skillId);
    } catch (err) {
      throw CloudFault.fromError(err as Error);
    }
  }

  async delete(skillId: string): Promise<void> {

    try {
      await this.client.deleteSkill(skillId);
      this.cache.delete(skillId);
    } catch (err) {
      throw CloudFault.fromError(err as Error);
    }
  }

  async download(skillId: string): Promise<SkillBundle> {

    try {
      const tempDir = `/tmp/skill-${skillId}`;
      await this.client.downloadSkill(skillId, tempDir);
      const metadata = this.cache.get(skillId) as SkillMeta | undefined;
      const files: Record<string, Uint8Array> = {};
      return { skillId, metadata: metadata ?? this.createStubMeta(skillId), files };
    } catch (err) {
      throw CloudFault.fromError(err as Error);
    }
  }

  async rate(skillId: string, rating: number): Promise<void> {

    try {
      const meta = (this.cache.get(skillId) as SkillMeta | undefined) ?? this.createStubMeta(skillId);
      const updated = { ...meta, rating };
      this.cache.set(skillId, updated);
    } catch (err) {
      throw CloudFault.fromError(err as Error);
    }
  }

  async listTrending(days = 7): Promise<SkillMeta[]> {

    try {
      const all = await this.client.listSkills(['trending']);
      return all.map(s => ({
        skillId: s.skillId ?? '',
        name: s.name ?? '',
        version: s.version ?? '1.0.0',
        description: s.description ?? '',
        author: s.author ?? '',
        tags: s.tags ?? [],
        dependencies: s.dependencies ?? [],
        rating: s.rating ?? 0,
        downloadCount: s.downloadCount ?? 0,
        createdAt: s.createdAt ?? new Date().toISOString(),
        updatedAt: s.updatedAt ?? new Date().toISOString()
      }));
    } catch (err) {
      throw CloudFault.fromError(err as Error);
    }
  }

  async refreshCache(): Promise<void> {
    this.cache.clear();
    this.indexVersion = new Date().toISOString();
  }

  async resolveDependencies(skillId: string): Promise<string[]> {

    const meta = (this.cache.get(skillId) as SkillMeta | undefined) ?? this.createStubMeta(skillId);
    return meta.dependencies;
  }

  private createStubMeta(skillId: string): SkillMeta {
    return {
      skillId,
      name: skillId,
      version: '1.0.0',
      description: '',
      author: '',
      tags: [],
      dependencies: [],
      rating: 0,
      downloadCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}
