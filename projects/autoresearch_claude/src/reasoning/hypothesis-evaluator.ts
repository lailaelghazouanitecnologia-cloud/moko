/**
 * Hypothesis Evaluator — tracks and evaluates research hypotheses
 * using Bayesian-like confidence updates.
 */

export interface Hypothesis {
  id: string;
  claim: string;
  confidence: number; // 0–1, current posterior probability
  priorConfidence: number; // original prior
  evidenceIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type EvidenceRelation = "supports" | "contradicts";

export interface Evidence {
  id: string;
  data: string;
  relation: EvidenceRelation;
  hypothesisId: string;
  /**
   * Likelihood ratio component: how likely is this evidence if the
   * hypothesis is true vs. false.
   *
   * For supporting evidence:
   *   strength > 1 means evidence is more likely under H than under ~H.
   *   Typical range: 1.1 (weak) to 10+ (very strong).
   *
   * For contradicting evidence:
   *   strength > 1 is still stored as a positive number, but the update
   *   formula inverts it (uses 1/strength as the likelihood ratio).
   */
  strength: number; // > 0, default 2.0
  reliability: number; // 0–1, how trustworthy the source is
  createdAt: number;
}

/**
 * Evaluates hypotheses against accumulated evidence using
 * Bayesian-inspired confidence updates.
 */
export class HypothesisEvaluator {
  public hypotheses: Hypothesis[] = [];
  public evidence: Evidence[] = [];

  private idCounter = 0;

  private generateId(prefix: string): string {
    return `${prefix}_${++this.idCounter}_${Date.now().toString(36)}`;
  }

  /**
   * Registers a new hypothesis with an initial confidence (prior).
   * Confidence should be between 0 and 1 (exclusive) for Bayesian math to work.
   */
  addHypothesis(claim: string, confidence: number = 0.5): Hypothesis {
    // Clamp to open interval (0, 1) to avoid degenerate Bayesian updates
    const clamped = Math.max(0.001, Math.min(0.999, confidence));

    const hypothesis: Hypothesis = {
      id: this.generateId("hyp"),
      claim,
      confidence: clamped,
      priorConfidence: clamped,
      evidenceIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.hypotheses.push(hypothesis);
    return hypothesis;
  }

  /**
   * Adds a piece of evidence linked to a hypothesis and immediately
   * updates that hypothesis's confidence.
   *
   * @param data        Human-readable description of the evidence.
   * @param relation    Whether the evidence supports or contradicts the hypothesis.
   * @param hypothesisId  The hypothesis this evidence pertains to.
   * @param strength    Likelihood ratio magnitude (default 2.0). Higher = stronger evidence.
   * @param reliability How trustworthy the evidence source is, 0–1 (default 0.8).
   */
  addEvidence(
    data: string,
    relation: EvidenceRelation,
    hypothesisId: string,
    strength: number = 2.0,
    reliability: number = 0.8
  ): Evidence {
    const evidence: Evidence = {
      id: this.generateId("ev"),
      data,
      relation,
      hypothesisId,
      strength: Math.max(0.01, strength),
      reliability: Math.max(0, Math.min(1, reliability)),
      createdAt: Date.now(),
    };

    this.evidence.push(evidence);

    // Link to hypothesis and update confidence
    const hyp = this.hypotheses.find((h) => h.id === hypothesisId);
    if (hyp) {
      hyp.evidenceIds.push(evidence.id);
      hyp.confidence = this.bayesianUpdate(hyp.confidence, evidence);
      hyp.updatedAt = Date.now();
    }

    return evidence;
  }

  /**
   * Performs a Bayesian-like update on a prior probability given new evidence.
   *
   * The core formula uses odds-likelihood form of Bayes' theorem:
   *
   *   posterior_odds = prior_odds * likelihood_ratio
   *
   * Where:
   *   prior_odds     = P(H) / (1 - P(H))
   *   likelihood_ratio = P(E|H) / P(E|~H)
   *
   * For supporting evidence, LR = strength.
   * For contradicting evidence, LR = 1 / strength.
   *
   * The evidence's reliability scales how much the LR deviates from 1
   * (no update). At reliability=0 the evidence has no effect; at
   * reliability=1 it has full effect.
   *
   *   effective_LR = 1 + reliability * (raw_LR - 1)
   */
  private bayesianUpdate(prior: number, evidence: Evidence): number {
    // Raw likelihood ratio
    let rawLR: number;
    if (evidence.relation === "supports") {
      rawLR = evidence.strength;
    } else {
      rawLR = 1 / evidence.strength;
    }

    // Attenuate by reliability: lerp between 1.0 (no update) and rawLR
    const effectiveLR = 1 + evidence.reliability * (rawLR - 1);

    // Convert prior to odds
    const priorOdds = prior / (1 - prior);

    // Update odds
    const posteriorOdds = priorOdds * effectiveLR;

    // Convert back to probability and clamp
    const posterior = posteriorOdds / (1 + posteriorOdds);
    return Math.max(0.001, Math.min(0.999, posterior));
  }

  /**
   * Re-evaluates a hypothesis from its prior by replaying all linked evidence
   * in chronological order. Useful after evidence has been modified or removed.
   */
  evaluate(hypothesisId: string): number {
    const hyp = this.hypotheses.find((h) => h.id === hypothesisId);
    if (!hyp) return 0;

    // Reset to prior
    let confidence = hyp.priorConfidence;

    // Gather evidence in chronological order
    const linked = this.evidence
      .filter((e) => e.hypothesisId === hypothesisId)
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const ev of linked) {
      confidence = this.bayesianUpdate(confidence, ev);
    }

    hyp.confidence = confidence;
    hyp.updatedAt = Date.now();
    return confidence;
  }

  /**
   * Returns all hypotheses ranked by confidence (highest first).
   */
  rank(): Hypothesis[] {
    return [...this.hypotheses].sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Finds pairs of evidence that conflict — one supports and one contradicts
   * the same hypothesis.
   */
  conflicts(): Array<{ hypothesisId: string; supporting: Evidence; contradicting: Evidence }> {
    const result: Array<{
      hypothesisId: string;
      supporting: Evidence;
      contradicting: Evidence;
    }> = [];

    // Group evidence by hypothesis
    const byHypothesis = new Map<string, Evidence[]>();
    for (const ev of this.evidence) {
      const list = byHypothesis.get(ev.hypothesisId) ?? [];
      list.push(ev);
      byHypothesis.set(ev.hypothesisId, list);
    }

    for (const [hypId, evidenceList] of byHypothesis) {
      const supporting = evidenceList.filter((e) => e.relation === "supports");
      const contradicting = evidenceList.filter((e) => e.relation === "contradicts");

      // Produce pairs of conflicting evidence
      for (const sup of supporting) {
        for (const con of contradicting) {
          result.push({
            hypothesisId: hypId,
            supporting: sup,
            contradicting: con,
          });
        }
      }
    }

    return result;
  }

  /**
   * Returns all evidence for a given hypothesis.
   */
  getEvidenceFor(hypothesisId: string): Evidence[] {
    return this.evidence.filter((e) => e.hypothesisId === hypothesisId);
  }

  /**
   * Returns the net direction of evidence for a hypothesis:
   * positive means mostly supporting, negative means mostly contradicting.
   */
  netEvidenceDirection(hypothesisId: string): number {
    const linked = this.evidence.filter((e) => e.hypothesisId === hypothesisId);
    if (linked.length === 0) return 0;

    let net = 0;
    for (const ev of linked) {
      const weight = ev.strength * ev.reliability;
      net += ev.relation === "supports" ? weight : -weight;
    }

    return net / linked.length;
  }
}
