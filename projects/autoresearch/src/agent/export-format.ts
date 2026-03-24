/**
 * Supported export formats for event data.
 * @readonly
 * @enum {string}
 */
export enum ExportFormat {
  /**
   * JavaScript Object Notation.
   * Human-readable, widely supported.
   */
  JSON = 'JSON',

  /**
   * Comma-Separated Values.
   * Ideal for tabular data and spreadsheets.
   */
  CSV = 'CSV',

  /**
   * Plain text.
   * Simple, unstructured textual output.
   */
  TEXT = 'TEXT'
}

/**
 * Utility namespace for {@link ExportFormat}.
 */
export namespace ExportFormat {
  /**
   * All valid export format values.
   */
  export const VALUES: ReadonlyArray<ExportFormat> = Object.freeze([
    ExportFormat.JSON,
    ExportFormat.CSV,
    ExportFormat.TEXT
  ]);

  /**
   * Attempts to parse a string into an {@link ExportFormat}.
   *
   * @param value - The string to parse.
   * @returns The matching {@link ExportFormat}.
   * @throws {TypeError} If `value` is not a string.
   * @throws {RangeError} If `value` does not match any known format.
   *
   * @example
   * ```ts
   * const fmt = ExportFormat.from('csv'); // ExportFormat.CSV
   * ```
   */
  export function from(value: string): ExportFormat {
    if (typeof value !== 'string') {
      throw new TypeError('ExportFormat.from expects a string');
    }

    const upper = value.trim().toUpperCase();

    switch (upper) {
      case 'JSON':
        return ExportFormat.JSON;
      case 'CSV':
        return ExportFormat.CSV;
      case 'TEXT':
        return ExportFormat.TEXT;
      default:
        throw new RangeError(
          `Unknown export format "${value}". Valid values are: ${VALUES.join(', ')}`
        );
    }
  }

  /**
   * Safely attempts to parse a string into an {@link ExportFormat}.
   *
   * @param value - The string to parse.
   * @returns The matching {@link ExportFormat}, or `undefined` if invalid.
   *
   * @example
   * ```ts
   * const fmt = ExportFormat.safeFrom('xml'); // undefined
   * ```
   */
  export function safeFrom(value: string): ExportFormat | undefined {
    try {
      return from(value);
    } catch {
      return undefined;
    }
  }

  /**
   * Returns the file extension associated with the format (without leading dot).
   *
   * @param format - The export format.
   * @returns The canonical file extension.
   *
   * @example
   * ```ts
   * ExportFormat.extension(ExportFormat.CSV); // "csv"
   * ```
   */
  export function extension(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.JSON:
        return 'json';
      case ExportFormat.CSV:
        return 'csv';
      case ExportFormat.TEXT:
        return 'txt';
      default:
        // Exhaustiveness check ensures compile-time safety
        const _exhaustive: never = format;
        throw new Error(`Unhandled ExportFormat: ${_exhaustive}`);
    }
  }

  /**
   * Returns the MIME content-type associated with the format.
   *
   * @param format - The export format.
   * @returns The MIME type string.
   *
   * @example
   * ```ts
   * ExportFormat.mimeType(ExportFormat.JSON); // "application/json"
   * ```
   */
  export function mimeType(format: ExportFormat): string {
    switch (format) {
      case ExportFormat.JSON:
        return 'application/json';
      case ExportFormat.CSV:
        return 'text/csv';
      case ExportFormat.TEXT:
        return 'text/plain';
      default:
        const _exhaustive: never = format;
        throw new Error(`Unhandled ExportFormat: ${_exhaustive}`);
    }
  }

  /**
   * Checks whether the supplied value is a valid {@link ExportFormat}.
   *
   * @param value - The value to test.
   * @returns `true` if `value` is a valid enum member.
   *
   * @example
   * ```ts
   * ExportFormat.isValid('CSV');        // true
   * ExportFormat.isValid('xml');       // false
   * ExportFormat.isValid(ExportFormat.JSON); // true
   * ```
   */
  export function isValid(value: unknown): value is ExportFormat {
    return VALUES.includes(value as ExportFormat);
  }
}
