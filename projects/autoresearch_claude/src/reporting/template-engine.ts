/**
 * Template Engine - Simple template engine for reports.
 * Supports {{variables}}, {{#each}}...{{/each}}, {{#if}}...{{/if}},
 * {{> partialName}} partial includes, and custom helpers.
 */

export type HelperFn = (...args: unknown[]) => string;
export type CompiledTemplate = (data: Record<string, unknown>) => string;

export class TemplateEngine {
  private templates: Map<string, string>;
  private helpers: Map<string, HelperFn>;

  constructor() {
    this.templates = new Map<string, string>();
    this.helpers = new Map<string, HelperFn>();

    // Built-in helpers
    this.helpers.set("uppercase", (val: unknown) => String(val).toUpperCase());
    this.helpers.set("lowercase", (val: unknown) => String(val).toLowerCase());
    this.helpers.set("capitalize", (val: unknown) => {
      const s = String(val);
      return s.charAt(0).toUpperCase() + s.slice(1);
    });
    this.helpers.set("truncate", (val: unknown, len: unknown) => {
      const s = String(val);
      const n = Number(len) || 100;
      return s.length > n ? s.slice(0, n) + "..." : s;
    });
  }

  /**
   * Register a named template string.
   */
  register(name: string, template: string): void {
    this.templates.set(name, template);
  }

  /**
   * Render a registered template by name with the given data context.
   */
  render(templateName: string, data: Record<string, unknown>): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }
    return this.processTemplate(template, data);
  }

  /**
   * Register a custom helper function.
   */
  addHelper(name: string, fn: HelperFn): void {
    this.helpers.set(name, fn);
  }

  /**
   * Compile a template string into a reusable render function.
   */
  compile(template: string): CompiledTemplate {
    return (data: Record<string, unknown>): string => {
      return this.processTemplate(template, data);
    };
  }

  // --- Core template processing ---

  private processTemplate(
    template: string,
    data: Record<string, unknown>
  ): string {
    let result = template;

    // Resolve partials first: {{> partialName}}
    result = this.resolvePartials(result, data);

    // Process {{#each items}}...{{/each}} blocks
    result = this.processEachBlocks(result, data);

    // Process {{#if condition}}...{{else}}...{{/if}} blocks
    result = this.processIfBlocks(result, data);

    // Process helper calls: {{helperName arg1 arg2}}
    result = this.processHelpers(result, data);

    // Replace simple variable interpolations: {{variable}} and {{obj.prop}}
    result = this.processVariables(result, data);

    return result;
  }

  private resolvePartials(
    template: string,
    data: Record<string, unknown>
  ): string {
    const partialRegex = /\{\{>\s*(\w+)\s*\}\}/g;
    let result = template;
    let match: RegExpExecArray | null;
    // Use a loop with fresh regex to handle nested partials (up to 10 depth)
    let depth = 0;
    while (depth < 10) {
      const regex = /\{\{>\s*(\w+)\s*\}\}/g;
      match = regex.exec(result);
      if (!match) break;
      result = result.replace(partialRegex, (_fullMatch, partialName: string) => {
        const partial = this.templates.get(partialName);
        if (!partial) {
          return `<!-- partial "${partialName}" not found -->`;
        }
        return partial;
      });
      depth++;
    }
    return result;
  }

  private processEachBlocks(
    template: string,
    data: Record<string, unknown>
  ): string {
    // Match {{#each items}}...{{/each}}, supporting nested blocks via
    // a non-greedy innermost-first approach.
    const eachRegex =
      /\{\{#each\s+(\w[\w.]*)\s*\}\}([\s\S]*?)\{\{\/each\}\}/g;

    let result = template;
    let prevResult = "";

    // Iterate until stable (handles nested each blocks from inside out)
    while (result !== prevResult) {
      prevResult = result;
      result = result.replace(
        eachRegex,
        (_fullMatch, iterableKey: string, body: string) => {
          const items = this.resolvePath(data, iterableKey);
          if (!Array.isArray(items)) return "";

          return items
            .map((item, index) => {
              const itemData: Record<string, unknown> = {
                ...data,
                "@index": index,
                "@first": index === 0,
                "@last": index === items.length - 1,
              };

              if (typeof item === "object" && item !== null) {
                Object.assign(itemData, item as Record<string, unknown>);
                itemData["this"] = item;
              } else {
                itemData["this"] = item;
              }

              return this.processTemplate(body, itemData);
            })
            .join("");
        }
      );
    }

    return result;
  }

  private processIfBlocks(
    template: string,
    data: Record<string, unknown>
  ): string {
    // Match {{#if cond}}...{{else}}...{{/if}} and {{#if cond}}...{{/if}}
    const ifElseRegex =
      /\{\{#if\s+(\w[\w.]*)\s*\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
    const ifRegex =
      /\{\{#if\s+(\w[\w.]*)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g;

    let result = template;
    let prevResult = "";

    // Process from inside out until stable
    while (result !== prevResult) {
      prevResult = result;

      // First handle if/else
      result = result.replace(
        ifElseRegex,
        (_fullMatch, condKey: string, trueBlock: string, falseBlock: string) => {
          const val = this.resolvePath(data, condKey);
          const truthy = this.isTruthy(val);
          const chosen = truthy ? trueBlock : falseBlock;
          return this.processTemplate(chosen, data);
        }
      );

      // Then handle simple if (no else)
      result = result.replace(
        ifRegex,
        (_fullMatch, condKey: string, body: string) => {
          const val = this.resolvePath(data, condKey);
          return this.isTruthy(val) ? this.processTemplate(body, data) : "";
        }
      );
    }

    return result;
  }

  private processHelpers(
    template: string,
    data: Record<string, unknown>
  ): string {
    // Match {{helperName arg1 arg2 ...}} where helperName is a known helper.
    // We need to be careful not to match block tags or variables.
    const helperNames = Array.from(this.helpers.keys()).join("|");
    if (!helperNames) return template;

    const helperRegex = new RegExp(
      `\\{\\{\\s*(${helperNames})\\s+([^}]+?)\\s*\\}\\}`,
      "g"
    );

    return template.replace(helperRegex, (_fullMatch, name: string, argsStr: string) => {
      const helper = this.helpers.get(name);
      if (!helper) return _fullMatch;

      // Parse arguments: resolve data paths or use literal strings/numbers
      const args = argsStr.split(/\s+/).map((arg) => {
        // Quoted string literal
        const strMatch = arg.match(/^["'](.*)["']$/);
        if (strMatch) return strMatch[1];
        // Number literal
        if (/^-?\d+(\.\d+)?$/.test(arg)) return Number(arg);
        // Data path
        return this.resolvePath(data, arg);
      });

      return helper(...args);
    });
  }

  private processVariables(
    template: string,
    data: Record<string, unknown>
  ): string {
    return template.replace(/\{\{\s*([\w.@]+)\s*\}\}/g, (_match, key: string) => {
      const val = this.resolvePath(data, key);
      if (val === undefined || val === null) return "";
      return String(val);
    });
  }

  // --- Utility ---

  private resolvePath(data: Record<string, unknown>, path: string): unknown {
    const parts = path.split(".");
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  private isTruthy(val: unknown): boolean {
    if (val === null || val === undefined || val === false || val === 0 || val === "") {
      return false;
    }
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }
}
