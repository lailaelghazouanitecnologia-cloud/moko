/**
 * Represents the result of parsing a file or input string.
 * Contains the raw parsed data, the format identifier, and optional metadata.
 */
export interface ParsedResult {
  /**
   * The raw data extracted from the input.
   * The actual type depends on the parser used (e.g., object for JSON, string for CSV, etc.).
   */
  data: any;

  /**
   * Identifies the format of the original input (e.g., 'json', 'yaml', 'csv', 'xml').
   */
  format: string;

  /**
   * Additional information about the parse operation or the data itself.
   * Properties are optional and depend on the parser implementation.
   */
  metadata: Record<string, unknown>;
}
