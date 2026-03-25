id: string;
  statement: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface Evidence {
  id: string;
  content: string;
  reliability: number;
  relevance: number;
  metadata: Record<string, unknown>;
}

export interface Evaluation {
  hypothesisId: string;
  score: number;
  confidence: number;
  evidenceIds: string[];
  metadata: Record<string, unknown>;
}

export interface EvaluationResult {
  timestamp: number;
  evaluation: Evaluation;
}

export interface RankedHypothesis {
  hypothesis: Hypothesis;
  score: number;
  rank: number;
}

export class HypothesisEvaluator {
  private scoringWeights: Record<string, number>;
  private evidenceThreshold: number;
  private evaluationHistory: EvaluationResult[];

  constructor() {
    this.scoringWeights = {
      plausibility: 0.4,
      evidence: 0.3,
      confidence: 0.2,
      novelty: 0.1
    };
    this.evidenceThreshold = 0.5;
    this.evaluationHistory = [];
  }

  evaluate(hypothesis: Hypothesis, evidence: Evidence[]): Evaluation {
    const plausibilityScore = this.scorePlausibility(hypothesis);
    
    let validEvidenceCount = 0;
    let totalEvidenceScore = 0;
    const validEvidenceIds: string[] = [];

    for (const ev of evidence) {
      if (this.validateEvidence(ev)) {
        validEvidenceCount++;
        totalEvidenceScore += ev.reliability * ev.relevance;
        validEvidenceIds.push(ev.id);
      }
    }

    const evidenceScore = validEvidenceCount > 0 ? totalEvidenceScore / validEvidenceCount : 0;
    const noveltyScore = 1 - hypothesis.confidence;
    
    const finalScore = 
      plausibilityScore * this.scoringWeights.plausibility +
      evidenceScore * this.scoringWeights.evidence +
      hypothesis.confidence * this.scoringWeights.confidence +
      noveltyScore * this.scoringWeights.novelty;

    const evaluation: Evaluation = {
      hypothesisId: hypothesis.id,
      score: finalScore,
      confidence: this.getConfidence({ 
        hypothesisId: hypothesis.id, 
        score: finalScore, 
        confidence: hypothesis.confidence, 
        evidenceIds: validEvidenceIds, 
        metadata: {} 
      }),
      evidenceIds: validEvidenceIds,
      metadata: {
        plausibilityScore,
        evidenceScore,
        noveltyScore,
        validEvidenceCount
      }
    };

    this.evaluationHistory.push({
      timestamp: Date.now(),
      evaluation
    });

    return evaluation;
  }

  scorePlausibility(hypothesis: Hypothesis): number {
    const statementLength = hypothesis.statement.length;
    const wordCount = hypothesis.statement.split(/\s+/).length;
    
    let baseScore = 0.5;
    
    if (wordCount >= 5 && wordCount <= 20) {
      baseScore += 0.2;
    }
    
    if (hypothesis.statement.includes('because') || hypothesis.statement.includes('due to')) {
      baseScore += 0.15;
    }
    
    if (hypothesis.statement.includes('if') && hypothesis.statement.includes('then')) {
      baseScore += 0.1;
    }
    
    return Math.min(baseScore, 1.0);
  }

  validateEvidence(evidence: Evidence): boolean {
    if (!evidence.content || evidence.content.trim().length === 0) {
      return false;
    }
    
    if (evidence.reliability < 0 || evidence.reliability > 1) {
      return false;
    }
    
    if (evidence.relevance < 0 || evidence.relevance > 1) {
      return false;
    }
    
    return evidence.reliability >= this.evidenceThreshold;
  }

  rankHypotheses(hypotheses: Hypothesis[]): RankedHypothesis[] {
    const scoredHypotheses = hypotheses.map(hypothesis => {
      const score = this.scorePlausibility(hypothesis) * 0.6 + hypothesis.confidence * 0.4;
      return { hypothesis, score };
    });

    scoredHypotheses.sort((a, b) => b.score - a.score);

    return scoredHypotheses.map((item, index) => ({
      hypothesis: item.hypothesis,
      score: item.score,
      rank: index + 1
    }));
  }

  mergeEvaluations(evaluations: Evaluation[]): Evaluation {
    if (evaluations.length === 0) {
      throw new Error('Cannot merge empty evaluations array');
    }

    if (evaluations.length === 1) {
      return evaluations[0];
    }

    let totalScore = 0;
    let totalConfidence = 0;
    const allEvidenceIds = new Set<string>();
    const mergedMetadata: Record<string, unknown> = {};

    evaluations.forEach((eval, index) => {
      totalScore += eval.score;
      totalConfidence += eval.confidence;
      eval.evidenceIds.forEach(id => allEvidenceIds.add(id));
      
      mergedMetadata[`evaluation_${index}`] = eval.metadata;
    });

    const avgScore = totalScore / evaluations.length;
    const avgConfidence = totalConfidence / evaluations.length;

    return {
      hypothesisId: evaluations[0].hypothesisId,
      score: avgScore,
      confidence: avgConfidence,
      evidenceIds: Array.from(allEvidenceIds),
      metadata: {
        ...mergedMetadata,
        mergedCount: evaluations.length,
        originalScores: evaluations.map(e => e.score)
      }
    };
  }

  getConfidence(evaluation: Evaluation): number {
    const baseConfidence = evaluation.confidence;
    const evidenceCount = evaluation.evidenceIds.length;
    
    let confidenceMultiplier = 1.0;
    
    if (evidenceCount === 0) {
      confidenceMultiplier = 0.3;
    } else if (evidenceCount === 1) {
      confidenceMultiplier = 0.7;
    } else if (evidenceCount >= 2 && evidenceCount <= 5) {
      confidenceMultiplier = 1.0;
    } else {
      confidenceMultiplier = 0.9;
    }
    
    return Math.min(baseConfidence * confidenceMultiplier, 1.0);
  }

  updateWeights(weights: Record<string, number>): void {
    const validKeys = ['plausibility', 'evidence', 'confidence', 'novelty'];
    let totalWeight = 0;
    
    for (const [key, value] of Object.entries(weights)) {
      if (!validKeys.includes(key)) {
        throw new Error(`Invalid weight key: ${key}`);
      }
      if (value < 0 || value > 1) {
        throw new Error(`Weight for ${key} must be between 0 and 1`);
      }
      this.scoringWeights[key] = value;
      totalWeight += value;
    }
    
    if (Math.abs(totalWeight - 1.0) > 0.01) {
      const scaleFactor = 1.0 / totalWeight;
      for (const key of validKeys) {
        this.scoringWeights[key] *= scaleFactor;
      }
    }
  }

  resetHistory(): void {
    this.evaluationHistory = [];
  }
}
