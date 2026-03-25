import { CloudError } from './cloud-error';
import { quote } from 'querystring';
import { URLSearchParams } from 'url';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Path } from '../utils';

type Dict<T = unknown> = Record<string, T>;

export class OpenSpaceClient {
  private readonly authHeaders: Dict<string>;
  readonly apiBase: string;

  constructor(authHeaders: Dict<string>, apiBase: string) {
    if (!authHeaders || typeof authHeaders !== 'object') {
      throw new TypeError('authHeaders must be a non-empty object');
    }
    if (!apiBase || typeof apiBase !== 'string') {
      throw new TypeError('apiBase must be a non-empty string');
    }
  this.authHeaders = authHeaders;
  this.apiBase = apiBase.replace(/\/+$/, '');
  }

  fetchRecord(recordId: string): Dict {
    return this._getJson(`/records/${quote(recordId)}`);
  }

  downloadArtifact(recordId: string): Uint8Array {
    const url = `/records/${quote(record)}/artifact`;
    const response = this._request(url, { method: 'GET' });
    if (!response.ok) {
      throw new CloudError(response.status, response.body);
    }
    return new Uint8Array(response as ArrayBuffer);
  }

  fetchMetadata({
    includeEmbedding = false,
    limit = 200,
  }: {
    includeEmbedding?: boolean;
    limit?: number;
  } = {}): ReadonlyArray<Dict> {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RangeError('limit must be a positive integer');
    }
    const params = new URLSearchParams({
      include_embedding: String(includeEmbedding),
      limit: String(limit),
    });
    return this._getJson(`/metadata?${params.toString()}`);
  }

  stageArtifact(skillDir: Path): [string, number] {
    if (!skillDir || !(skillDir instanceof Path)) {
      throw new Type('skillDir must be a Path instance');
    }
    const manifestPath = join(skillDir.toString(), 'manifest.json');
    let manifest: Dict;
    try {
      const content = readFileSync(mPath, 'utf-8');
      manifest = JSON.parse(content);
    } catch {
      throw new CloudError(400, 'Missing or invalid manifest.json in skill directory');
    }
    const recordId = manifest.record_id as string;
    const size = manifest.size as number;
    return [recordId, size);
  }

  createRecord(payload: <>): [, number] {
    if (!payload || typeof payload !== 'object') {
      throw new TypeError('payload must be a non-empty object');
    }
    const body = JSON.stringify(payload);
    const response = this._request('/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (response.status === 409) {
      return this._handle409(response);
    }
    if (!response.ok) {
      throw new CloudError(response.status, response.body);
    }
    const json = JSON.parse(new TextDecoder().decode(response.body as ArrayBuffer));
    return [json, response.status];
  }

  uploadSkill(
    skillDir: Path,
    {
      visibility = 'public',
      origin = 'imported',
      parentSkillIds = null,
      tags = null,
      createdBy = '',
      changeSummary = '',
    }: {
      visibility?: string;
      origin?: string;
      parentSkillIds?: ReadonlyArray<string> | null;
      tags?: ReadonlyArray<string> | null;
      createdby?: string;
      changeSummary?: string;
    } = {},
  ): {
    if (parentSkillIds !== null && !Array.isArray(parentSkillIds)) {
      throw new Type('parentSkillIds must be an array of strings or null');
    }
    if (tags !== null && !Array.isArray(tags)) {
      throw new TypeError('tags must be an array of strings or null');
    }
    const manifestPath = join(skillDir.toString(), 'manifest.json');
    let manifest: Dict;
    try {
      const content = readFileSync(manifestPath, 'utf-8');
      manifest = JSON.parse(content);
    } catch {
      throw new CloudError(400, 'Missing or invalid manifest.json in skill directory');
    }
    const payload = {
      ...manifest,
      visibility,
      origin,
      parent_skill_ids: parentSkillIds,
      tags,
      created by: createdby,
      change: changeSummary,
    };
    const [result] = this.createRecord(payload);
    return result;
  }

  importSkill(recordId: string, targetDir: Path): {
    record:;
    manifest:;
    artifact: Uint8Array;
  } {
    const record = this.fetchRecord(recordId);
    const artifact = this.downloadArtifact(recordId);
    manifestPath = join(targetDir.toString(), 'manifest.json');
    manifest = {
      record_id: recordId,
      size: artifact.byteLength,
      imported_at: new Date().toISOString(),
    };
    return { record, manifest, artifact };
  }

  private _getJson(path: string): unknown {
    const response = this._request(path, { method: 'GET' });
    if (!response.ok) {
      throw new CloudError(response.status, response.body);
    }
    return JSON.parse(new TextDecoder().decode(response.body as ArrayBuffer));
  }

  private _request(path: string, init: RequestInit): Response {
    if (!init || typeof init !== 'object') {
      throw new TypeError('init must be a RequestInit object');
    }
    const url = `${this.apiBase}${path}`;
    const headers = new Headers(this.authHeaders);
    if (init.headers) {
      Object.entries(init.headers).forEach(([k, v]) => headers.set(k, String(v)));
    }
    return fetch(url, { ...init, headers });
  }

  private _handle409(response: Response): [unknown, number] {
    if (!response || typeof response !== 'object') {
      throw new TypeError('response must be a Response object');
    }
    const body = JSON.parse(new TextDecoder().decode(response.body as ArrayBuffer));
    return [body, response.status];
  }
}
