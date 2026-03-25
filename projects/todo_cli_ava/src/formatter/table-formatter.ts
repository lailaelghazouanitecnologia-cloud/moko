import { Task } from '../model/task';

/**
 * Formats task lists for terminal display with customizable alignment, spacing, and borders.
 */
export class TableFormatter {
  private rows: string[][];
  private colWidths: number[];
  private spacing: number;
  private alignments: ('left' | 'center' | 'right')[];
  private borders: { top: boolean; bottom: boolean; all: boolean };

  constructor() {
    this.rows = [];
    this.colWidths = [];
    this.spacing = 1;
    this.alignments = [];
    this.borders = { top: false, bottom: false, all: false };
  }

  /**
   * Renders a table string from the provided tasks.
   * @param tasks - Array of tasks to format
   * @returns Formatted table string
   * @throws {TypeError} If tasks is not an array
   */
  format(tasks: Task[]): string {
    if (!Array.isArray(tasks)) {
      throw new TypeError('Expected tasks to be an array');
    }

    this.rows = [];
    this.colWidths = [];

    // Header row
    const headers = ['ID', 'Title', 'Priority', 'Status'];
    this.rows.push(headers);

    // Task rows
    for (const task of tasks) {
      this.rows.push([
        task.id.toString(),
        task.title,
        task.priority,
        task.status.toString()
      ]);
    }

    // Calculate column widths
    const numCols = headers.length;
    for (let i = 0; i < numCols; i++) {
      let maxWidth = 0;
      for (const row of this.rows) {
        if (i < row.length) {
          maxWidth = Math.max(maxWidth, row[i].length);
        }
      }
      this.colWidths[i] = maxWidth;
    }

    // Apply custom widths if set
    for (let i = 0; i < this.colWidths.length; i++) {
      if (i < this.colWidths.length && this.colWidths[i] !== undefined) {
        this.colWidths[i] = Math.max(this.colWidths[i], this.colWidths[i] || 0);
      }
    }

    // Build table string
    const lines: string[] = [];

    // Top border
    if (this.borders.top || this.borders.all) {
      lines.push(this.buildHorizontalBorder());
    }

    // Header row
    lines.push(this.buildRow(this.rows[0], true));

    // Separator after header
    if (this.borders.all) {
      lines.push(this.buildHorizontalBorder());
    }

    // Data rows
    for (let i = 1; i < this.rows.length; i++) {
      lines.push(this.buildRow(this.rows[i], false));
    }

    // Bottom border
    if (this.borders.bottom || this.borders.all) {
      lines.push(this.buildHorizontalBorder());
    }

    return lines.join('\n');
  }

  /**
   * Sets custom column widths to override calculated widths.
   * @param widths - Array of column widths
   * @throws {TypeError} If widths is not an array
   * @throws {RangeError} If any width is negative
   */
  setColumnWidths(widths: number[]): void {
    if (!Array.isArray(widths)) {
      throw new TypeError('Expected widths to be an array');
    }
    if (widths.some(w => typeof w !== 'number' || w < 0)) {
      throw new RangeError('All widths must be non-negative numbers');
    }
    this.colWidths = [...widths];
  }

  /**
   * Sets the spacing between columns.
   * @param padding - Number of spaces between columns
   * @throws {TypeError} If padding is not a number
   * @throws {RangeError} If padding is negative
   */
  setSpacing(padding: number): void {
    if (typeof padding !== 'number') {
      throw new TypeError('Expected padding to be a number');
    }
    if (padding < 0) {
      throw new RangeError('Padding must be non-negative');
    }
    this.spacing = padding;
  }

  /**
   * Sets alignment for a specific column.
   * @param col - Column index
   * @param align - Alignment type
   * @throws {TypeError} If col is not a number or align is invalid
   * @throws {RangeError} If col is negative
   */
  alignColumn(col: number, align: 'left' | 'center' | 'right'): void {
    if (typeof col !== 'number') {
      throw new TypeError('Expected col to be a number');
    }
    if (col < 0) {
      throw new RangeError('Column index must be non-negative');
    }
    if (!['left', 'center', 'right'].includes(align)) {
      throw new TypeError("align must be 'left', 'center', or 'right'");
    }
    this.alignments[col] = align;
  }

  /**
   * Adds borders to the table.
   * @param type - Border type
   * @throws {TypeError} If type is invalid
   */
  addBorder(type: 'all' | 'top' | 'bottom'): void {
    if (!['all', 'top', 'bottom'].includes(type)) {
      throw new TypeError("type must be 'all', 'top', or 'bottom'");
    }
    if (type === 'all') {
      this.borders.all = true;
      this.borders.top = false;
      this.borders.bottom = false;
    } else if (type === 'top') {
      this.borders.top = true;
    } else if (type === 'bottom') {
      this.borders.bottom = true;
    }
  }

  private buildRow(row: string[], isHeader: boolean): string {
    const cells: string[] = [];
    const numCols = Math.max(row.length, this.colWidths.length);

    for (let i = 0; i < numCols; i++) {
      const content = i < row.length ? row[i] : '';
      const width = i < this.colWidths.length ? this.colWidths[i] : content.length;
      const alignment = this.alignments[i] || 'left';
      const padded = this.padString(content, width, alignment);
      cells.push(padded);
    }

    const spacingStr = ' '.repeat(this.spacing);
    return cells.join(spacingStr);
  }

  private padString(str: string, width: number, alignment: 'left' | 'center' | 'right'): string {
    const padLength = Math.max(0, width - str.length);
    const leftPad = alignment === 'left' ? 0 : alignment === 'center' ? Math.floor(padLength / 2) : padLength;
    const rightPad = padLength - leftPad;
    return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
  }

  private buildHorizontalBorder(): string {
    const parts: string[] = [];
    for (let i = 0; i < this.colWidths.length; i++) {
      const width = this.colWidths[i] || 0;
      parts.push('-'.repeat(width));
    }
    return parts.join('-'.repeat(this.spacing));
  }
}