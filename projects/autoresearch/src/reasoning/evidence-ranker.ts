import { Evidence } from './hypothesis-evaluator';

export interface RankingStrategy {
    name: string;
    computeScore(relevance: number, reliability: number): number;
}

export class EvidenceRanker {
    private evidencePool: EvidenceItem[];
    private rankingStrategy: RankingStrategy;
    private reliabilityWeights: Map<string, number>;

    constructor() {
        this.evidencePool = [];
        this.reliabilityWeights = new Map<string, number>();
        this.rankingStrategy = {
            name: 'default',
            computeScore: (relevance: number, reliability: number) => {
                return relevance * 0.6 + reliability * 0.4;
            }
        };
    }

    /**
     * Adds an evidence item to the pool for ranking.
     * @param item - The evidence item to add.
     * @throws {TypeError} If the item is null or undefined.
     */
    addEvidence(item: EvidenceItem): void {
        if (!item) {
            throw new TypeError('Evidence item cannot be null or undefined');
        }
        this.evidencePool.push(item);
    }

    /**
     * Ranks all evidence items in the pool based on their relevance and reliability.
     * @returns An array of ranked evidence items.
     * @throws {Error} If ranking fails due to invalid data.
     */
    rankAll(): RankedEvidence[] {
        if (this.evidencePool.length === 0) {
            return [];
        }

        const rankedItems: RankedEvidence[] = [];
        
        for (const item of this.evidencePool) {
            const relevanceScore = this.scoreRelevance(item);
            const reliabilityScore = this.scoreReliability(item);
            const finalScore = this.rankingStrategy.computeScore(relevanceScore, reliabilityScore);
            
            rankedItems.push({
                item: item,
                score: finalScore,
                rank: 0,
                metadata: {}
            });
        }
        
        const sortedItems = this.sortByScore(rankedItems);
        
        for (let i = 0; i < sortedItems.length; i++) {
            sortedItems[i].rank = i + 1;
        }
        
        return sortedItems;
    }

    /**
     * Computes a relevance score for the given evidence item.
     * @param item - The evidence item to score.
     * @returns A relevance score between 0 and 1.
     * @throws {TypeError} If the item is null or undefined.
     */
    scoreRelevance(item: EvidenceItem): number {
        if (!item) {
            throw new TypeError('Evidence item cannot be null or undefined');
        }

        if (item.relevance !== undefined) {
            return Math.max(0, Math.min(1, item.relevance));
        }
        
        let score = 0.5;
        
        if (item.content && item.content.length > 0) {
            const keywordCount = (item.content.match(/\b(keyword|relevant|important|significant)\b/gi) || []).length;
            score += Math.min(0.3, keywordCount * 0.1);
        }
        
        if (item.metadata && item.metadata.confidence) {
            score += Math.min(0.2, (item.metadata.confidence as number) * 0.2);
        }
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Computes a reliability score for the given evidence item.
     * @param item - The evidence item to score.
     * @returns A reliability score between 0 and 1.
     * @throws {TypeError} If the item is null or undefined.
     */
    scoreReliability(item: EvidenceItem): number {
        if (!item) {
            throw new TypeError('Evidence item cannot be null or undefined');
        }

        if (item.reliability !== undefined) {
            return Math.max(0, Math.min(1, item.reliability));
        }
        
        let score = 0.5;
        
        if (item.metadata && item.metadata.source) {
            const source = item.metadata.source as string;
            const sourceWeight = this.reliabilityWeights.get(source);
            if (sourceWeight !== undefined) {
                score = sourceWeight;
            }
        }
        
        if (item.metadata && item.metadata.citations) {
            const citations = item.metadata.citations as number;
            if (citations > 10) {
                score += 0.2;
            } else if (citations > 5) {
                score += 0.1;
            }
        }
        
        if (item.metadata && item.metadata.peerReviewed) {
            score += 0.15;
        }
        
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Applies a weighting model to an array of scores.
     * @param scores - Array of scores to weight.
     * @returns The weighted score.
     * @throws {TypeError} If scores is not an array.
     */
    applyWeights(scores: number[]): number {
        if (!Array.isArray(scores)) {
            throw new TypeError('Scores must be an array');
        }

        if (scores.length === 0) return 0;
        
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (let i = 0; i < scores.length; i++) {
            const weight = 1 / (i + 1);
            weightedSum += scores[i] * weight;
            totalWeight += weight;
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    /**
     * Returns the top k ranked evidence items.
     * @param k - Number of top items to return.
     * @returns Array of top k ranked evidence items.
     * @throws {TypeError} If k is not a non-negative integer.
     */
    topK(k: number): RankedEvidence[] {
        if (!Number.isInteger(k) || k < 0) {
            throw new TypeError('k must be a non-negative integer');
        }

        const ranked = this.rankAll();
        return ranked.slice(0, Math.max(0, k));
    }

    /**
     * Sorts an array of ranked evidence items by score in descending order.
     * @param items - Array of ranked evidence items.
     * @returns Sorted array.
     * @throws {TypeError} If items is not an array.
     */
    sortByScore(items: RankedEvidence[]): RankedEvidence[] {
        if (!Array.isArray(items)) {
            throw new TypeError('Items must be an array');
        }

        return items.sort((a, b) => b.score - a.score);
    }

    /**
     * Filters ranked evidence items by a minimum score threshold.
     * @param threshold - Minimum score to include.
     * @returns Filtered array of ranked evidence items.
     * @throws {TypeError} If threshold is not a number.
     */
    filterByThreshold(threshold: number): RankedEvidence[] {
        if (typeof threshold !== 'number' || isNaN(threshold)) {
            throw new TypeError('Threshold must be a valid number');
        }

        const ranked = this.rankAll();
        return ranked.filter(item => item.score >= threshold);
    }

    /**
     * Sets the reliability weight for a specific source.
     * @param source - The source identifier.
     * @param weight - The weight to assign (0 to 1).
     * @throws {TypeError} If source is not a string or weight is not a number between 0 and 1.
     */
    setReliabilityWeight(source: string, weight: number): void {
        if (typeof source !== 'string' || source.trim() === '') {
            throw new TypeError('Source must be a non-empty string');
        }
        if (typeof weight !== 'number' || isNaN(weight) || weight < 0 || weight > 1) {
            throw new TypeError('Weight must be a number between 0 and 1');
        }
        this.reliabilityWeights.set(source, weight);
    }

    /**
     * Gets the current reliability weight for a source.
     * @param source - The source identifier.
     * @returns The weight or undefined if not set.
     */
    getReliabilityWeight(source: string): number | undefined {
        if (typeof source !== 'string') {
            throw new TypeError('Source must be a string');
        }
        return this.reliabilityWeights.get(source);
    }

    /**
     * Sets the ranking strategy.
     * @param strategy - The new ranking strategy.
     * @throws {TypeError} If strategy is null or invalid.
     */
    setRankingStrategy(strategy: RankingStrategy): void {
        if (!strategy || typeof strategy.name !== 'string' || typeof strategy.computeScore !== 'function') {
            throw new TypeError('Invalid ranking strategy');
        }
        this.rankingStrategy = strategy;
    }

    /**
     * Clears all evidence from the pool.
     */
    clearEvidencePool(): void {
        this.evidencePool = [];
    }

    /**
     * Gets the current size of the evidence pool.
     * @returns Number of evidence items in the pool.
     */
    getPoolSize(): number {
        return this.evidencePool.length;
    }
}

export interface EvidenceItem extends Evidence {
    hypothesisId?: string;
}

export interface RankedEvidence {
    item: EvidenceItem;
    score: number;
    rank: number;
    metadata: Record<string, unknown>;
}