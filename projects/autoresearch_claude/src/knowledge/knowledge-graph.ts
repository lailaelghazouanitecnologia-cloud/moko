/**
 * KnowledgeGraph is a directed, weighted graph of KnowledgeNodes connected
 * by KnowledgeEdges, with an inverted index for fast full-text search.
 */

import { KnowledgeNode, KnowledgeNodeData } from "./node";
import { KnowledgeEdge, KnowledgeEdgeData } from "./edge";

/** Inverted index: maps lowercase terms to sets of node ids that contain them. */
type InvertedIndex = Map<string, Set<string>>;

export interface KnowledgeGraphData {
  nodes: KnowledgeNodeData[];
  edges: KnowledgeEdgeData[];
}

export class KnowledgeGraph {
  public nodes: Map<string, KnowledgeNode>;
  public edges: Map<string, KnowledgeEdge>;
  public index: InvertedIndex;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.index = new Map();
  }

  // ---------------------------------------------------------------------------
  // Indexing
  // ---------------------------------------------------------------------------

  /**
   * Extracts searchable terms from a node and returns them as lowercase tokens.
   */
  private tokenize(node: KnowledgeNode): string[] {
    const raw = `${node.label} ${node.content} ${node.type} ${node.tags.join(" ")}`;
    return raw
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 0);
  }

  /**
   * Adds a node's tokens to the inverted index.
   */
  private indexNode(node: KnowledgeNode): void {
    const terms = this.tokenize(node);
    for (const term of terms) {
      let entry = this.index.get(term);
      if (!entry) {
        entry = new Set();
        this.index.set(term, entry);
      }
      entry.add(node.id);
    }
  }

  /**
   * Removes a node's tokens from the inverted index.
   */
  private deindexNode(node: KnowledgeNode): void {
    const terms = this.tokenize(node);
    for (const term of terms) {
      const entry = this.index.get(term);
      if (entry) {
        entry.delete(node.id);
        if (entry.size === 0) {
          this.index.delete(term);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Mutation
  // ---------------------------------------------------------------------------

  /**
   * Adds a node to the graph. If a node with the same id already exists, the
   * two are merged (see KnowledgeNode.merge).
   * Returns the node as stored in the graph after insertion/merge.
   */
  addNode(node: KnowledgeNode): KnowledgeNode {
    const existing = this.nodes.get(node.id);
    if (existing) {
      this.deindexNode(existing);
      const merged = existing.merge(node);
      this.nodes.set(merged.id, merged);
      this.indexNode(merged);
      return merged;
    }

    this.nodes.set(node.id, node);
    this.indexNode(node);
    return node;
  }

  /**
   * Removes a node and all edges connected to it.
   * Returns true if the node existed.
   */
  removeNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    this.deindexNode(node);
    this.nodes.delete(nodeId);

    // Remove all edges touching this node
    for (const [edgeId, edge] of this.edges) {
      if (edge.connects(nodeId)) {
        this.edges.delete(edgeId);
      }
    }

    return true;
  }

  /**
   * Adds an edge to the graph. Both source and target nodes must already exist.
   * If an edge with the same id exists it is replaced.
   */
  addEdge(edge: KnowledgeEdge): KnowledgeEdge {
    if (!this.nodes.has(edge.source)) {
      throw new Error(
        `Cannot add edge "${edge.id}": source node "${edge.source}" not found`
      );
    }
    if (!this.nodes.has(edge.target)) {
      throw new Error(
        `Cannot add edge "${edge.id}": target node "${edge.target}" not found`
      );
    }

    this.edges.set(edge.id, edge);
    return edge;
  }

  /**
   * Removes an edge by id. Returns true if the edge existed.
   */
  removeEdge(edgeId: string): boolean {
    return this.edges.delete(edgeId);
  }

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  /**
   * Finds nodes matching the query string. Uses the inverted index for fast
   * candidate retrieval, then refines with KnowledgeNode.matches().
   * Returns results sorted by descending confidence.
   */
  findNodes(query: string): KnowledgeNode[] {
    if (!query || query.trim() === "") {
      return [];
    }

    const terms = query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .flatMap((t) =>
        t
          .split(/[^a-z0-9]+/)
          .filter((s) => s.length > 0)
      );

    if (terms.length === 0) {
      return [];
    }

    // Start with candidate set from the first term, intersect with the rest
    let candidateIds: Set<string> | null = null;

    for (const term of terms) {
      // Collect all index entries that contain this term as a substring
      const matching = new Set<string>();
      for (const [indexedTerm, nodeIds] of this.index) {
        if (indexedTerm.includes(term)) {
          for (const id of nodeIds) {
            matching.add(id);
          }
        }
      }

      if (candidateIds === null) {
        candidateIds = matching;
      } else {
        // Intersect
        for (const id of candidateIds) {
          if (!matching.has(id)) {
            candidateIds.delete(id);
          }
        }
      }

      if (candidateIds.size === 0) break;
    }

    if (!candidateIds || candidateIds.size === 0) {
      return [];
    }

    // Refine: run full matches() on candidates
    const results: KnowledgeNode[] = [];
    for (const id of candidateIds) {
      const node = this.nodes.get(id);
      if (node && node.matches(query)) {
        results.push(node);
      }
    }

    // Sort by confidence descending, then alphabetically by label for stability
    results.sort((a, b) => {
      const confDiff = b.metadata.confidence - a.metadata.confidence;
      if (confDiff !== 0) return confDiff;
      return a.label.localeCompare(b.label);
    });

    return results;
  }

  /**
   * Returns all nodes directly connected to the given node (via outgoing or
   * incoming edges), along with the connecting edges.
   */
  getNeighbors(
    nodeId: string,
    options?: { direction?: "outgoing" | "incoming" | "both" }
  ): Array<{ node: KnowledgeNode; edge: KnowledgeEdge }> {
    if (!this.nodes.has(nodeId)) {
      return [];
    }

    const direction = options?.direction ?? "both";
    const results: Array<{ node: KnowledgeNode; edge: KnowledgeEdge }> = [];
    const seen = new Set<string>(); // avoid duplicate neighbor entries

    for (const edge of this.edges.values()) {
      let neighborId: string | null = null;

      if (
        (direction === "outgoing" || direction === "both") &&
        edge.source === nodeId
      ) {
        neighborId = edge.target;
      } else if (
        (direction === "incoming" || direction === "both") &&
        edge.target === nodeId
      ) {
        neighborId = edge.source;
      }

      if (neighborId !== null) {
        const neighbor = this.nodes.get(neighborId);
        if (neighbor) {
          const key = `${neighborId}:${edge.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            results.push({ node: neighbor, edge });
          }
        }
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Adjacency helpers (internal)
  // ---------------------------------------------------------------------------

  /**
   * Builds an adjacency list (both directions) for BFS traversal.
   * Each entry maps nodeId -> array of { neighborId, edgeId }.
   */
  private buildAdjacencyList(): Map<
    string,
    Array<{ neighborId: string; edgeId: string }>
  > {
    const adj = new Map<
      string,
      Array<{ neighborId: string; edgeId: string }>
    >();

    for (const nodeId of this.nodes.keys()) {
      adj.set(nodeId, []);
    }

    for (const edge of this.edges.values()) {
      adj.get(edge.source)?.push({ neighborId: edge.target, edgeId: edge.id });
      adj.get(edge.target)?.push({ neighborId: edge.source, edgeId: edge.id });
    }

    return adj;
  }

  /**
   * Finds the shortest path between two nodes using BFS (unweighted).
   * Returns an array of node ids representing the path (inclusive of from and to),
   * or null if no path exists.
   */
  shortestPath(from: string, to: string): string[] | null {
    if (!this.nodes.has(from)) return null;
    if (!this.nodes.has(to)) return null;
    if (from === to) return [from];

    const adj = this.buildAdjacencyList();
    const visited = new Set<string>();
    const parent = new Map<string, string>();
    const queue: string[] = [from];
    visited.add(from);

    while (queue.length > 0) {
      const current = queue.shift()!;

      const neighbors = adj.get(current);
      if (!neighbors) continue;

      for (const { neighborId } of neighbors) {
        if (visited.has(neighborId)) continue;

        visited.add(neighborId);
        parent.set(neighborId, current);

        if (neighborId === to) {
          // Reconstruct path
          const path: string[] = [to];
          let step = to;
          while (step !== from) {
            step = parent.get(step)!;
            path.push(step);
          }
          path.reverse();
          return path;
        }

        queue.push(neighborId);
      }
    }

    return null; // No path found
  }

  // ---------------------------------------------------------------------------
  // Graph composition
  // ---------------------------------------------------------------------------

  /**
   * Merges another graph into this one. Nodes with matching ids are merged,
   * edges are added (overwritten if same id).
   */
  merge(other: KnowledgeGraph): void {
    for (const node of other.nodes.values()) {
      this.addNode(
        new KnowledgeNode({
          id: node.id,
          label: node.label,
          type: node.type,
          content: node.content,
          metadata: { ...node.metadata },
          tags: [...node.tags],
        })
      );
    }

    for (const edge of other.edges.values()) {
      // Only add if both endpoints exist in the merged graph
      if (this.nodes.has(edge.source) && this.nodes.has(edge.target)) {
        this.edges.set(
          edge.id,
          new KnowledgeEdge({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            relation: edge.relation,
            weight: edge.weight,
            metadata: { ...edge.metadata },
          })
        );
      }
    }
  }

  /**
   * Extracts a subgraph containing only the specified nodes and any edges
   * that connect them.
   */
  getSubgraph(nodeIds: string[]): KnowledgeGraph {
    const subgraph = new KnowledgeGraph();
    const idSet = new Set(nodeIds);

    for (const id of nodeIds) {
      const node = this.nodes.get(id);
      if (node) {
        subgraph.addNode(
          new KnowledgeNode({
            id: node.id,
            label: node.label,
            type: node.type,
            content: node.content,
            metadata: { ...node.metadata },
            tags: [...node.tags],
          })
        );
      }
    }

    for (const edge of this.edges.values()) {
      if (idSet.has(edge.source) && idSet.has(edge.target)) {
        subgraph.addEdge(
          new KnowledgeEdge({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            relation: edge.relation,
            weight: edge.weight,
            metadata: { ...edge.metadata },
          })
        );
      }
    }

    return subgraph;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serializes the entire graph to a JSON-safe object.
   */
  toJSON(): KnowledgeGraphData {
    return {
      nodes: Array.from(this.nodes.values()).map((n) => n.toJSON()),
      edges: Array.from(this.edges.values()).map((e) => e.toJSON()),
    };
  }

  /**
   * Reconstructs a KnowledgeGraph from its JSON representation.
   */
  static fromJSON(data: KnowledgeGraphData): KnowledgeGraph {
    const graph = new KnowledgeGraph();

    for (const nodeData of data.nodes) {
      graph.addNode(KnowledgeNode.fromJSON(nodeData));
    }

    for (const edgeData of data.edges) {
      graph.addEdge(KnowledgeEdge.fromJSON(edgeData));
    }

    return graph;
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /** Total number of nodes in the graph. */
  get nodeCount(): number {
    return this.nodes.size;
  }

  /** Total number of edges in the graph. */
  get edgeCount(): number {
    return this.edges.size;
  }

  /** Returns true if the graph has no nodes. */
  get isEmpty(): boolean {
    return this.nodes.size === 0;
  }
}
