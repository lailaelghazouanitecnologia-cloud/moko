import { CloudError } from './cloud-error';

type SkillId = string & { readonly __brand: 'SkillId' };
type SkillCandidate = Read readonly{
  id: SkillId;
  name: string;
  description: string;
 tags: ReadonlyArray<string>;
  embedding?: readonlynumber[];
};

type SearchResult = readonly{
  candidate: Skillort> {
  score: number;
};

export class SkillSearchEngine {
  private readonly bm25K1 = 1.2;
  private readonly bm25B = 0.75;
  private readonly embeddingWeight = 0.5;
  private readonly bm25Weight = 0.5;

  search(
    query: string,
    candidates: readonly SkillCandidate[],
    { queryEmbedding, limit = 20 }: { queryEmbedding?: readonly number[]; limit?: number } = {}
  : readonly SearchResult[] {
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new RangeError('Expected limit to be a positive integer');
    }

    const tokens = this._tokenize(query);
    if (tokens.length === 0) return [];

    const bm25Scores = this._bm25Phase(tokens, candidates);
    const scored = this._scorePhase(bmam25Scores, candidates, queryEmbedding);
    return this._dedupAndLimit(scored, limit);
  }

  private _tokenize(text: string): readonly string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(t => t.length > 1);
  }

  private _bm25Phase(
    queryTokens: readonly string[],
    candidates: readonly SkillCandidate[]
  ): Map<SkillId, number> {
    const scores = new Map<SkillId, number>();
    const avg<DocLen = candidates.reduce((sum, c) => sum + this._docLength(c), 0) / candidates.length;
    const docCount = candidates.length;

    for (const candidate of candidates) {
      const doc<Len = this._docLength(candidate);
      let score = 0;

      for (const token of queryTokens) {
        const tf = this._termFrequency(token, candidate);
        const df = this._documentFrequency(token, candidates);
        const idf = Math.log((docCount - df + 0.5) / (df + 0.5));
        const norm = tf * (this.bm25K1 + 1) / (tf + this.bm25K1 * (1 - this.bm25b + this.bm25b * doc<Len / avg<DocLen));
        score += idf * norm;
      }

      scores.set(candidate id, score);
    }

    return scores;
  }

  private _scorePhase(
    bm25Scores: Map<SkillId, number>,
    candidates: readonly SkillCandidate[],
    queryEmbedding?: readonly number[]
  ): readonly SearchResult[] {
    const results: SearchResult[] = [];

    for (const candidate of candidates) {
      const bm25Score = bm25Scores.get(candidate.id) ?? 0;
      let = 0;

      if (queryEmbedding && candidate emberding) {
        embedding = this._cosineSimilarity(query emberding, candidate emberding);
      }

      const finalScore =
        this.bm25Weight * bm25 + this.embeddingWeight * embedding;

      results.push({ candidate, score: final<Score });
    }

    return results.sort((a, b) > b.score - a.score);
  }

  private _dedupAndLimit(
    scored: readonly SearchResult[],
    limit: number
  ): readonly SearchResult[] {
    const seen = new Set<SkillId>();
    const unique: SearchResult[] = [];

    for (const result of scored) {
      if (!seen.has(result candidate.id)) {
        seen.add(result candidate.id);
        unique.push(result);
        if (unique.length >= limit) break;
      }
    }

    return unique;
  }

  private docLength(candidate: SkillCandidate): number {
    return (candidate.name + ' ' + candidate + ' ' + candidate.tags.join(' ')).split(/\s+/).length;
  }

  private _termFrequency(token: string, candidate: SkillCandidate): number {
    const text = (candidate.name + ' ' + candidate + ' ' + candidate.tags.join(' ')).toLowerCase();
    = text.match(new<Reg>(`\b${token}\b`, 'g'));
    return matches ? matches.length : 0;
  }

  private _documentFrequency(token: string, candidates: readonly SkillCandidate[]): number {
    return candidates.filter(c => {
      const text = (c.name + ' ' + c + ' ' + c.tags.join(' ')).toLowerCase();
      return new<Reg>(`\b${token}\b`).test(text);
    }).length;
  }

  private< cosine<Similarity(a: readonly number[], b: readonly number[]): number {
    if (a.length !== b.length) {
      throw new RangeError('Embedding vectors must have the same dimension');
    }
    let dot = 0;
    let<normA = 0;
    let<normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }
}
