import { KnowledgeGraph } from '../knowledge/knowledge-graph';
import { Node } from '../knowledge/node';
import { Edge } from '../knowledge/edge';
import { WebSearcher } from '../search/web-searcher';
import { QueryBuilder } from '../search/query-builder';
import { SearchResult } from '../search/search-result';

export interface CitationNode {
  id: string;
  type: 'doi' | 'arxiv' | 'raw';
  identifier: string;
  context: string;
  position: number;
  raw: string;
}

export interface ResolvedCitation {
  citation: CitationNode;
  paper: Node | null;
  resolutionMethod: 'graph' | 'search' | 'manual';
  confidence: number;
  metadata: Record<string, any>;
}

/**
 * Resolves and links citations found in papers.
 */
export class CitationResolver {
  private citationIndex: Map<string, CitationNode> = new Map();
  private resolutionCache: Map<string, ResolvedCitation> = new Map();
  private graphConnector: KnowledgeGraph;

  constructor(graphConnector: KnowledgeGraph) {
    if (!graphConnector) {
      throw new Error('graphConnector is required');
    }
    this.graphConnector = graphConnector;
  }

  /**
   * Extract and link citations from the provided content.
   * @param content The text content to scan for citations.
   * @returns Array of resolved citations.
   */
  resolveCitations(content: string): ResolvedCitation[] {
    if (typeof content !== 'string') {
      throw new TypeError('content must be a string');
    }

    const citations = this.extractCitationsFromContent(content);
    const resolved: ResolvedCitation[] = [];

    for (const citation of citations) {
      const key = this.buildCitationKey(citation);
      let resolvedCitation = this.resolutionCache.get(key);

      if (!resolvedCitation) {
        const paper = this.linkToPaper(citation);
        resolvedCitation = {
          citation,
          paper,
          resolutionMethod: paper ? 'graph' : 'search',
          confidence: paper ? 0.9 : 0.1,
          metadata: {}
        };
        this.resolutionCache.set(key, resolvedCitation);
      }

      resolved.push(resolvedCitation);
      this.citationIndex.set(key, citation);
    }

    this.updateGraph(resolved);
    return resolved;
  }

  /**
   * Parse a single raw citation string into a CitationNode.
   * @param raw The raw citation string.
   * @returns Parsed citation node.
   */
  parseCitation(raw: string): CitationNode {
    if (typeof raw !== 'string') {
      throw new TypeError('raw must be a string');
    }

    const doiMatch = raw.match(/10\.\d{4,}\/[^\s]+/);
    if (doiMatch) {
      return {
        id: `doi_${Math.random()}`,
        type: 'doi',
        identifier: this.normalizeDOI(doiMatch[0]),
        context: '',
        position: 0,
        raw
      };
    }

    const arxivMatch = raw.match(/arXiv:\d{4}\.\d{4,5}(v\d+)?/);
    if (arxivMatch) {
      return {
        id: `arxiv_${Math.random()}`,
        type: 'arxiv',
        identifier: this.normalizeArXiv(arxivMatch[0]),
        context: '',
        position: 0,
        raw
      };
    }

    return {
      id: `raw_${Math.random()}`,
      type: 'raw',
      identifier: raw,
      context: '',
      position: 0,
      raw
    };
  }

  /**
   * Find the paper node that matches the given citation.
   * @param citation The citation node to link.
   * @returns The matched paper node or null if not found.
   */
  linkToPaper(citation: CitationNode): Node | null {
    if (!citation || typeof citation !== 'object') {
      throw new TypeError('citation must be a valid CitationNode');
    }

    const key = this.buildCitationKey(citation);
    
    for (const node of this.graphConnector.nodes.values()) {
      if (node.getLabel() === 'paper') {
        const identifier = node.getProperty('identifier');
        if (identifier === citation.identifier) {
          return node;
        }
        
        const doi = node.getProperty('doi');
        if (doi && this.normalizeDOI(doi) === citation.identifier) {
          return node;
        }
        
        const arxiv = node.getProperty('arxiv');
        if (arxiv && this.normalizeArXiv(arxiv) === citation.identifier) {
          return node;
        }
      }
    }

    const searcher = new WebSearcher();
    const query = new QueryBuilder()
      .setQuery(citation.identifier)
      .setMaxResults(1)
      .build();

    searcher.search(query).then((results: SearchResult[]) => {
      if (results.length > 0) {
        const paperNode = new Node(
          `paper_${Math.random()}`,
          'paper',
          new Map([
            ['title', results[0].getTitle()],
            ['url', results[0].getUrl()],
            ['identifier', citation.identifier],
            ['doi', citation.type === 'doi' ? citation.identifier : ''],
            ['arxiv', citation.type === 'arxiv' ? citation.identifier : ''],
            ['confidence', 0.7]
          ])
        );
        this.graphConnector.addNode(paperNode);
        return paperNode;
      }
    });

    return null;
  }

  /**
   * Update the knowledge graph with resolved citations.
   * @param resolved Array of resolved citations to add to the graph.
   */
  updateGraph(resolved: ResolvedCitation[]): void {
    if (!Array.isArray(resolved)) {
      throw new TypeError('resolved must be an array');
    }

    for (const resolvedCitation of resolved) {
      if (resolvedCitation.paper && resolvedCitation.citation) {
        const citationNode = new Node(
          `citation_${Math.random()}`,
          'citation',
          new Map([
            ['identifier', resolvedCitation.citation.identifier],
            ['type', resolvedCitation.citation.type],
            ['context', resolvedCitation.citation.context]
          ])
        );
        
        this.graphConnector.addNode(citationNode);
        
        const edge = new Edge(
          `edge_${Math.random()}`,
          citationNode.getId(),
          resolvedCitation.paper.getId(),
          'cites',
          resolvedCitation.confidence
        );
        
        this.graphConnector.addEdge(edge);
      }
    }
  }

  /**
   * Normalize a DOI string by trimming, lowercasing, and removing the 'doi:' prefix.
   * @param doi The DOI string to normalize.
   * @returns Normalized DOI string.
   */
  normalizeDOI(doi: string): string {
    if (typeof doi !== 'string') {
      throw new TypeError('doi must be a string');
    }
    return doi.trim().toLowerCase().replace(/^doi:/, '');
  }

  /**
   * Normalize an arXiv ID string by trimming, lowercasing, and removing the 'arxiv:' prefix.
   * @param id The arXiv ID string to normalize.
   * @returns Normalized arXiv ID string.
   */
  normalizeArXiv(id: string): string {
    if (typeof id !== 'string') {
      throw new TypeError('id must be a string');
    }
    return id.trim().toLowerCase().replace(/^arxiv:/, '');
  }

  /**
   * Build a unique key for a citation node.
   * @param node The citation node.
   * @returns Unique key string.
   */
  buildCitationKey(node: CitationNode): string {
    if (!node || typeof node !== 'object') {
      throw new TypeError('node must be a valid CitationNode');
    }

    const normalized = node.type === 'doi' 
      ? this.normalizeDOI(node.identifier)
      : node.type === 'arxiv'
      ? this.normalizeArXiv(node.identifier)
      : node.identifier;
      
    return `${node.type}:${normalized}`;
  }

  /**
   * Get all citations that could not be linked to a paper.
   * @returns Array of unresolved citation nodes.
   */
  getUnresolved(): CitationNode[] {
    const unresolved: CitationNode[] = [];
    
    for (const [key, citation] of this.citationIndex) {
      const resolved = this.resolutionCache.get(key);
      if (!resolved || !resolved.paper) {
        unresolved.push(citation);
      }
    }
    
    return unresolved;
  }

  private extractCitationsFromContent(content: string): CitationNode[] {
    if (typeof content !== 'string') {
      throw new TypeError('content must be a string');
    }

    const doiRegex = /10\.\d{4,}\/[^\s]+/g;
    const arxivRegex = /arXiv:\d{4}\.\d{4,5}(v\d+)?/g;
    const citationRegex = /\[[^\]]+\]/g;

    const citations: CitationNode[] = [];
    let match: RegExpExecArray | null;

    while ((match = doiRegex.exec(content)) !== null) {
      citations.push({
        id: `doi_${match.index}`,
        type: 'doi',
        identifier: this.normalizeDOI(match[0]),
        context: this.extractContext(content, match.index),
        position: match.index,
        raw: match[0]
      });
    }

    while ((match = arxivRegex.exec(content)) !== null) {
      citations.push({
        id: `arxiv_${match.index}`,
        type: 'arxiv',
        identifier: this.normalizeArXiv(match[0]),
        context: this.extractContext(content, match.index),
        position: match.index,
        raw: match[0]
      });
    }

    while ((match = citationRegex.exec(content)) !== null) {
      if (!citations.some(c => c.position === match!.index)) {
        citations.push({
          id: `raw_${match.index}`,
          type: 'raw',
          identifier: match[0],
          context: this.extractContext(content, match.index),
          position: match.index,
          raw: match[0]
        });
      }
    }

    return citations;
  }

  private extractContext(content: string, position: number, contextSize: number = 200): string {
    if (typeof content !== 'string') {
      throw new TypeError('content must be a string');
    }
    if (typeof position !== 'number' || position < 0 || position > content.length) {
      throw new RangeError('position must be a valid index within content');
    }
    if (typeof contextSize !== 'number' || contextSize <= 0) {
      throw new RangeError('contextSize must be a positive number');
    }

    const start = Math.max(0, position - contextSize / 2);
    const end = Math.min(content.length, position + contextSize / 2);
    return content.substring(start, end).trim();
  }
}