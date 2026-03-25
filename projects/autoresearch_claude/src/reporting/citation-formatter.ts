/**
 * Citation Formatter - Formats citations in multiple academic styles.
 */

export interface Paper {
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  publisher?: string;
  url?: string;
  city?: string;
}

export type CitationStyle = "APA" | "MLA" | "Chicago" | "IEEE";

type StyleFormatter = (paper: Paper) => string;

export class CitationFormatter {
  private styles: Map<CitationStyle, StyleFormatter>;

  constructor() {
    this.styles = new Map<CitationStyle, StyleFormatter>();

    this.styles.set("APA", (paper: Paper): string => {
      const authorStr = this.formatAuthorsAPA(paper.authors);
      let citation = `${authorStr} (${paper.year}). ${paper.title}.`;
      if (paper.journal) {
        citation += ` *${paper.journal}*`;
        if (paper.volume) {
          citation += `, *${paper.volume}*`;
          if (paper.issue) {
            citation += `(${paper.issue})`;
          }
        }
        if (paper.pages) {
          citation += `, ${paper.pages}`;
        }
        citation += ".";
      } else if (paper.publisher) {
        citation += ` ${paper.publisher}.`;
      }
      if (paper.doi) {
        citation += ` https://doi.org/${paper.doi}`;
      }
      return citation;
    });

    this.styles.set("MLA", (paper: Paper): string => {
      const authorStr = this.formatAuthorsMLA(paper.authors);
      let citation = `${authorStr}. "${paper.title}."`;
      if (paper.journal) {
        citation += ` *${paper.journal}*`;
        if (paper.volume) {
          citation += `, vol. ${paper.volume}`;
          if (paper.issue) {
            citation += `, no. ${paper.issue}`;
          }
        }
        citation += `, ${paper.year}`;
        if (paper.pages) {
          citation += `, pp. ${paper.pages}`;
        }
        citation += ".";
      } else if (paper.publisher) {
        citation += ` ${paper.publisher}, ${paper.year}.`;
      } else {
        citation += ` ${paper.year}.`;
      }
      if (paper.doi) {
        citation += ` doi:${paper.doi}.`;
      }
      return citation;
    });

    this.styles.set("Chicago", (paper: Paper): string => {
      const authorStr = this.formatAuthorsChicago(paper.authors);
      let citation = `${authorStr}. "${paper.title}."`;
      if (paper.journal) {
        citation += ` *${paper.journal}*`;
        if (paper.volume) {
          citation += ` ${paper.volume}`;
          if (paper.issue) {
            citation += `, no. ${paper.issue}`;
          }
        }
        citation += ` (${paper.year})`;
        if (paper.pages) {
          citation += `: ${paper.pages}`;
        }
        citation += ".";
      } else if (paper.publisher) {
        const location = paper.city ? `${paper.city}: ` : "";
        citation += ` ${location}${paper.publisher}, ${paper.year}.`;
      } else {
        citation += ` ${paper.year}.`;
      }
      if (paper.doi) {
        citation += ` https://doi.org/${paper.doi}.`;
      }
      return citation;
    });

    this.styles.set("IEEE", (paper: Paper): string => {
      const authorStr = this.formatAuthorsIEEE(paper.authors);
      let citation = `${authorStr}, "${paper.title},"`;
      if (paper.journal) {
        citation += ` *${paper.journal}*`;
        if (paper.volume) {
          citation += `, vol. ${paper.volume}`;
          if (paper.issue) {
            citation += `, no. ${paper.issue}`;
          }
        }
        if (paper.pages) {
          citation += `, pp. ${paper.pages}`;
        }
        citation += `, ${paper.year}.`;
      } else if (paper.publisher) {
        citation += ` ${paper.publisher}, ${paper.year}.`;
      } else {
        citation += ` ${paper.year}.`;
      }
      if (paper.doi) {
        citation += ` doi: ${paper.doi}.`;
      }
      return citation;
    });
  }

  /**
   * Format a single paper citation in the given style.
   */
  format(paper: Paper, style: CitationStyle): string {
    const formatter = this.styles.get(style);
    if (!formatter) {
      throw new Error(`Unknown citation style: ${style}`);
    }
    return formatter(paper);
  }

  /**
   * Format all papers as a numbered bibliography in the given style.
   */
  formatAll(papers: Paper[], style: CitationStyle): string {
    return papers
      .map((paper, index) => `${index + 1}. ${this.format(paper, style)}`)
      .join("\n");
  }

  /**
   * Sort papers alphabetically by the first author's last name.
   */
  sortByAuthor(papers: Paper[]): Paper[] {
    return [...papers].sort((a, b) => {
      const lastNameA = this.extractLastName(a.authors[0] ?? "");
      const lastNameB = this.extractLastName(b.authors[0] ?? "");
      return lastNameA.localeCompare(lastNameB);
    });
  }

  /**
   * Sort papers by publication year (ascending).
   */
  sortByYear(papers: Paper[]): Paper[] {
    return [...papers].sort((a, b) => a.year - b.year);
  }

  /**
   * Generate a BibTeX entry for a paper.
   */
  generateBibTeX(paper: Paper): string {
    const key = this.generateBibTeXKey(paper);
    const type = paper.journal ? "article" : "book";
    const lines: string[] = [];
    lines.push(`@${type}{${key},`);
    lines.push(`  title = {${paper.title}},`);
    lines.push(`  author = {${paper.authors.join(" and ")}},`);
    lines.push(`  year = {${paper.year}},`);
    if (paper.journal) {
      lines.push(`  journal = {${paper.journal}},`);
    }
    if (paper.volume) {
      lines.push(`  volume = {${paper.volume}},`);
    }
    if (paper.issue) {
      lines.push(`  number = {${paper.issue}},`);
    }
    if (paper.pages) {
      lines.push(`  pages = {${paper.pages}},`);
    }
    if (paper.publisher) {
      lines.push(`  publisher = {${paper.publisher}},`);
    }
    if (paper.doi) {
      lines.push(`  doi = {${paper.doi}},`);
    }
    if (paper.url) {
      lines.push(`  url = {${paper.url}},`);
    }
    // Remove trailing comma from last field
    const lastIdx = lines.length - 1;
    lines[lastIdx] = lines[lastIdx].replace(/,$/, "");
    lines.push("}");
    return lines.join("\n");
  }

  /**
   * Format a paper as a numbered footnote.
   */
  toFootnote(paper: Paper, index: number): string {
    const authorStr =
      paper.authors.length > 2
        ? `${paper.authors[0]} et al.`
        : paper.authors.join(" and ");
    let note = `[^${index}]: ${authorStr}, "${paper.title}"`;
    if (paper.journal) {
      note += `, *${paper.journal}*`;
    }
    note += ` (${paper.year})`;
    if (paper.doi) {
      note += `. doi:${paper.doi}`;
    }
    note += ".";
    return note;
  }

  // --- Private helpers ---

  private extractLastName(author: string): string {
    const parts = author.trim().split(/\s+/);
    return parts[parts.length - 1] ?? "";
  }

  private formatAuthorsAPA(authors: string[]): string {
    if (authors.length === 0) return "";
    const formatted = authors.map((a) => {
      const parts = a.trim().split(/\s+/);
      if (parts.length === 1) return parts[0];
      const lastName = parts[parts.length - 1];
      const initials = parts
        .slice(0, -1)
        .map((p) => `${p[0]}.`)
        .join(" ");
      return `${lastName}, ${initials}`;
    });
    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`;
    const allButLast = formatted.slice(0, -1).join(", ");
    return `${allButLast}, & ${formatted[formatted.length - 1]}`;
  }

  private formatAuthorsMLA(authors: string[]): string {
    if (authors.length === 0) return "";
    const first = authors[0].trim().split(/\s+/);
    let primary: string;
    if (first.length === 1) {
      primary = first[0];
    } else {
      primary = `${first[first.length - 1]}, ${first.slice(0, -1).join(" ")}`;
    }
    if (authors.length === 1) return primary;
    if (authors.length === 2) return `${primary}, and ${authors[1]}`;
    return `${primary}, et al.`;
  }

  private formatAuthorsChicago(authors: string[]): string {
    if (authors.length === 0) return "";
    const first = authors[0].trim().split(/\s+/);
    let primary: string;
    if (first.length === 1) {
      primary = first[0];
    } else {
      primary = `${first[first.length - 1]}, ${first.slice(0, -1).join(" ")}`;
    }
    if (authors.length === 1) return primary;
    if (authors.length === 2) return `${primary} and ${authors[1]}`;
    if (authors.length <= 3) {
      const others = authors.slice(1).join(", and ");
      return `${primary}, ${others}`;
    }
    return `${primary} et al.`;
  }

  private formatAuthorsIEEE(authors: string[]): string {
    if (authors.length === 0) return "";
    const formatted = authors.map((a) => {
      const parts = a.trim().split(/\s+/);
      if (parts.length === 1) return parts[0];
      const initials = parts
        .slice(0, -1)
        .map((p) => `${p[0]}.`)
        .join(" ");
      return `${initials} ${parts[parts.length - 1]}`;
    });
    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return `${formatted[0]} and ${formatted[1]}`;
    const allButLast = formatted.slice(0, -1).join(", ");
    return `${allButLast}, and ${formatted[formatted.length - 1]}`;
  }

  private generateBibTeXKey(paper: Paper): string {
    const lastName = this.extractLastName(paper.authors[0] ?? "unknown");
    const firstWord = paper.title
      .split(/\s+/)[0]
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    return `${lastName.toLowerCase()}${paper.year}${firstWord}`;
  }
}
