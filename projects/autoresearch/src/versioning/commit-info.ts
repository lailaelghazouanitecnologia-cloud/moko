/**
 * Git commit information
 */
export interface CommitInfo {
  /**
   * SHA-1 or SHA-256 commit hash
   */
  hash: string;

  /**
   * Commit message
   */
  message: string;

  /**
   * Author name (and optionally email)
   */
  author: string;

  /**
   * Commit date
   */
  date: Date;

  /**
   * Parent commit hashes
   */
  parents: string[];
}
