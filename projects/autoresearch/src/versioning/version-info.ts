/**
 * Version metadata for tracking changes to content over time.
 */
export interface VersionInfo {
  /**
   * Unique identifier for this version (e.g., UUID or SHA-1).
   */
  id: string;

  /**
   * Creation timestamp of this version.
   */
  timestamp: Date;

  /**
   * Human-readable description of what changed in this version.
   */
  message: string;

  /**
   * Cryptographic hash of the content at this version.
   */
  contentHash: string;

  /**
   * Optional tags for categorizing or filtering versions.
   */
  tags: string[];

  /**
   * Identifier of the author/actor who created this version.
   */
  author: string;
}
