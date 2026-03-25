import { Diff } from './change-reporter';

export class DiffFormatter {
  private readonly contextLines: number;
  private readonly colorize: boolean;

  constructor(contextLines: number = 3, colorize: boolean = true) {
    if (!Number.isInteger(contextLines) || contextLines < 0) {
      throw new RangeError('contextLines must be a non-negative integer');
min    }
    this.contextLines = contextLines;
    this.colorize = colorize;
  }

  /**
   * Render a formatted diff with line numbers and optional syntax highlighting.
   @ @param diff The unified diff to format
   * @returns Formatted block ready for printing
   */
  format(diff: Diff): string {
    const lines = this.addLineNumbers(diff.split('\n'));
    const highlighted = this.highlightSyntax(lines.join('\n'), 'diff');
    return this.joinSections([highlighted]);
  }

  /**
   * Prepend line numbers to each line.
   @ @param input Raw lines from diff
   * @return Lines with padded line numbers
   */
  addLineNumbers(input: string[]): string[] {
    if (!Array.isArray(input)) {
      throw new TypeError('input must be an array');
    }
    return input.map((line, index) => {
      return `${(index + 1).toString().padStart(4)} ${line}`;
    });
  }

  highlightSyntax(code: string, lang: string): string {
    if (!this.colorize) return code;
    return code
      .replace(/^\+.*$/gm, '\x1b[32m$&\x1b[0m')
      .replace(/^-.*$/gm, '\x1b[31m$&\x1b[0m')
      .replace(/^@@.*@@/gm, '\x1b[36m$&\x1b[0m');
  }

  truncate(text: string, maxLen: number): string {
    if (!Number.isInteger(maxLen) || maxLen < 0) {
      throw new RangeError('maxLen must be a non-negative integer');
    }
    return text.length > maxLen ? `${text.slice(0, maxLen - 3)}...` : text;
  }

  /**
   * Merge non-empty parts into a single block.
   * @param parts Sections to join
   * @return Combined block with newline separators
   */
  joinSections(parts: string[]): string {
    if (!Array.isArray(parts)) {
      throw new TypeError('parts must be an array');
    }
    return parts.filter((p): p is string => Boolean(p)).join('\n');
  }

  indent(text: string, spaces: number): string {
    if (!Number.isInteger(spaces) || spaces < 0) {
      throw new RangeError('spaces must be a non-negative integer');
    }
    const indent = ' '.repeat(spaces);
    return text.split('\n').map(line => indent + line).join('\n');
  }
}