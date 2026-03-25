interface PaperNode {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  sections: SectionNode[];
  citations: CitationNode[];
  references: ReferenceNode[];
  metadata: Metadata;
}

interface SectionNode {
  id: string;
  title: string;
  content: string;
  level: number;
}

interface CitationNode {
  id: string;
  raw: string;
  type: 'doi' | 'arxiv' | 'url' | 'text';
  identifier: string;
  context: string;
}

interface ReferenceNode {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  doi?: string;
  arxiv?: string;
  url?: string;
}

interface Metadata {
  title: string;
  authors: string[];
  year: number;
  venue: string;
  doi?: string;
  arxiv?: string;
  keywords: string[];
  abstract: string;
}

export class PaperExtractor {
  private parser: ContentParser;
  private resolver: CitationResolver;
  private sourcePath: string;

  constructor(parser: ContentParser, resolver: CitationResolver, sourcePath: string = '') {
    this.parser = parser;
    this.resolver = resolver;
    this.sourcePath = sourcePath;
  }

  async extract(path: string): Promise<PaperNode> {
    const fs = await import('fs/promises');
    const text = await fs.readFile(path, 'utf-8');
    this.sourcePath = path;
    
    const metadata = this.parseMetadata(text);
    const sections = this.parseSections(text);
    const citations = this.parseCitations(text);
    const references = await this.resolveReferences(citations);
    
    const paper: PaperNode = {
      id: this.generatePaperId(metadata),
      title: metadata.title,
      authors: metadata.authors,
      abstract: metadata.abstract,
      sections,
      citations,
      references,
      metadata
    };
    
    this.buildGraph(paper);
    return paper;
  }

  parseMetadata(text: string): Metadata {
    const metadata: Metadata = {
      title: '',
      authors: [],
      year: new Date().getFullYear(),
      venue: '',
      keywords: [],
      abstract: ''
    };

    const titleMatch = text.match(/title:\s*(.+)/i);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }

    const authorMatches = text.match(/authors?:\s*(.+)/i);
    if (authorMatches) {
      metadata.authors = authorMatches[1].split(',').map(a => a.trim());
    }

    const yearMatch = text.match(/year:\s*(\d{4})/i);
    if (yearMatch) {
      metadata.year = parseInt(yearMatch[1], 10);
    }

    const venueMatch = text.match(/venue:\s*(.+)/i);
    if (venueMatch) {
      metadata.venue = venueMatch[1].trim();
    }

    const doiMatch = text.match(/doi:\s*([^\s]+)/i);
    if (doiMatch) {
      metadata.doi = doiMatch[1].trim();
    }

    const arxivMatch = text.match(/arxiv:\s*([^\s]+)/i);
    if (arxivMatch) {
      metadata.arxiv = arxivMatch[1].trim();
    }

    const abstractMatch = text.match(/abstract:\s*([\s\S]+?)(?=\n\w+:|$)/i);
    if (abstractMatch) {
      metadata.abstract = abstractMatch[1].trim();
    }

    const keywordMatch = text.match(/keywords?:\s*(.+)/i);
    if (keywordMatch) {
      metadata.keywords = keywordMatch[1].split(',').map(k => k.trim());
    }

    return metadata;
  }

  parseSections(text: string): SectionNode[] {
    const sections: SectionNode[] = [];
    const sectionRegex = /^(#{1,6})\s+(.+)$/gm;
    let match;
    
    while ((match = sectionRegex.exec(text)) !== null) {
      const level = match[1].length;
      const title = match[2].trim();
      const startPos = match.index;
      const nextMatch = sectionRegex.exec(text);
      const endPos = nextMatch ? nextMatch.index : text.length;
      sectionRegex.lastIndex = match.index;
      
      const content = text.slice(startPos, endPos).replace(/^(#{1,6})\s+(.+)$/m, '').trim();
      
      sections.push({
        id: this.generateSectionId(title),
        title,
        content,
        level
      });
    }
    
    if (sections.length === 0) {
      sections.push({
        id: 'section-1',
        title: 'Content',
        content: text,
        level: 1
      });
    }
    
    return sections;
  }

  parseCitations(text: string): CitationNode[] {
    const citations: CitationNode[] = [];
    
    const doiRegex = /doi:\s*([^\s]+)/gi;
    let doiMatch;
    while ((doiMatch = doiRegex.exec(text)) !== null) {
      citations.push({
        id: this.generateCitationId(doiMatch[1]),
        raw: doiMatch[0],
        type: 'doi',
        identifier: doiMatch[1],
        context: this.extractContext(text, doiMatch.index)
      });
    }
    
    const arxivRegex = /arXiv:\s*([^\s]+)/gi;
    let arxivMatch;
    while ((arxivMatch = arxivRegex.exec(text)) !== null) {
      citations.push({
        id: this.generateCitationId(arxivMatch[1]),
        raw: arxivMatch[0],
        type: 'arxiv',
        identifier: arxivMatch[1],
        context: this.extractContext(text, arxivMatch.index)
      });
    }
    
    const urlRegex = /https?:\/\/[^\s]+/gi;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(text)) !== null) {
      citations.push({
        id: this.generateCitationId(urlMatch[0]),
        raw: urlMatch[0],
        type: 'url',
        identifier: urlMatch[0],
        context: this.extractContext(text, urlMatch.index)
      });
    }
    
    const citationRegex = /\[[^\]]+\]/g;
    let citationMatch;
    while ((citationMatch = citationRegex.exec(text)) !== null) {
      if (!citations.some(c => c.raw === citationMatch[0])) {
        citations.push({
          id: this.generateCitationId(citationMatch[0]),
          raw: citationMatch[0],
          type: 'text',
          identifier: citationMatch[0],
          context: this.extractContext(text, citationMatch.index)
        });
      }
    }
    
    return citations;
  }

  async resolveReferences(citations: CitationNode[]): Promise<ReferenceNode[]> {
    const references: ReferenceNode[] = [];
    
    for (const citation of citations) {
      const resolved = await this.resolver.linkToPaper(citation);
      if (resolved) {
        references.push({
          id: resolved.id,
          title: resolved.title,
          authors: resolved.authors,
          year: resolved.year,
          venue: resolved.venue,
          doi: resolved.doi,
          arxiv: resolved.arxiv,
          url: resolved.url
        });
      }
    }
    
    return references;
  }

  buildGraph(paper: PaperNode): void {
    const graph = new KnowledgeGraph();
    
    const paperNode = graph.addNode({
      id: paper.id,
      label: paper.title,
      properties: new Map([
        ['type', 'paper'],
        ['authors', paper.authors],
        ['year', paper.year],
        ['venue', paper.venue],
        ['abstract', paper.abstract]
      ])
    });
    
    for (const section of paper.sections) {
      const sectionNode = graph.addNode({
        id: section.id,
        label: section.title,
        properties: new Map([
          ['type', 'section'],
          ['level', section.level],
          ['content', section.content]
        ])
      });
      
      graph.addEdge({
        id: `${paper.id}-${section.id}`,
        sourceId: paper.id,
        targetId: section.id,
        label: 'contains',
        weight: 1
      });
    }
    
    for (const citation of paper.citations) {
      const citationNode = graph.addNode({
        id: citation.id,
        label: citation.identifier,
        properties: new Map([
          ['type', 'citation'],
          ['citationType', citation.type],
          ['context', citation.context]
        ])
      });
      
      graph.addEdge({
        id: `${paper.id}-${citation.id}`,
        sourceId: paper.id,
        targetId: citation.id,
        label: 'cites',
        weight: 1
      });
    }
    
    for (const reference of paper.references) {
      const referenceNode = graph.addNode({
        id: reference.id,
        label: reference.title,
        properties: new Map([
          ['type', 'reference'],
          ['authors', reference.authors],
          ['year', reference.year],
          ['venue', reference.venue],
          ['doi', reference.doi],
          ['arxiv', reference.arxiv],
          ['url', reference.url]
        ])
      });
      
      graph.addEdge({
        id: `${paper.id}-${reference.id}`,
        sourceId: paper.id,
        targetId: reference.id,
        label: 'references',
        weight: 1
      });
    }
  }

  private generatePaperId(metadata: Metadata): string {
    const authorPart = metadata.authors.length > 0 ? metadata.authors[0].split(' ').pop() : 'unknown';
    const titlePart = metadata.title.split(' ').slice(0, 3).join('-').toLowerCase();
    return `${authorPart}${metadata.year}${titlePart}`;
  }

  private generateSectionId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  private generateCitationId(identifier: string): string {
    return Buffer.from(identifier).toString('base64').slice(0, 8);
  }

  private extractContext(text: string, position: number, contextSize: number = 200): string {
    const start = Math.max(0, position - contextSize);
    const end = Math.min(text.length, position + contextSize);
    return text.slice(start, end);
  }
}
