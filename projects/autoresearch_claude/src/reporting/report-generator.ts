/**
 * Report Generator - Generates complete research reports using
 * the TemplateEngine and CitationFormatter.
 */

import { TemplateEngine } from "./template-engine.js";
import { CitationFormatter, Paper, CitationStyle } from "./citation-formatter.js";

export interface Finding {
  title: string;
  summary: string;
  details?: string;
  keywords?: string[];
  significance?: "high" | "medium" | "low";
}

export interface ReportSection {
  title: string;
  content: string;
}

export class ReportGenerator {
  public templateEngine: TemplateEngine;
  public citationFormatter: CitationFormatter;
  public sections: ReportSection[];

  constructor(
    templateEngine?: TemplateEngine,
    citationFormatter?: CitationFormatter
  ) {
    this.templateEngine = templateEngine ?? new TemplateEngine();
    this.citationFormatter = citationFormatter ?? new CitationFormatter();
    this.sections = [];

    this.registerDefaultTemplates();
  }

  /**
   * Generate a full markdown research report.
   */
  generate(
    topic: string,
    findings: Finding[],
    citations: Paper[],
    style: CitationStyle = "APA"
  ): string {
    const abstract = this.generateAbstract(findings);
    const conclusion = this.generateConclusion(findings);
    const bibliography = this.generateBibliography(citations, style);

    const findingSections = findings.map((f, i) => ({
      heading: f.title,
      body: f.details ?? f.summary,
      summary: f.summary,
      index: i + 1,
      significance: f.significance ?? "medium",
      keywords: f.keywords ?? [],
    }));

    const data: Record<string, unknown> = {
      topic,
      date: new Date().toISOString().split("T")[0],
      abstract,
      findings: findingSections,
      findingsCount: findings.length,
      citationsCount: citations.length,
      customSections: this.sections,
      hasCustomSections: this.sections.length > 0,
      conclusion,
      bibliography,
      style,
    };

    return this.templateEngine.render("researchReport", data);
  }

  /**
   * Add a custom section to the report.
   */
  addSection(title: string, content: string): void {
    this.sections.push({ title, content });
  }

  /**
   * Generate a concise abstract from findings.
   */
  generateAbstract(findings: Finding[]): string {
    if (findings.length === 0) return "No findings available.";

    const highSignificance = findings.filter(
      (f) => f.significance === "high"
    );
    const topFindings =
      highSignificance.length > 0 ? highSignificance : findings;

    const summaries = topFindings
      .slice(0, 3)
      .map((f) => f.summary)
      .join(" ");

    const allKeywords = findings
      .flatMap((f) => f.keywords ?? [])
      .filter((val, idx, arr) => arr.indexOf(val) === idx)
      .slice(0, 6);

    let abstract = `This report presents an analysis of ${findings.length} key finding${findings.length > 1 ? "s" : ""}. ${summaries}`;

    if (allKeywords.length > 0) {
      abstract += ` Key areas of focus include ${allKeywords.join(", ")}.`;
    }

    return abstract;
  }

  /**
   * Generate a conclusion from findings.
   */
  generateConclusion(findings: Finding[]): string {
    if (findings.length === 0) return "No findings to conclude upon.";

    const highCount = findings.filter(
      (f) => f.significance === "high"
    ).length;
    const medCount = findings.filter(
      (f) => (f.significance ?? "medium") === "medium"
    ).length;
    const lowCount = findings.filter(
      (f) => f.significance === "low"
    ).length;

    let conclusion = `In summary, this research identified ${findings.length} notable finding${findings.length > 1 ? "s" : ""}.`;

    if (highCount > 0) {
      conclusion += ` Of these, ${highCount} ${highCount > 1 ? "were" : "was"} classified as high significance.`;
    }
    if (medCount > 0) {
      conclusion += ` ${medCount} finding${medCount > 1 ? "s were" : " was"} of medium significance.`;
    }
    if (lowCount > 0) {
      conclusion += ` ${lowCount} finding${lowCount > 1 ? "s were" : " was"} of lower significance.`;
    }

    const topFinding = findings.find((f) => f.significance === "high") ?? findings[0];
    conclusion += ` The most prominent finding concerns "${topFinding.title}": ${topFinding.summary}`;

    conclusion += " Further research is recommended to expand on these results.";

    return conclusion;
  }

  /**
   * Generate a formatted bibliography section.
   */
  generateBibliography(
    citations: Paper[],
    style: CitationStyle = "APA"
  ): string {
    if (citations.length === 0) return "No citations available.";

    const sorted = this.citationFormatter.sortByAuthor(citations);
    return this.citationFormatter.formatAll(sorted, style);
  }

  /**
   * Export the current sections as a markdown string.
   */
  exportMarkdown(): string {
    if (this.sections.length === 0) return "";

    return this.sections
      .map((section) => `## ${section.title}\n\n${section.content}`)
      .join("\n\n---\n\n");
  }

  /**
   * Export the current sections as an HTML string.
   */
  exportHTML(): string {
    const title = "Research Report";
    const bodyParts = this.sections.map(
      (section) =>
        `    <section>\n      <h2>${this.escapeHTML(section.title)}</h2>\n      ${this.markdownToHTML(section.content)}\n    </section>`
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHTML(title)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; color: #333; }
    h1 { border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
    h2 { color: #444; margin-top: 2rem; }
    h3 { color: #555; }
    blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 1rem; color: #666; }
    code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 3px; font-size: 0.9em; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
    .bibliography { font-size: 0.95em; }
    .finding { margin-bottom: 1.5rem; }
  </style>
</head>
<body>
  <main>
${bodyParts.join("\n\n")}
  </main>
</body>
</html>`;
  }

  // --- Private ---

  private registerDefaultTemplates(): void {
    this.templateEngine.register(
      "researchReport",
      `# Research Report: {{topic}}

**Date:** {{date}}
**Findings:** {{findingsCount}} | **Citations:** {{citationsCount}} | **Style:** {{style}}

---

## Abstract

{{abstract}}

---

## Findings

{{#each findings}}
### {{index}}. {{heading}}

{{body}}

{{#if keywords}}**Keywords:** {{keywords}}{{/if}}
**Significance:** {{significance}}

{{/each}}

---

{{#if hasCustomSections}}
{{#each customSections}}
## {{title}}

{{content}}

{{/each}}

---

{{/if}}
## Conclusion

{{conclusion}}

---

## References

{{bibliography}}
`
    );

    this.templateEngine.register(
      "findingDetail",
      `### {{title}}

{{summary}}

{{#if details}}
#### Details

{{details}}
{{/if}}

{{#if keywords}}
**Keywords:** {{#each keywords}}{{this}}{{#if @last}}{{else}}, {{/if}}{{/each}}
{{/if}}
`
    );
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private markdownToHTML(markdown: string): string {
    let html = markdown;

    // Headings
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Inline code
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    // Horizontal rules
    html = html.replace(/^---$/gm, "<hr>");

    // Line breaks into paragraphs
    html = html
      .split(/\n\n+/)
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        if (/^<(?:h[1-6]|hr|section|div|ul|ol|blockquote)/.test(trimmed)) {
          return trimmed;
        }
        return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
      })
      .filter(Boolean)
      .join("\n\n");

    return html;
  }
}
