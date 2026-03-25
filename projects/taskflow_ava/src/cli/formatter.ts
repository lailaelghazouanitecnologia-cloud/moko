export type Theme = {
  readonly primary: string;
  readonly secondary: string;
  readonly success: string;
  readonly error: string;
  readonly warning: string;
  readonly info: string;
  readonly muted: string;
};

export class Formatter {
  private readonly theme: Theme;
  private readonly width: number;

  constructor(theme: Theme, width: number = 80) {
    if (typeof theme !== 'object' || theme === null) {
      throw new TypeError('theme must be a valid Theme object');
    }
    if (typeof width !== 'number' || width <= 0) {
      throw new RangeError('width must be a positive number');
    }
    this.theme = theme;
    this.width = width;
  }

  /**
   * Wraps the given text in ANSI bold codes.
   * @param text - The text to bold.
   * @returns The bolded text.
   */
  bold(text: string): string {
    if (typeof text !== 'string') {
      throw new TypeError('text must be a string');
    }
    return `\x1b[1m${text}\x1b[22m`;
  }

  /**
   * Applies the specified color to the text.
   * @param text - The text to color.
   * @param color - The color name or hex code.
   * @returns The colored text.
   */
  color(text: string, color: string): string {
    if (typeof text !== 'string') {
      throw new TypeError('text must be a string');
    }
    if (typeof color !== 'string') {
      throw new TypeError('color must be a string');
    }
    const colorCode = this.resolveColorCode(color);
    return `${colorCode}${text}\x1b[0m`;
  }

  /**
   * Formats a 2D array of strings as a table.
   * @param rows - The rows of the table.
   * @returns The formatted table string.
   */
  table(rows: string[][]): string {
    if (!Array.isArray(rows)) {
      throw new TypeError('rows must be an array');
    }
    if (rows.length === 0) return '';

    const columnWidths = this.calculateColumnWidths(rows);
    const lines = rows.map(row =>
      row.map((cell, i) => this.pad(cell, columnWidths[i])).join('  ')
    );

    return lines.join('\n');
  }

  /**
   * Wraps the text to fit within the specified width.
   * @param text - The text to wrap.
   * @param maxWidth - The maximum width; defaults to instance width.
   * @returns The wrapped text.
   */
  wrap(text: string, maxWidth?: number): string {
    if (typeof text !== 'string') {
      throw new TypeError('text must be a string');
    }
    if (maxWidth !== undefined && (typeof maxWidth !== 'number' || maxWidth <= 0)) {
      throw new RangeError('maxWidth must be a positive number');
    }
    const width = maxWidth ?? this.width;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines.join('\n');
  }

  /**
   * Pads the text to the specified length with spaces.
   * @param text - The text to pad.
   * @param len - The target length.
   * @returns The padded text.
   */
  pad(text: string, len: number): string {
    if (typeof text !== 'string') {
      throw new TypeError('text must be a string');
    }
    if (typeof len !== 'number' || len < 0) {
      throw new RangeError('len must be a non-negative number');
    }
    if (text.length >= len) return text;
    return text + ' '.repeat(len - text.length);
  }

  /**
   * Formats a title as a decorative header.
   * @param title - The title text.
   * @returns The formatted header.
   */
  header(title: string): string {
    if (typeof title !== 'string') {
      throw new TypeError('title must be a string');
    }
    const line = '─'.repeat(title.length + 4);
    return `${line}\n  ${this.bold(title)}\n${line}`;
  }

  /**
   * Styles a message as an error using the theme's error color.
   * @param msg - The error message.
   * @returns The styled error message.
   */
  error(msg: string): string {
    if (typeof msg !== 'string') {
      throw new TypeError('msg must be a string');
    }
    return this.color(msg, this.theme.error);
  }

  /**
   * Styles a message as a success using the theme's success color.
   * @param msg - The success message.
   * @returns The styled success message.
   */
  success(msg: string): string {
    if (typeof msg !== 'string') {
      throw new TypeError('msg must be a string');
    }
    return this.color(msg, this.theme.success);
  }

  private resolveColorCode(color: string): string {
    const colorMap: Record<string, string> = {
      black: '\x1b[30m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      gray: '\x1b[90m',
      grey: '\x1b[90m'
    };

    if (color.startsWith('#')) {
      return `\x1b[38;5;${this.hexToAnsi256(color)}m`;
    }

    return colorMap[color.toLowerCase()] ?? '\x1b[0m';
  }

  private hexToAnsi256(hex: string): number {
    if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      throw new RangeError('hex must be a valid 6-digit hex color');
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    if (r === g && g === b) {
      if (r < 8) return 16;
      if (r > 248) return 231;
      return Math.round(((r - 8) / 247) * 24) + 232;
    }

    const ansi = 16 +
      (36 * Math.round(r / 255 * 5)) +
      (6 * Math.round(g / 255 * 5)) +
      Math.round(b / 255 * 5);

    return ansi;
  }

  private calculateColumnWidths(rows: string[][]): number[] {
    const numCols = Math.max(...rows.map(row => row.length));
    const widths = new Array(numCols).fill(0);

    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        widths[i] = Math.max(widths[i], row[i].length);
      }
    }

    return widths;
  }
}
