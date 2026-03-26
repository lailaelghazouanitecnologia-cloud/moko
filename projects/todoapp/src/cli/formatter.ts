import { Config, Result, ValidationError } from '../core';
import { CommandExecutor, CommandParser } from '../commands';
import { CLI } from './cli';

export interface Theme {
  readonly bold: string;
  readonly dim: string;
  readonly red: string;
  readonly green: string;
  readonly yellow: string;
  readonly blue: string;
  readonly reset: string;
}

export class Formatter {
  private readonly theme: Theme;
  private readonly width: number;

  constructor(theme: Theme, width: number) {
    this.theme = theme;
    this.width = width;
  }

  bold(text: string): string {
    return `${this.theme.bold}${text}${this.theme.reset}`;
  }

  dim(text: string): string {
    return `${this.theme.dim}${text}${this.theme.reset}`;
  }

  red(text: string): string {
    return `${this.theme.red}${text}${this.theme.reset}`;
  }

  green(text: string): string {
    return `${this.theme.green}${text}${this.theme.reset}`;
  }

  yellow(text: string): string {
    return `${this.theme.yellow}${text}${this.theme.reset}`;
  }

  blue(text: string): string {
    return `${this.theme.blue}${text}${this.theme.reset}`;
  }

  table(rows: string[][]): string {
    if (!Array.isArray(rows)) {
      throw new TypeError('rows must be an array');
    }
    if (rows.length === 0) {
      return '';
    }

    const columnWidths = this.calculateColumnWidths(rows);
    const lines = rows.map(row => this.formatRow(row, columnWidths));
    
    return lines.join('\n');
  }

  wrap(text: string, maxWidth?: number): string {
    const width = maxWidth ?? this.width;

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= width) {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n');
  }

  private calculateColumnWidths(rows: string[][]): number[] {
    const numColumns = Math.max(...rows.map(row => row.length));
    const widths = new Array(numColumns).fill(0);

    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        widths[i] = Math.max(widths[i], row[i]?.length ?? 0);
      }
    }

    return widths;
  }

  private formatRow(row: string[], columnWidths: number[]): string {
    const cells = row.map((cell, index) => {
      const width = columnWidths[index] ?? 0;
      return (cell ?? '').padEnd(width);
    });

    return cells.join('  ');
  }
}
