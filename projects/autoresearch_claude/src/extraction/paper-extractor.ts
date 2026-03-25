/**
 * PaperExtractor - Extracts structured paper data from various academic sources.
 * Supports arXiv HTML, generic PDF text, and raw content with template-based extraction.
 */

import { ContentParser, Citation } from "./content-parser";

export interface Reference {
  raw: string;
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  venue: string;
  citedBy: number[];
}

export interface Paper {
  title: string;
  authors: string[];
  year: number | null;
  abstract: string;
  sections: { heading: string; level: number; content: string }[];
  references: Reference[];
  keywords: string[];
  doi?: string;
  source?: string;
  url?: string;
}

export interface PaperMetadata {
  title: string;
  authors: string[];
  year: number | null;
  doi: string | null;
  abstract: string;
}

interface SourceTemplate {
  name: string;
  urlPattern: RegExp;
  titleSelector: RegExp;
  authorsSelector: RegExp;
  abstractSelector: RegExp;
  dateSelector: RegExp;
}

export class PaperExtractor {
  readonly parser: ContentParser;
  readonly templates: SourceTemplate[];

  constructor(parser?: ContentParser) {
    this.parser = parser || new ContentParser();

    this.templates = [
      {
        name: "arxiv",
        urlPattern: /arxiv\.org/i,
        titleSelector: /(?:Title:\s*|<h1[^>]*>)(.*?)(?:<\/h1>|\n)/i,
        authorsSelector:
          /(?:Authors?:\s*|<div[^>]*class="authors"[^>]*>)(.*?)(?:<\/div>|\n)/i,
        abstractSelector:
          /(?:Abstract:\s*|<blockquote[^>]*class="abstract"[^>]*>(?:\s*<span[^>]*>Abstract:<\/span>\s*)?)([\s\S]*?)(?:<\/blockquote>|\n\n)/i,
        dateSelector:
          /(?:Submitted|Date)[:\s]*(\d{1,2}\s+\w+\s+\d{4}|\d{4}-\d{2}-\d{2}|\w+\s+\d{4})/i,
      },
      {
        name: "doi",
        urlPattern: /doi\.org/i,
        titleSelector: /(?:<title>|<h1[^>]*>)(.*?)(?:<\/title>|<\/h1>)/i,
        authorsSelector:
          /(?:<meta[^>]*name="citation_author"[^>]*content=")(.*?)"/gi,
        abstractSelector:
          /(?:<div[^>]*class="abstract"[^>]*>|Abstract[\s.:]*\n?)([\s\S]*?)(?:<\/div>|\n\n)/i,
        dateSelector: /(?:Published|Date)[:\s]*(\d{4})/i,
      },
      {
        name: "generic",
        urlPattern: /.*/,
        titleSelector: /^\s*(.{10,200})\s*$/m,
        authorsSelector:
          /(?:by|authors?)[:\s]*((?:[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+)(?:\s*[,;&]\s*(?:[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+))*)/i,
        abstractSelector:
          /Abstract[\s.:]*\n?([\s\S]{50,3000}?)(?:\n\s*\n|\n\s*(?:1\.?\s+)?Introduction)/i,
        dateSelector: /\b((?:19|20)\d{2})\b/,
      },
    ];
  }

  /**
   * Extract a Paper object from a URL and its raw content.
   * Selects the best extraction template based on URL.
   */
  extract(url: string, rawContent: string): Paper {
    const template = this.selectTemplate(url);
    const cleaned = this.parser.cleanText(rawContent);

    let paper: Paper;
    if (template.name === "arxiv") {
      paper = this.extractFromArxiv(cleaned);
    } else {
      paper = this.extractFromGeneric(cleaned, template);
    }

    paper.url = url;
    paper.source = template.name;

    // Ensure keywords are populated
    if (paper.keywords.length === 0) {
      const fullText = [paper.abstract, ...paper.sections.map((s) => s.content)]
        .join(" ");
      paper.keywords = this.parser
        .extractKeyTerms(fullText, 15)
        .map((kt) => kt.term);
    }

    return paper;
  }

  /**
   * Extract paper data from arXiv-style content (HTML or plain text).
   */
  extractFromArxiv(content: string): Paper {
    const metadata = this.extractMetadata(content);
    const parsed = this.parser.parse(content);
    const references = this.extractReferences(content);

    // arXiv-specific: try to find subject/category keywords
    const categoryMatch = content.match(
      /(?:Subjects?|Categor(?:y|ies)):\s*([\w\-.,;\s]+)/i
    );
    const categories = categoryMatch
      ? categoryMatch[1].split(/[,;]\s*/).map((c) => c.trim()).filter(Boolean)
      : [];

    const keyTerms = this.parser
      .extractKeyTerms(
        [metadata.abstract, ...parsed.sections.map((s) => s.content)].join(" "),
        15
      )
      .map((kt) => kt.term);

    return {
      title: metadata.title || parsed.title,
      authors: metadata.authors,
      year: metadata.year,
      abstract: metadata.abstract || parsed.abstract,
      sections: parsed.sections,
      references,
      keywords: [...new Set([...categories, ...keyTerms])],
      doi: metadata.doi || undefined,
    };
  }

  /**
   * Extract paper data from raw PDF-extracted text.
   */
  extractFromPDF(text: string): Paper {
    const cleaned = this.parser.cleanText(text);
    const metadata = this.extractMetadata(cleaned);
    const parsed = this.parser.parse(cleaned);
    const references = this.extractReferences(cleaned);

    const keyTerms = this.parser
      .extractKeyTerms(cleaned, 15)
      .map((kt) => kt.term);

    return {
      title: metadata.title || parsed.title,
      authors: metadata.authors,
      year: metadata.year,
      abstract: metadata.abstract || parsed.abstract,
      sections: parsed.sections,
      references,
      keywords: keyTerms,
      doi: metadata.doi || undefined,
      source: "pdf",
    };
  }

  /**
   * Extract metadata fields from text: title, authors, year, DOI, abstract.
   */
  extractMetadata(text: string): PaperMetadata {
    const title = this.extractTitle(text);
    const authors = this.extractAuthors(text);
    const year = this.extractYear(text);
    const doi = this.extractDOI(text);
    const abstract = this.extractAbstract(text);

    return { title, authors, year, doi, abstract };
  }

  /**
   * Extract references from text and return structured Reference objects.
   */
  extractReferences(text: string): Reference[] {
    // Find the references section
    const refSectionMatch = text.match(
      /(?:^|\n)\s*(?:References|Bibliography|Works\s+Cited)[\s.:]*\n([\s\S]*?)$/i
    );

    if (!refSectionMatch) return [];

    const refBlock = refSectionMatch[1];
    const references: Reference[] = [];

    // Split into individual entries - try numbered first
    let entries: string[];
    const numberedSplit = refBlock.split(
      /\n\s*\[?\d+\]?[.)]\s+/
    );

    if (numberedSplit.length > 2) {
      entries = numberedSplit.filter((e) => e.trim().length > 10);
    } else {
      // Split by blank lines
      entries = refBlock
        .split(/\n\s*\n/)
        .filter((e) => e.trim().length > 10);
    }

    for (const entry of entries) {
      const ref = this.parseReferenceEntry(entry.trim());
      if (ref) {
        references.push(ref);
      }
    }

    return references;
  }

  // --- Private helpers ---

  private selectTemplate(url: string): SourceTemplate {
    for (const template of this.templates) {
      if (template.urlPattern.test(url)) {
        return template;
      }
    }
    return this.templates[this.templates.length - 1]; // generic fallback
  }

  private extractFromGeneric(content: string, template: SourceTemplate): Paper {
    const metadata = this.extractMetadata(content);
    const parsed = this.parser.parse(content);
    const references = this.extractReferences(content);

    return {
      title: metadata.title || parsed.title,
      authors: metadata.authors,
      year: metadata.year,
      abstract: metadata.abstract || parsed.abstract,
      sections: parsed.sections,
      references,
      keywords: [],
      doi: metadata.doi || undefined,
    };
  }

  private extractTitle(text: string): string {
    // Try HTML title tag first
    const htmlTitle = text.match(/<title>(.*?)<\/title>/i);
    if (htmlTitle) return this.stripHtml(htmlTitle[1]).trim();

    // Try "Title: ..." format
    const labeled = text.match(/Title:\s*(.+)/i);
    if (labeled) return labeled[1].trim();

    // First substantial line
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      const clean = this.stripHtml(line);
      if (
        clean.length >= 10 &&
        clean.length <= 300 &&
        !/^(abstract|keywords|introduction|author|date|submitted)/i.test(clean)
      ) {
        return clean;
      }
    }

    return "";
  }

  private extractAuthors(text: string): string[] {
    // Try "Authors: ..." format
    const labeled = text.match(
      /Authors?:\s*(.*?)(?:\n|<)/i
    );
    if (labeled) {
      return this.parseAuthorList(labeled[1]);
    }

    // Try "by Author1, Author2" format
    const byLine = text.match(
      /\bby\s+((?:[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+)(?:\s*[,;&and]+\s*(?:[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+))*)/i
    );
    if (byLine) {
      return this.parseAuthorList(byLine[1]);
    }

    // Try meta tags
    const metaAuthors: string[] = [];
    const metaPattern = /citation_author"[^>]*content="([^"]+)"/gi;
    let metaMatch: RegExpExecArray | null;
    while ((metaMatch = metaPattern.exec(text)) !== null) {
      metaAuthors.push(metaMatch[1].trim());
    }
    if (metaAuthors.length > 0) return metaAuthors;

    return [];
  }

  private parseAuthorList(raw: string): string[] {
    const cleaned = this.stripHtml(raw);
    return cleaned
      .split(/\s*[,;&]\s*|\s+and\s+/i)
      .map((a) => a.trim())
      .filter((a) => a.length > 1 && /[A-Z]/.test(a));
  }

  private extractYear(text: string): number | null {
    // Try labeled date
    const labeled = text.match(
      /(?:Published|Submitted|Date|Year)[:\s]*.*?(\b(?:19|20)\d{2}\b)/i
    );
    if (labeled) return parseInt(labeled[1], 10);

    // Try copyright
    const copyright = text.match(/(?:\u00A9|copyright)\s*(\d{4})/i);
    if (copyright) return parseInt(copyright[1], 10);

    // First plausible year
    const yearMatch = text.match(/\b(20[0-2]\d|19\d{2})\b/);
    return yearMatch ? parseInt(yearMatch[1], 10) : null;
  }

  private extractDOI(text: string): string | null {
    const doiMatch = text.match(/\b(10\.\d{4,9}\/[^\s,;}\]]+)/);
    return doiMatch ? doiMatch[1] : null;
  }

  private extractAbstract(text: string): string {
    // HTML abstract
    const htmlAbstract = text.match(
      /<(?:blockquote|div)[^>]*class="abstract"[^>]*>([\s\S]*?)<\/(?:blockquote|div)>/i
    );
    if (htmlAbstract) {
      return this.stripHtml(htmlAbstract[1]).trim().replace(/\s+/g, " ");
    }

    // Labeled abstract
    const labeled = text.match(
      /Abstract[\s.:]*\n?([\s\S]{50,3000}?)(?:\n\s*\n|\n\s*(?:\d+\.?\s+)?(?:Introduction|Keywords|1\s))/i
    );
    if (labeled) {
      return labeled[1].trim().replace(/\s+/g, " ");
    }

    return "";
  }

  private parseReferenceEntry(entry: string): Reference | null {
    const clean = this.stripHtml(entry).replace(/\s+/g, " ").trim();
    if (clean.length < 10) return null;

    // Try to extract authors (at the beginning, before the year)
    const authorYearSplit = clean.match(
      /^(.*?)\s*\(?((?:19|20)\d{2})\)?[.,\s]/
    );

    let authors: string[] = [];
    let year: number | null = null;
    let remainder = clean;

    if (authorYearSplit) {
      authors = this.parseAuthorList(authorYearSplit[1]);
      year = parseInt(authorYearSplit[2], 10);
      remainder = clean.slice(authorYearSplit[0].length);
    } else {
      // Try finding year anywhere
      const yearMatch = clean.match(/\b((?:19|20)\d{2})\b/);
      if (yearMatch) year = parseInt(yearMatch[1], 10);
    }

    // Title is typically in quotes or the first sentence-like segment after authors/year
    let title = "";
    const quotedTitle = remainder.match(/"([^"]+)"|"([^"]+)"/);
    if (quotedTitle) {
      title = (quotedTitle[1] || quotedTitle[2]).trim();
    } else {
      // Take first sentence-like chunk
      const sentenceMatch = remainder.match(/\s*([^.]{10,200})\./);
      if (sentenceMatch) {
        title = sentenceMatch[1].trim();
      }
    }

    // DOI
    const doiMatch = clean.match(/\b(10\.\d{4,9}\/[^\s,;}\]]+)/);
    const doi = doiMatch ? doiMatch[1] : null;

    // Venue: typically in italics or after "In" / journal name
    let venue = "";
    const venueMatch = clean.match(
      /(?:In\s+|(?:Journal|Proceedings|Conference|Trans\.|IEEE|ACM)\s+)([^.]+)/i
    );
    if (venueMatch) {
      venue = venueMatch[0].trim();
    }

    return {
      raw: clean,
      title: title || clean.slice(0, 100),
      authors,
      year,
      doi,
      venue,
      citedBy: [],
    };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
