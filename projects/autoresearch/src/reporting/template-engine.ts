import { CitationFormatter } from './citation-formatter';

/**
 * A lightweight template engine that supports partials, conditionals, loops, and citation placeholders.
 */
export class TemplateEngine {
  private templateCache: Map<string, string>;
  private partials: Map<string, string>;
  private citationFormatter: CitationFormatter;

  /**
   * Creates a new instance of TemplateEngine.
   * @param citationFormatter - Optional custom citation formatter. Defaults to a new CitationFormatter instance.
   */
  constructor(citationFormatter?: CitationFormatter) {
    this.templateCache = new Map<string, string>();
    this.partials = new Map<string, string>();
    this.citationFormatter = citationFormatter || new CitationFormatter();
  }

  /**
   * Registers a template by name for later rendering.
   * @param name - The unique name of the template.
   * @param content - The template content.
   * @throws {TypeError} If name or content is not a string.
   */
  registerTemplate(name: string, content: string): void {
    if (typeof name !== 'string' || !name.trim()) {
      throw new TypeError('Template name must be a non-empty string');
    }
    if (typeof content !== 'string') {
      throw new TypeError('Template content must be a string');
    }
    this.templateCache.set(name.trim(), content);
  }

  /**
   * Registers a partial template that can be embedded in other templates.
   * @param name - The unique name of the partial.
   * @param content - The partial content.
   * @throws {TypeError} If name or content is not a string.
   */
  registerPartial(name: string, content: string): void {
    if (typeof name !== 'string' || !name.trim()) {
      throw new TypeError('Partial name must be a non-empty string');
    }
    if (typeof content !== 'string') {
      throw new TypeError('Partial content must be a string');
    }
    this.partials.set(name.trim(), content);
  }

  /**
   * Renders a registered template with the provided data.
   * @param templateName - The name of the template to render.
   * @param data - The data object to interpolate into the template.
   * @returns The rendered string.
   * @throws {Error} If the template is not found.
   * @throws {TypeError} If templateName is not a string or data is not an object.
   */
  render(templateName: string, data: Record<string, unknown>): string {
    if (typeof templateName !== 'string' || !templateName.trim()) {
      throw new TypeError('Template name must be a non-empty string');
    }
    if (typeof data !== 'object' || data === null) {
      throw new TypeError('Data must be a non-null object');
    }
    const template = this.templateCache.get(templateName.trim());
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }
    return this.compile(template)(data);
  }

  /**
   * Renders a template with data and replaces citation placeholders with formatted citations.
   * @param templateName - The name of the template to render.
   * @param data - The data object to interpolate into the template.
   * @param citations - Array of citations to format and insert.
   * @returns The rendered string with citations.
   * @throws {Error} If the template is not found.
   * @throws {TypeError} If any parameter is of incorrect type.
   */
  renderWithCitations(templateName: string, data: Record<string, unknown>, citations: Citation[]): string {
    if (!Array.isArray(citations)) {
      throw new TypeError('Citations must be an array');
    }
    const rendered = this.render(templateName, data);
    const citationMap = new Map<string, string>();

    citations.forEach((citation, index) => {
      if (!citation || typeof citation.id !== 'string' || !citation.source) {
        throw new TypeError(`Invalid citation at index ${index}`);
      }
      const key = `{{citation:${index}}}`;
      citationMap.set(key, this.citationFormatter.format(citation.source));
    });

    let result = rendered;
    citationMap.forEach((value, key) => {
      result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });

    return result;
  }

  /**
   * Compiles a template string into a reusable render function.
   * @param template - The template string to compile.
   * @returns A function that accepts data and returns the rendered string.
   * @throws {TypeError} If template is not a string.
   */
  compile(template: string): (data: Record<string, unknown>) => string {
    if (typeof template !== 'string') {
      throw new TypeError('Template must be a string');
    }
    const resolvedTemplate = this.resolvePartials(template);

    return (data: Record<string, unknown>): string => {
      if (typeof data !== 'object' || data === null) {
        throw new TypeError('Data must be a non-null object');
      }
      let result = resolvedTemplate;

      const processValue = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      };

      const interpolate = (text: string, context: Record<string, unknown>): string => {
        return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
          const trimmedKey = key.trim();
          const keys = trimmedKey.split('.');
          let current: unknown = context;

          for (const k of keys) {
            if (current && typeof current === 'object' && !(current instanceof Array)) {
              current = (current as Record<string, unknown>)[k];
            } else {
              return '';
            }
          }

          return processValue(current);
        });
      };

      result = interpolate(result, data);

      result = result.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match, arrayKey, content) => {
        const keys = arrayKey.trim().split('.');
        let current: unknown = data;

        for (const k of keys) {
          if (current && typeof current === 'object' && !(current instanceof Array)) {
            current = (current as Record<string, unknown>)[k];
          } else {
            return '';
          }
        }

        if (!Array.isArray(current)) return '';

        return current.map((item, index) => {
          const itemContext = { ...data, this: item, '@index': index };
          if (typeof item === 'object' && item !== null) {
            Object.assign(itemContext, item);
          }
          return interpolate(content, itemContext);
        }).join('');
      });

      result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g, (match, condition, ifContent, elseContent) => {
        const keys = condition.trim().split('.');
        let current: unknown = data;

        for (const k of keys) {
          if (current && typeof current === 'object' && !(current instanceof Array)) {
            current = (current as Record<string, unknown>)[k];
          } else {
            return elseContent || '';
          }
        }

        const isTruthy = current !== null && current !== undefined && current !== false && current !== 0 && current !== '';
        return isTruthy ? ifContent : (elseContent || '');
      });

      return result;
    };
  }

  /**
   * Recursively resolves all partials in a template string.
   * @param content - The template content possibly containing partial placeholders.
   * @returns The content with all partials inlined.
   * @throws {Error} If a referenced partial is not found.
   * @throws {TypeError} If content is not a string.
   */
  resolvePartials(content: string): string {
    if (typeof content !== 'string') {
      throw new TypeError('Content must be a string');
    }
    let result = content;

    const resolvePartial = (text: string): string => {
      return text.replace(/\{\{>\s*([^}]+)\s*\}\}/g, (match, partialName) => {
        const name = partialName.trim();
        const partial = this.partials.get(name);
        if (!partial) {
          throw new Error(`Partial '${name}' not found`);
        }
        return resolvePartial(partial);
      });
    };

    return resolvePartial(result);
  }

  /**
   * Clears all registered templates and partials.
   */
  clear(): void {
    this.templateCache.clear();
    this.partials.clear();
  }

  /**
   * Lists all registered template names.
   * @returns An array of template names.
   */
  listTemplates(): string[] {
    return Array.from(this.templateCache.keys());
  }

  /**
   * Lists all registered partial names.
   * @returns An array of partial names.
   */
  listPartials(): string[] {
    return Array.from(this.partials.keys());
  }

  /**
   * Removes a specific template by name.
   * @param name - The name of the template to remove.
   * @returns true if the template existed and was removed; otherwise false.
   * @throws {TypeError} If name is not a string.
   */
  removeTemplate(name: string): boolean {
    if (typeof name !== 'string' || !name.trim()) {
      throw new TypeError('Template name must be a non-empty string');
    }
    return this.templateCache.delete(name.trim());
  }

  /**
   * Removes a specific partial by name.
   * @param name - The name of the partial to remove.
   * @returns true if the partial existed and was removed; otherwise false.
   * @throws {TypeError} If name is not a string.
   */
  removePartial(name: string): boolean {
    if (typeof name !== 'string' || !name.trim()) {
      throw new TypeError('Partial name must be a non-empty string');
    }
    return this.partials.delete(name.trim());
  }
}

interface Citation {
  id: string;
  source: Source;
}

interface Source {
  id: string;
  title: string;
  authors: string[];
  year: number;
  publisher?: string;
  url?: string;
}
