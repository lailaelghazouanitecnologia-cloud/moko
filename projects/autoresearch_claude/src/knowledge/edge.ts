/**
 * KnowledgeEdge represents a directed relationship between two
 * KnowledgeNodes in the graph.
 */

export interface EdgeMetadata {
  [key: string]: unknown;
}

export interface KnowledgeEdgeData {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight: number;
  metadata: EdgeMetadata;
}

/** Well-known relation types for documentation; any string is accepted at runtime. */
export type CommonRelation =
  | "cites"
  | "supports"
  | "contradicts"
  | "relates_to"
  | "is_a"
  | "part_of"
  | "derived_from"
  | "causes"
  | "precedes";

/** Map of relations to their semantic inverses. */
const RELATION_INVERSES: Record<string, string> = {
  cites: "cited_by",
  cited_by: "cites",
  supports: "supported_by",
  supported_by: "supports",
  contradicts: "contradicts", // symmetric
  relates_to: "relates_to", // symmetric
  is_a: "has_instance",
  has_instance: "is_a",
  part_of: "has_part",
  has_part: "part_of",
  derived_from: "derives",
  derives: "derived_from",
  causes: "caused_by",
  caused_by: "causes",
  precedes: "follows",
  follows: "precedes",
};

export class KnowledgeEdge {
  public readonly id: string;
  public source: string;
  public target: string;
  public relation: string;
  public weight: number;
  public metadata: EdgeMetadata;

  constructor(data: KnowledgeEdgeData) {
    if (!data.id || data.id.trim() === "") {
      throw new Error("KnowledgeEdge requires a non-empty id");
    }
    if (!data.source || data.source.trim() === "") {
      throw new Error("KnowledgeEdge requires a non-empty source");
    }
    if (!data.target || data.target.trim() === "") {
      throw new Error("KnowledgeEdge requires a non-empty target");
    }
    if (!data.relation || data.relation.trim() === "") {
      throw new Error("KnowledgeEdge requires a non-empty relation");
    }
    if (data.source === data.target) {
      throw new Error("KnowledgeEdge cannot connect a node to itself");
    }
    if (!Number.isFinite(data.weight) || data.weight < 0 || data.weight > 1) {
      throw new Error("KnowledgeEdge weight must be a finite number between 0 and 1");
    }

    this.id = data.id;
    this.source = data.source;
    this.target = data.target;
    this.relation = data.relation;
    this.weight = data.weight;
    this.metadata = { ...data.metadata };
  }

  /**
   * Returns true if the given nodeId is either the source or target of this edge.
   */
  connects(nodeId: string): boolean {
    return this.source === nodeId || this.target === nodeId;
  }

  /**
   * Creates a new edge with source and target swapped, and the relation
   * replaced by its semantic inverse (if known) or prefixed with "inverse_".
   * The id is also updated to reflect the reversal.
   */
  reverse(): KnowledgeEdge {
    const inverseRelation =
      RELATION_INVERSES[this.relation] ?? `inverse_${this.relation}`;

    return new KnowledgeEdge({
      id: `${this.id}_rev`,
      source: this.target,
      target: this.source,
      relation: inverseRelation,
      weight: this.weight,
      metadata: { ...this.metadata },
    });
  }

  /**
   * Serializes this edge to a plain JSON-safe object.
   */
  toJSON(): KnowledgeEdgeData {
    return {
      id: this.id,
      source: this.source,
      target: this.target,
      relation: this.relation,
      weight: this.weight,
      metadata: { ...this.metadata },
    };
  }

  /**
   * Reconstructs a KnowledgeEdge from its JSON representation.
   */
  static fromJSON(data: KnowledgeEdgeData): KnowledgeEdge {
    return new KnowledgeEdge(data);
  }
}
