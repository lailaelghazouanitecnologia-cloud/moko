/**
 * Parses paper content into structured data
 */
export class ContentParser {
  text: string;
  metadata: Record<string, any>;

  /**
   * Creates a new ContentParser instance
   * @param text - The text content to parse
   * @param metadata - Additional metadata associated with the content
   */
  constructor(text: string = '', metadata: Record<string, any> = {}) {
    this.text = text;
    this.metadata = metadata;
  }

  /**
   * Extracts the abstract from the given text
   * @param text - The text to parse for abstract
   * @returns The extracted abstract text, or empty string if not found
   */
  parseAbstract(text: string): string {
    if (!this.validateInput(text, 'string', 'parseAbstract')) {
      return '';
    }

    try {
      const abstractMatch = text.match(/\babstract[\s\-:]*([\s\S]*?)(?=\n\n|\n\s*\n|\n\s*(?:1\s+)?introduction)/i);
      if (abstractMatch) {
        return this.cleanText(abstractMatch[1]);
      }
      
      const abstractSectionMatch = text.match(/\n\s*(?:1\s+)?introduction/i);
      if (abstractSectionMatch) {
        const beforeIntro = text.substring(0, abstractSectionMatch.index);
        const lines = beforeIntro.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          return this.cleanText(lines.join(' '));
        }
      }
      
      const firstParagraph = text.split('\n\n')[0];
      if (firstParagraph && firstParagraph.length < 1000) {
        return this.cleanText(firstParagraph);
      }
      
      return '';
    } catch (error) {
      this.handleError('parseAbstract', error);
      return '';
    }
  }

  /**
   * Splits the text into sections
   * @param text - The text to parse into sections
   * @returns Array of sections with title and content
   */
  parseSections(text: string): Array<{title: string, content: string}> {
    if (!this.validateInput(text, 'string', 'parseSections')) {
      return [];
    }

    try {
      const sections: Array<{title: string, content: string}> = [];
      const sectionPattern = /\n\s*(\d+(?:\.\d+)*\s+)?([A-Z][\w\s\-]*?)\s*\n([\s\S]*?)(?=\n\s*(?:\d+(?:\.\d+)*\s+)?[A-Z][\w\s\-]*?\s*\n|$)/g;
      
      let match;
      while ((match = sectionPattern.exec(text)) !== null) {
        const title = match[2].trim();
        const content = match[3].trim();
        if (title && content) {
          sections.push({
            title,
            content: this.cleanText(content)
          });
        }
      }
      
      if (sections.length === 0) {
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        for (let i = 0; i < Math.min(paragraphs.length, 5); i++) {
          const para = paragraphs[i].trim();
          if (para.length > 100) {
            sections.push({
              title: `Section ${i + 1}`,
              content: this.cleanText(para)
            });
          }
        }
      }
      
      return sections;
    } catch (error) {
      this.handleError('parseSections', error);
      return [];
    }
  }

  /**
   * Finds mathematical formulas in the text
   * @param text - The text to parse for formulas
   * @returns Array of unique formula strings
   */
  parseFormulas(text: string): Array<string> {
    if (!this.validateInput(text, 'string', 'parseFormulas')) {
      return [];
    }

    try {
      const formulas: Array<string> = [];
      
      const inlineMathPattern = /\$([^$]+)\$/g;
      let match;
      while ((match = inlineMathPattern.exec(text)) !== null) {
        formulas.push(match[1].trim());
      }
      
      const displayMathPattern = /\$\$([\s\S]*?)\$\$/g;
      while ((match = displayMathPattern.exec(text)) !== null) {
        formulas.push(match[1].trim());
      }
      
      const latexPattern = /\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g;
      while ((match = latexPattern.exec(text)) !== null) {
        formulas.push(match[1].trim());
      }
      
      const bracketPattern = /\\\\\[([\s\S]*?)\\\]/g;
      while ((match = bracketPattern.exec(text)) !== null) {
        formulas.push(match[1].trim());
      }
      
      return [...new Set(formulas)];
    } catch (error) {
      this.handleError('parseFormulas', error);
      return [];
    }
  }

  /**
   * Extracts figures from the text
   * @param text - The text to parse for figures
   * @returns Array of figures with id and caption
   */
  parseFigures(text: string): Array<{id: string, caption: string}> {
    if (!this.validateInput(text, 'string', 'parseFigures')) {
      return [];
    }

    try {
      const figures: Array<{id: string, caption: string}> = [];
      
      const figurePattern = /\\begin\{figure\}[\s\S]*?\\caption\{([\s\S]*?)\}[\s\S]*?\\end\{figure\}/g;
      let match;
      while ((match = figurePattern.exec(text)) !== null) {
        const caption = match[1].trim();
        const id = `fig_${figures.length + 1}`;
        figures.push({ id, caption });
      }
      
      const figPattern = /\\begin\{figure\}[\s\S]*?\\label\{([^}]+)\}[\s\S]*?\\caption\{([\s\S]*?)\}[\s\S]*?\\end\{figure\}/g;
      while ((match = figPattern.exec(text)) !== null) {
        const id = match[1].trim();
        const caption = match[2].trim();
        figures.push({ id, caption });
      }
      
      const simpleFigurePattern = /Figure\s+(\d+(?:\.\d+)*):\s*([\s\S]*?)(?=\n\n|$)/g;
      while ((match = simpleFigurePattern.exec(text)) !== null) {
        const id = `fig_${match[1]}`;
        const caption = match[2].trim();
        figures.push({ id, caption });
      }
      
      return figures;
    } catch (error) {
      this.handleError('parseFigures', error);
      return [];
    }
  }

  /**
   * Extracts tables from the text
   * @param text - The text to parse for tables
   * @returns Array of tables with id and data
   */
  parseTables(text: string): Array<{id: string, data: any}> {
    if (!this.validateInput(text, 'string', 'parseTables')) {
      return [];
    }

    try {
      const tables: Array<{id: string, data: any}> = [];
      
      const tablePattern = /\\begin\{table\}[\s\S]*?\\caption\{([\s\S]*?)\}[\s\S]*?\\begin\{tabular\}([\s\S]*?)\\end\{tabular\}[\s\S]*?\\end\{table\}/g;
      let match;
      while ((match = tablePattern.exec(text)) !== null) {
        const caption = match[1].trim();
        const tabularContent = match[2].trim();
        
        const rows = tabularContent.split('\\\\').map(row => 
          row.split('&').map(cell => cell.trim())
        );
        
        const id = `table_${tables.length + 1}`;
        tables.push({
          id,
          data: {
            caption,
            rows,
            columns: rows[0]?.length || 0
          }
        });
      }
      
      const simpleTablePattern = /Table\s+(\d+(?:\.\d+)*):\s*([\s\S]*?)(?=\n\n|$)/g;
      while ((match = simpleTablePattern.exec(text)) !== null) {
        const id = `table_${match[1]}`;
        const caption = match[2].trim();
        tables.push({
          id,
          data: {
            caption,
            rows: [],
            columns: 0
          }
        });
      }
      
      return tables;
    } catch (error) {
      this.handleError('parseTables', error);
      return [];
    }
  }

  /**
   * Finds citations in the text
   * @param text - The text to parse for citations
   * @returns Array of unique citation strings
   */
  parseCitations(text: string): Array<string> {
    if (!this.validateInput(text, 'string', 'parseCitations')) {
      return [];
    }

    try {
      const citations: Array<string> = [];
      
      const citationPattern = /\\cite\{([^}]+)\}/g;
      let match;
      while ((match = citationPattern.exec(text)) !== null) {
        const keys = match[1].split(',').map(k => k.trim());
        citations.push(...keys);
      }
      
      const citepPattern = /\\citep\{([^}]+)\}/g;
      while ((match = citepPattern.exec(text)) !== null) {
        const keys = match[1].split(',').map(k => k.trim());
        citations.push(...keys);
      }
      
      const citetPattern = /\\citet\{([^}]+)\}/g;
      while ((match = citetPattern.exec(text)) !== null) {
        const keys = match[1].split(',').map(k => k.trim());
        citations.push(...keys);
      }
      
      const bracketCitationPattern = /\[([A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+)*,\s*\d{4})\]/g;
      while ((match = bracketCitationPattern.exec(text)) !== null) {
        citations.push(match[1]);
      }
      
      const parentheticalPattern = /\(([A-Z][a-z]+(?:\s+and\s+[A-Z][a-z]+)*,\s*\d{4})\)/g;
      while ((match = parentheticalPattern.exec(text)) !== null) {
        citations.push(match[1]);
      }
      
      return [...new Set(citations)];
    } catch (error) {
      this.handleError('parseCitations', error);
      return [];
    }
  }

  /**
   * Normalizes whitespace and cleans text
   * @param text - The text to clean
   * @returns The cleaned text
   */
  cleanText(text: string): string {
    if (!this.validateInput(text, 'string', 'cleanText')) {
      return '';
    }

    try {
      return text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .replace(/^\s+|\s+$/g, '')
        .replace(/[\u00A0\u202F\u205F\u3000]/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, '');
    } catch (error) {
      this.handleError('cleanText', error);
      return text;
    }
  }

  /**
   * Validates input parameters
   * @param input - The input to validate
   * @param expectedType - The expected type
   * @param methodName - The name of the calling method
   * @returns True if valid, false otherwise
   */
  private validateInput(input: any, expectedType: string, methodName: string): boolean {
    if (input === null || input === undefined) {
      console.warn(`[ContentParser.${methodName}] Input is null or undefined`);
      return false;
    }
    
    if (expectedType === 'string' && typeof input !== 'string') {
      console.warn(`[ContentParser.${methodName}] Expected string, got ${typeof input}`);
      return false;
    }
    
    return true;
  }

  /**
   * Handles errors consistently
   * @param methodName - The name of the method where the error occurred
   * @param error - The error object
   */
  private handleError(methodName: string, error: any): void {
    console.error(`[ContentParser.${methodName}] Error:`, error);
  }
}
