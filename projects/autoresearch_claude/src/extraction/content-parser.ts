/**
 * ContentParser - Parses raw text content into structured academic data.
 * Handles citation extraction, section splitting, keyword analysis, and text cleaning.
 */

export interface Citation {
  raw: string;
  type: "numeric" | "author-year" | "author-et-al" | "unknown";
  authors?: string[];
  year?: number;
  index?: number;
  position: number;
}

export interface KeyTerm {
  term: string;
  frequency: number;
  score: number;
}

export interface ParsedContent {
  title: string;
  abstract: string;
  sections: Section[];
  references: string[];
  citations: Citation[];
  keywords: string[];
}

export interface Section {
  heading: string;
  level: number;
  content: string;
}

export class ContentParser {
  readonly patterns: Record<string, RegExp>;
  readonly stopWords: Set<string>;

  constructor() {
    this.patterns = {
      // [1], [2,3], [1-5]
      numericCitation: /\[(\d+(?:\s*[,\-\u2013]\s*\d+)*)\]/g,
      // (Author, 2023) or (Author & Other, 2023)
      authorYearCitation:
        /\(([A-Z][a-z]+(?:\s*(?:&|and)\s*[A-Z][a-z]+)*),?\s*(\d{4})\)/g,
      // Author et al. (2023) or Author et al., 2023
      authorEtAlCitation:
        /([A-Z][a-z]+)\s+et\s+al\.?\s*[,(]?\s*(\d{4})\)?/g,
      // Section headings: numbered (1. Introduction) or plain uppercase lines
      sectionHeading:
        /^(?:(\d+(?:\.\d+)*)\s*\.?\s+)?([A-Z][A-Za-z\s:,\-]{2,80})$/gm,
      // Abstract block
      abstractBlock:
        /(?:^|\n)\s*Abstract[\s.:]*\n?([\s\S]*?)(?=\n\s*(?:\d+\.?\s+)?(?:Introduction|Keywords|1\s))/i,
      // Title: first non-empty substantial line
      titleLine: /^\s*(.{10,200})\s*$/m,
      // References/Bibliography section
      referencesSection:
        /(?:^|\n)\s*(?:References|Bibliography|Works\s+Cited)[\s.:]*\n([\s\S]*?)$/i,
      // DOI pattern
      doi: /\b(10\.\d{4,9}\/[^\s,;}\]]+)/g,
      // Figure/Table references
      figureRef: /(?:Fig(?:ure)?|Table)\s*\.?\s*(\d+(?:\.\d+)?)/gi,
      // Individual reference entry (numbered or bulleted)
      referenceEntry:
        /(?:^\s*\[?\d+\]?\.?\s+|\n\s*\[?\d+\]?\.?\s+)(.*?)(?=\n\s*\[?\d+\]?\.?\s+|\n\n|$)/gs,
    };

    this.stopWords = new Set([
      "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
      "be", "have", "has", "had", "do", "does", "did", "will", "would",
      "could", "should", "may", "might", "shall", "can", "need", "must",
      "it", "its", "this", "that", "these", "those", "he", "she", "they",
      "we", "you", "i", "me", "him", "her", "us", "them", "my", "your",
      "his", "our", "their", "which", "who", "whom", "what", "where",
      "when", "how", "why", "all", "each", "every", "both", "few", "more",
      "most", "other", "some", "such", "no", "nor", "not", "only", "own",
      "same", "so", "than", "too", "very", "just", "because", "if", "then",
      "about", "up", "out", "into", "through", "during", "before", "after",
      "above", "below", "between", "under", "again", "further", "once",
      "also", "however", "therefore", "thus", "hence", "moreover",
      "furthermore", "although", "whereas", "while", "since", "until",
      "unless", "whether", "though", "yet", "still", "already", "even",
      "et", "al", "fig", "figure", "table", "e.g", "i.e", "etc", "vs",
      "using", "used", "based", "proposed", "results", "method", "paper",
      "study", "show", "shown", "shows", "new", "approach", "two", "one",
      "first", "second", "third", "well", "many", "much", "less", "over",
    ]);
  }

  /**
   * Parse raw text into structured content with title, abstract, sections, and references.
   */
  parse(rawText: string): ParsedContent {
    const cleaned = this.cleanText(rawText);
    const title = this.extractTitle(cleaned);
    const abstract = this.extractAbstract(cleaned);
    const sections = this.splitSections(cleaned);
    const references = this.extractReferenceList(cleaned);
    const citations = this.extractCitations(cleaned);
    const keywords = this.extractKeyTerms(cleaned).map((kt) => kt.term);

    return { title, abstract, sections, references, citations, keywords };
  }

  /**
   * Extract all citations from text, supporting numeric [1], author-year, and et al. formats.
   */
  extractCitations(text: string): Citation[] {
    const citations: Citation[] = [];

    // Numeric citations: [1], [2,3], [1-5]
    const numericPattern = new RegExp(this.patterns.numericCitation.source, "g");
    let match: RegExpExecArray | null;
    while ((match = numericPattern.exec(text)) !== null) {
      const inner = match[1];
      const indices = this.expandNumericRange(inner);
      for (const idx of indices) {
        citations.push({
          raw: match[0],
          type: "numeric",
          index: idx,
          position: match.index,
        });
      }
    }

    // Author-year citations: (Smith, 2023), (Smith & Jones, 2023)
    const authorYearPattern = new RegExp(
      this.patterns.authorYearCitation.source,
      "g"
    );
    while ((match = authorYearPattern.exec(text)) !== null) {
      const authorStr = match[1];
      const year = parseInt(match[2], 10);
      const authors = authorStr
        .split(/\s*(?:&|and)\s*/)
        .map((a) => a.trim());
      citations.push({
        raw: match[0],
        type: "author-year",
        authors,
        year,
        position: match.index,
      });
    }

    // Author et al. citations: Smith et al. (2023)
    const etAlPattern = new RegExp(
      this.patterns.authorEtAlCitation.source,
      "g"
    );
    while ((match = etAlPattern.exec(text)) !== null) {
      citations.push({
        raw: match[0],
        type: "author-et-al",
        authors: [match[1]],
        year: parseInt(match[2], 10),
        position: match.index,
      });
    }

    // Sort by position in text
    citations.sort((a, b) => a.position - b.position);
    return citations;
  }

  /**
   * Extract key terms using TF-based frequency analysis.
   * Returns terms sorted by relevance score descending.
   */
  extractKeyTerms(
    text: string,
    maxTerms: number = 20
  ): KeyTerm[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s\-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !this.stopWords.has(w));

    // Count raw term frequency
    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }

    const totalWords = words.length || 1;

    // Also extract bigrams for multi-word terms
    const bigrams = new Map<string, number>();
    for (let i = 0; i < words.length - 1; i++) {
      if (!this.stopWords.has(words[i]) && !this.stopWords.has(words[i + 1])) {
        const bigram = `${words[i]} ${words[i + 1]}`;
        bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
      }
    }

    // Score unigrams: TF normalized by document length, boosted by length of term
    const scored: KeyTerm[] = [];
    for (const [term, count] of freq) {
      if (count < 2) continue;
      const tf = count / totalWords;
      // Slight boost for longer terms (more specific)
      const lengthBoost = Math.min(term.length / 10, 1.5);
      scored.push({ term, frequency: count, score: tf * lengthBoost });
    }

    // Score bigrams: higher weight since multi-word terms are more specific
    for (const [term, count] of bigrams) {
      if (count < 2) continue;
      const tf = count / totalWords;
      scored.push({ term, frequency: count, score: tf * 2.0 });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, maxTerms);
  }

  /**
   * Split text into sections based on headings.
   */
  splitSections(text: string): Section[] {
    const sections: Section[] = [];
    const lines = text.split("\n");
    let currentHeading = "";
    let currentLevel = 0;
    let currentContent: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        currentContent.push("");
        continue;
      }

      // Check for numbered heading: "1. Introduction", "2.1 Methods"
      const numberedMatch = trimmed.match(
        /^(\d+(?:\.\d+)*)\s*\.?\s+([A-Z][A-Za-z\s:,\-]{2,80})$/
      );
      // Check for plain uppercase heading
      const plainMatch =
        !numberedMatch &&
        trimmed.length < 80 &&
        trimmed.length > 2 &&
        /^[A-Z][A-Z\s:,\-]{2,}$/.test(trimmed);

      if (numberedMatch || plainMatch) {
        // Save previous section
        if (currentHeading || currentContent.length > 0) {
          sections.push({
            heading: currentHeading,
            level: currentLevel,
            content: currentContent.join("\n").trim(),
          });
        }

        if (numberedMatch) {
          const numberParts = numberedMatch[1].split(".");
          currentLevel = numberParts.length;
          currentHeading = numberedMatch[2].trim();
        } else {
          currentLevel = 1;
          currentHeading = trimmed;
        }
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Final section
    if (currentHeading || currentContent.length > 0) {
      sections.push({
        heading: currentHeading,
        level: currentLevel,
        content: currentContent.join("\n").trim(),
      });
    }

    return sections;
  }

  /**
   * Clean raw text by normalizing whitespace, removing control characters,
   * and fixing common encoding issues.
   */
  cleanText(text: string): string {
    let cleaned = text;

    // Remove null bytes and control characters (keep newlines and tabs)
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

    // Normalize various dash types to standard hyphen-minus
    cleaned = cleaned.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, "-");

    // Normalize quotes
    cleaned = cleaned.replace(/[\u2018\u2019\u201A]/g, "'");
    cleaned = cleaned.replace(/[\u201C\u201D\u201E]/g, '"');

    // Fix ligatures
    cleaned = cleaned.replace(/\uFB01/g, "fi");
    cleaned = cleaned.replace(/\uFB02/g, "fl");
    cleaned = cleaned.replace(/\uFB00/g, "ff");

    // Collapse multiple blank lines to at most two
    cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");

    // Remove trailing whitespace per line
    cleaned = cleaned.replace(/[ \t]+$/gm, "");

    // Collapse multiple spaces within lines
    cleaned = cleaned.replace(/[ \t]{2,}/g, " ");

    return cleaned.trim();
  }

  // --- Private helpers ---

  private extractTitle(text: string): string {
    // Try to find a prominent title: first substantial non-empty line
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      // Skip lines that look like metadata or headers
      if (/^(abstract|keywords|introduction|contents)/i.test(line)) continue;
      if (/^\d+\.\s/.test(line)) continue;
      if (line.length >= 10 && line.length <= 300) {
        return line;
      }
    }
    return lines[0] || "";
  }

  private extractAbstract(text: string): string {
    const match = this.patterns.abstractBlock.exec(text);
    if (match) {
      return match[1].trim().replace(/\s+/g, " ");
    }

    // Fallback: look for a paragraph following "Abstract" on its own line
    const altMatch = text.match(
      /(?:^|\n)\s*Abstract\s*\n+([\s\S]{50,2000}?)(?:\n\s*\n)/i
    );
    if (altMatch) {
      return altMatch[1].trim().replace(/\s+/g, " ");
    }

    return "";
  }

  private extractReferenceList(text: string): string[] {
    const refMatch = this.patterns.referencesSection.exec(text);
    if (!refMatch) return [];

    const refBlock = refMatch[1];
    const refs: string[] = [];

    // Try numbered references: [1] Author..., or 1. Author...
    const numbered = refBlock.split(/\n\s*\[?\d+\]?[.)]\s*/);
    if (numbered.length > 2) {
      for (const entry of numbered) {
        const trimmed = entry.trim().replace(/\s+/g, " ");
        if (trimmed.length > 10) {
          refs.push(trimmed);
        }
      }
      return refs;
    }

    // Fallback: split by blank lines
    const blocks = refBlock.split(/\n\s*\n/);
    for (const block of blocks) {
      const trimmed = block.trim().replace(/\s+/g, " ");
      if (trimmed.length > 10) {
        refs.push(trimmed);
      }
    }
    return refs;
  }

  private expandNumericRange(rangeStr: string): number[] {
    const indices: number[] = [];
    const parts = rangeStr.split(/\s*,\s*/);
    for (const part of parts) {
      if (/\d+\s*[-\u2013]\s*\d+/.test(part)) {
        const [startStr, endStr] = part.split(/\s*[-\u2013]\s*/);
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        for (let i = start; i <= end && i - start < 100; i++) {
          indices.push(i);
        }
      } else {
        const n = parseInt(part.trim(), 10);
        if (!isNaN(n)) indices.push(n);
      }
    }
    return indices;
  }
}
