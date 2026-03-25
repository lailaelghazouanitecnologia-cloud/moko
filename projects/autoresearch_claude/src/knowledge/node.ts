/**
 * KnowledgeNode represents a single piece of knowledge in the graph:
 * a fact, concept, entity, or claim discovered during research.
 */

export type NodeType = "entity" | "concept" | "fact" | "claim";

export interface NodeMetadata {
  source: string;
  confidence: number;
  timestamp: number;
  [key: string]: unknown;
}

export interface KnowledgeNodeData {
  id: string;
  label: string;
  type: NodeType;
  content: string;
  metadata: NodeMetadata;
  tags: string[];
}

export class KnowledgeNode {
  public readonly id: string;
  public label: string;
  public type: NodeType;
  public content: string;
  public metadata: NodeMetadata;
  public tags: string[];

  constructor(data: KnowledgeNodeData) {
    if (!data.id || data.id.trim() === "") {
      throw new Error("KnowledgeNode requires a non-empty id");
    }
    if (!data.label || data.label.trim() === "") {
      throw new Error("KnowledgeNode requires a non-empty label");
    }

    this.id = data.id;
    this.label = data.label;
    this.type = data.type;
    this.content = data.content;
    this.metadata = { ...data.metadata };
    this.tags = [...data.tags];
  }

  /**
   * Returns true if this node matches the given query string.
   * Searches across label, content, tags, and type (case-insensitive).
   */
  matches(query: string): boolean {
    if (!query || query.trim() === "") {
      return false;
    }

    const lowerQuery = query.toLowerCase().trim();
    const terms = lowerQuery.split(/\s+/);

    const searchable = [
      this.label.toLowerCase(),
      this.content.toLowerCase(),
      this.type.toLowerCase(),
      ...this.tags.map((t) => t.toLowerCase()),
    ].join(" ");

    return terms.every((term) => searchable.includes(term));
  }

  /**
   * Merges another node into this one. The other node must have the same id.
   * Content is concatenated (deduplicated), tags are unioned, and metadata
   * is merged with the higher-confidence value winning for shared keys.
   * The newer timestamp is kept.
   */
  merge(other: KnowledgeNode): KnowledgeNode {
    if (this.id !== other.id) {
      throw new Error(
        `Cannot merge nodes with different ids: "${this.id}" vs "${other.id}"`
      );
    }

    // Pick the higher-confidence node as the primary source for label/type
    const primary =
      other.metadata.confidence > this.metadata.confidence ? other : this;
    const secondary = primary === this ? other : this;

    // Merge content: if they differ, concatenate with separator
    let mergedContent: string;
    if (this.content === other.content) {
      mergedContent = this.content;
    } else {
      // Avoid duplicating content that's a substring of the other
      if (this.content.includes(other.content)) {
        mergedContent = this.content;
      } else if (other.content.includes(this.content)) {
        mergedContent = other.content;
      } else {
        mergedContent = `${this.content}\n\n${other.content}`;
      }
    }

    // Union tags, preserving order (this first, then new ones from other)
    const tagSet = new Set(this.tags);
    const mergedTags = [...this.tags];
    for (const tag of other.tags) {
      if (!tagSet.has(tag)) {
        mergedTags.push(tag);
        tagSet.add(tag);
      }
    }

    // Merge metadata: spread both, then set confidence to max and timestamp to latest
    const mergedMetadata: NodeMetadata = {
      ...secondary.metadata,
      ...primary.metadata,
      confidence: Math.max(this.metadata.confidence, other.metadata.confidence),
      timestamp: Math.max(this.metadata.timestamp, other.metadata.timestamp),
    };

    return new KnowledgeNode({
      id: this.id,
      label: primary.label,
      type: primary.type,
      content: mergedContent,
      metadata: mergedMetadata,
      tags: mergedTags,
    });
  }

  /**
   * Serializes this node to a plain JSON-safe object.
   */
  toJSON(): KnowledgeNodeData {
    return {
      id: this.id,
      label: this.label,
      type: this.type,
      content: this.content,
      metadata: { ...this.metadata },
      tags: [...this.tags],
    };
  }

  /**
   * Reconstructs a KnowledgeNode from its JSON representation.
   */
  static fromJSON(data: KnowledgeNodeData): KnowledgeNode {
    return new KnowledgeNode(data);
  }
}
