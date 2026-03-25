/**
 * Evidence Ranker — scores, ranks, and explains evidence quality
 * using weighted multi-criteria evaluation.
 */

export interface EvidenceItem {
  id: string;
  content: string;
  sourceUrl?: string;
  /** 0–1: how directly the evidence addresses the research question. */
  relevance: number;
  /** ISO 8601 date string or Unix timestamp (ms). Used for recency scoring. */
  date?: string | number;
  /** 0–1: authority/credibility of the source. */
  authority: number;
  /** 0–1: rigor of the methodology behind the evidence. */
  methodology: number;
  metadata?: Record<string, unknown>;
}

export interface ScoringCriteria {
  relevance: number;
  recency: number;
  authority: number;
  methodology: number;
}

export interface ScoringBreakdown {
  evidenceId: string;
  rawScores: ScoringCriteria;
  weightedScores: ScoringCriteria;
  totalScore: number;
  explanation: string;
}

/**
 * Default half-life for recency decay (in days).
 * Evidence loses half its recency score after this many days.
 */
const DEFAULT_RECENCY_HALF_LIFE_DAYS = 365;

/**
 * Scores and ranks evidence items using a weighted multi-criteria system.
 */
export class EvidenceRanker {
  public criteria: ScoringCriteria = {
    relevance: 1,
    recency: 1,
    authority: 1,
    methodology: 1,
  };

  public weights: ScoringCriteria;

  /** Half-life for recency exponential decay, in days. */
  public recencyHalfLifeDays: number;

  /**
   * @param weights       Custom weights for each criterion (will be normalized).
   * @param recencyHalfLifeDays  How quickly recency decays (default 365 days).
   */
  constructor(
    weights?: Partial<ScoringCriteria>,
    recencyHalfLifeDays: number = DEFAULT_RECENCY_HALF_LIFE_DAYS
  ) {
    const raw: ScoringCriteria = {
      relevance: weights?.relevance ?? 0.35,
      recency: weights?.recency ?? 0.15,
      authority: weights?.authority ?? 0.25,
      methodology: weights?.methodology ?? 0.25,
    };

    // Normalize so weights sum to 1
    const sum = raw.relevance + raw.recency + raw.authority + raw.methodology;
    this.weights = {
      relevance: raw.relevance / sum,
      recency: raw.recency / sum,
      authority: raw.authority / sum,
      methodology: raw.methodology / sum,
    };

    this.recencyHalfLifeDays = recencyHalfLifeDays;
  }

  /**
   * Computes the raw recency score for an evidence item using
   * exponential decay:
   *
   *   recency = 2^(-ageDays / halfLife)
   *
   * Returns 1.0 for today, 0.5 at halfLife days ago, approaching 0 for old items.
   * Returns 0.5 if no date is provided.
   */
  private computeRecency(evidence: EvidenceItem): number {
    if (evidence.date == null) return 0.5;

    let dateMs: number;
    if (typeof evidence.date === "number") {
      dateMs = evidence.date;
    } else {
      dateMs = new Date(evidence.date).getTime();
      if (isNaN(dateMs)) return 0.5;
    }

    const now = Date.now();
    const ageDays = Math.max(0, (now - dateMs) / (1000 * 60 * 60 * 24));
    return Math.pow(2, -ageDays / this.recencyHalfLifeDays);
  }

  /**
   * Computes raw scores (0–1) for each criterion.
   */
  private rawScores(evidence: EvidenceItem): ScoringCriteria {
    return {
      relevance: Math.max(0, Math.min(1, evidence.relevance)),
      recency: this.computeRecency(evidence),
      authority: Math.max(0, Math.min(1, evidence.authority)),
      methodology: Math.max(0, Math.min(1, evidence.methodology)),
    };
  }

  /**
   * Returns a weighted total score for a single evidence item (0–1).
   */
  score(evidence: EvidenceItem): number {
    const raw = this.rawScores(evidence);
    return (
      raw.relevance * this.weights.relevance +
      raw.recency * this.weights.recency +
      raw.authority * this.weights.authority +
      raw.methodology * this.weights.methodology
    );
  }

  /**
   * Ranks a list of evidence items by score (highest first).
   * Returns a new sorted array (does not mutate the input).
   */
  rank(evidenceList: EvidenceItem[]): EvidenceItem[] {
    return [...evidenceList].sort((a, b) => this.score(b) - this.score(a));
  }

  /**
   * Filters an evidence list, keeping only items whose score meets or
   * exceeds the minimum threshold.
   */
  filterByThreshold(evidenceList: EvidenceItem[], min: number): EvidenceItem[] {
    return evidenceList.filter((e) => this.score(e) >= min);
  }

  /**
   * Compares two evidence items.
   * Returns a positive number if `a` scores higher than `b`,
   * negative if `b` scores higher, and 0 if equal.
   */
  compareEvidence(a: EvidenceItem, b: EvidenceItem): number {
    return this.score(a) - this.score(b);
  }

  /**
   * Produces a human-readable scoring breakdown for a piece of evidence.
   */
  explain(evidence: EvidenceItem): ScoringBreakdown {
    const raw = this.rawScores(evidence);
    const weighted: ScoringCriteria = {
      relevance: raw.relevance * this.weights.relevance,
      recency: raw.recency * this.weights.recency,
      authority: raw.authority * this.weights.authority,
      methodology: raw.methodology * this.weights.methodology,
    };
    const totalScore =
      weighted.relevance + weighted.recency + weighted.authority + weighted.methodology;

    const pct = (v: number) => (v * 100).toFixed(1);
    const lines = [
      `Evidence "${evidence.id}" — Total Score: ${pct(totalScore)}%`,
      ``,
      `  Relevance:   ${pct(raw.relevance)}% raw x ${pct(this.weights.relevance)} weight = ${pct(weighted.relevance)}%`,
      `  Recency:     ${pct(raw.recency)}% raw x ${pct(this.weights.recency)} weight = ${pct(weighted.recency)}%`,
      `  Authority:   ${pct(raw.authority)}% raw x ${pct(this.weights.authority)} weight = ${pct(weighted.authority)}%`,
      `  Methodology: ${pct(raw.methodology)}% raw x ${pct(this.weights.methodology)} weight = ${pct(weighted.methodology)}%`,
    ];

    // Identify strongest and weakest dimensions
    const dims = [
      { name: "Relevance", score: raw.relevance },
      { name: "Recency", score: raw.recency },
      { name: "Authority", score: raw.authority },
      { name: "Methodology", score: raw.methodology },
    ].sort((a, b) => b.score - a.score);

    lines.push(``);
    lines.push(`  Strongest dimension: ${dims[0].name} (${pct(dims[0].score)}%)`);
    lines.push(`  Weakest dimension:   ${dims[dims.length - 1].name} (${pct(dims[dims.length - 1].score)}%)`);

    return {
      evidenceId: evidence.id,
      rawScores: raw,
      weightedScores: weighted,
      totalScore,
      explanation: lines.join("\n"),
    };
  }
}
