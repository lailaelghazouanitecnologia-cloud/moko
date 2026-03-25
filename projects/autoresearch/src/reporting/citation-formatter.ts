import { Source } from '../types/source';

/**
 * Formats citations for reports according to various academic styles
 */
export class CitationFormatter {
  private style: string;
  private locale: string;

  /**
   * Creates a new CitationFormatter instance
   * @param style - The citation style to use (default: 'apa')
   * @param locale - The locale for formatting (default: 'en-US')
   */
  constructor(style: string = 'apa', locale: string = 'en-US') {
    this.style = this.validateStyle(style) ? style.toLowerCase() : 'apa';
    this.locale = this.validateLocale(locale) ? locale : 'en-US';
  }

  /**
   * Formats a source according to the current citation style
   * @param source - The source to format
   * @returns Formatted citation string
   * @throws Error if source is invalid
   */
  format(source: Source): string {
    if (!source) {
      throw new Error('Source cannot be null or undefined');
    }

    if (!this.validate(source)) {
      throw new Error('Invalid source: missing required fields or invalid data');
    }

    const style = this.style.toLowerCase();
    
    switch (style) {
      case 'apa':
        return this.formatAPA(source);
      case 'mla':
        return this.formatMLA(source);
      case 'chicago':
        return this.formatChicago(source);
      default:
        return this.formatAPA(source);
    }
  }

  /**
   * Sets the citation style
   * @param style - The citation style to use
   * @throws Error if style is invalid
   */
  setStyle(style: string): void {
    if (!this.validateStyle(style)) {
      throw new Error('Invalid citation style. Supported styles: apa, mla, chicago');
    }
    this.style = style.toLowerCase();
  }

  /**
   * Gets the current citation style
   * @returns The current citation style
   */
  getStyle(): string {
    return this.style;
  }

  /**
   * Sets the locale for formatting
   * @param locale - The locale to use
   * @throws Error if locale is invalid
   */
  setLocale(locale: string): void {
    if (!this.validateLocale(locale)) {
      throw new Error('Invalid locale format. Expected format: xx-XX');
    }
    this.locale = locale;
  }

  /**
   * Gets the current locale
   * @returns The current locale
   */
  getLocale(): string {
    return this.locale;
  }

  /**
   * Validates a source for required fields
   * @param source - The source to validate
   * @returns True if valid, false otherwise
   */
  validate(source: Source): boolean {
    if (!source) {
      return false;
    }

    try {
      const title = source.getTitle();
      const authors = source.getAuthors();
      const year = source.getYear();
      const publisher = source.getPublisher();

      if (!this.isValidString(title)) {
        return false;
      }

      if (!Array.isArray(authors) || authors.length === 0) {
        return false;
      }

      if (!this.isValidYear(year)) {
        return false;
      }

      if (!this.isValidString(publisher)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Creates a formatted bibliography from multiple sources
   * @param sources - Array of sources to format
   * @returns Formatted bibliography string
   */
  toBibliography(sources: Source[]): string {
    if (!Array.isArray(sources)) {
      return '';
    }

    if (sources.length === 0) {
      return '';
    }

    const validSources = sources.filter(source => this.validate(source));
    
    if (validSources.length === 0) {
      return '';
    }

    const formattedCitations = validSources.map(source => this.format(source));
    
    return formattedCitations.join('\n');
  }

  /**
   * Formulates APA format citation
   * @param source - The source to format
   * @returns APA formatted citation
   */
  private formatAPA(source: Source): string {
    const authors = this.formatAuthors(source.getAuthors());
    const year = source.getYear();
    const title = this.formatTitle(source.getTitle());
    const publisher = this.formatPublisher(source.getPublisher());
    
    return `${authors} (${year}). ${title}. ${publisher}.`;
  }

  /**
   * Formulates MLA format citation
   * @param source - The source to format
   * * @returns MLA formatted citation
   */
  private formatMLA(source: Source): string {
    const authors = this.formatAuthors(source.getAuthors());
    const title = this.formatTitle(source.getTitle());
    const publisher = this.formatPublisher(source.getPublisher());
    const year = source.getYear();
    
    return `${authors}. ${title}. ${publisher}, ${year}.`;
  }

  /**
   * Formulates Chicago format citation
   * @param source - The source to format
   * @returns Chicago formatted citation
   */
  private formatChicago(source: Source): string {
    const authors = this.formatAuthors(source.getAuthors());
    const title = this.formatTitle(source.getTitle());
    const publisher = this.formatPublisher(source.getPublisher());
    const year = source.getYear();
    
    return `${authors}. ${title}. ${publisher}, ${year}.`;
  }

  /**
   * Validates citation style
   * @param style - Style to validate
   * @returns True if valid style
   */
  private validateStyle(style: string): boolean {
    if (!this.isValidString(style)) {
      return false;
    }
    
    const validStyles = ['apa', 'mla', 'chicago'];
    return validStyles.includes(style.toLowerCase());
  }

  /**
   * Validates locale format
   * @param locale - Locale to validate
   * @returns True if valid locale
   */
  private validateLocale(locale: string): boolean {
    if (!this.isValidString(locale)) {
      return false;
    }
    
    const localePattern = /^[a-z]{2}-[A-Z]{2}$/;
    return localePattern.test(locale);
  }

  /**
   * Validates year range
   * @param year - Year to validate
   * @returns True if valid year
   */
  private isValidYear(year: number): boolean {
    if (typeof year !== 'number' || !isFinite(year)) {
      return false;
    }
    
    const currentYear = new Date().getFullYear();
    return year >= 1000 && year <= currentYear + 1;
  }

  /**
   * Validates string is non-empty
   * @param value - String to validate
   * @returns True if valid string
   */
  private isValidString(value: string): boolean {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Formats author names
   * @param authors - Array of author names
   * @returns Formatted author string
   */
  private formatAuthors(authors: string[]): string {
    if (!Array.isArray(authors) || authors.length === 0) {
      return '';
    }

    const trimmedAuthors = authors.map(a => a.trim()).filter(a => a.length > 0);
    
    if (trimmedAuthors.length === 0) {
      return '';
    }

    return trimmedAuthors.join(', ');
  }

  /**
   * Formats title
   * @param title - Title to format
   * @returns Formatted title
   */
  private formatTitle(title: string): string {
    if (!this.isValidString(title)) {
      return '';
    }
    return title.trim();
  }

  /**
   * Formats publisher
   * @param publisher - Publisher to format
   * @returns Formatted publisher
   */
  private formatPublisher(publisher: string): string {
    if (!this.isValidString(publisher)) {
      return '';
    }
    return publisher.trim();
  }
}
