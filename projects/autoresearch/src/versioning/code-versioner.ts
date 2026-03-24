import { GitGateway } from './git-gateway';
import { VersionInfo } from './version-info';

/**
 * Manages code versioning and change tracking
 */
export class CodeVersioner {
  private gitGateway: GitGateway;
  private versions: Map<string, VersionInfo>;

  /**
   * Creates an instance of CodeVersioner
   * @param gitGateway - The Git gateway instance for version control operations
   */
  constructor(gitGateway: GitGateway) {
    if (!gitGateway) {
      throw new Error('GitGateway is required');
    }
    this.gitGateway = gitGateway;
    this.versions = new Map<string, VersionInfo>();
  }

  /**
   * Creates a new version of the code
   * @param content - The content to be versioned
   * @param message - The commit message
   * @returns The version ID (commit hash)
   * @throws Error if version creation fails
   */
  public createVersion(content: string, message: string): string {
    this.validateString(content, 'content');
    this.validateString(message, 'message');

    try {
      const commitHash = this.gitGateway.commit(message, content);
      const commitInfo = this.gitGateway.getCommit(commitHash);
      
      const versionInfo: VersionInfo = {
        id: commitHash,
        timestamp: commitInfo.date,
        message: commitInfo.message,
        contentHash: commitHash,
        tags: [],
        author: commitInfo.author
      };
      
      this.versions.set(commitHash, versionInfo);
      return commitHash;
    } catch (error) {
      throw new Error(`Failed to create version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Retrieves version information by ID
   * @param versionId - The version ID
   * @returns The version information
   * @throws Error if version not found
   */
  public getVersion(versionId: string): VersionInfo {
    this.validateString(versionId, 'versionId');
    
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    return version;
  }

  /**
   * Lists all versions sorted by timestamp (newest first)
   * @returns Array of version information
   */
  public listVersions(): VersionInfo[] {
    return Array.from(this.versions.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  /**
   * Compares two versions and returns the diff
   * @param v1 - First version ID
   * @param v2 - Second version ID
   * @returns Diff result with additions, deletions, and changes
   * @throws Error if either version not found
   */
  public compareVersions(v1: string, v2: string): DiffResult {
    this.validateString(v1, 'v1');
    this.validateString(v2, 'v2');
    
    if (!this.versions.has(v1)) {
      throw new Error(`Version ${v1} not found`);
    }
    if (!this.versions.has(v2)) {
      throw new Error(`Version ${v2} not found`);
    }

    try {
      const diff = this.gitGateway.diff(v1, v2);
      const lines = diff.split('\n');
      
      let additions = 0;
      let deletions = 0;
      
      for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
        }
      }
      
      return {
        additions,
        deletions,
        changes: additions + deletions,
        diff
      };
    } catch (error) {
      throw new Error(`Failed to compare versions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Rolls back to a specific version
   * @param versionId - The version ID to rollback to
   * @returns True if successful, false otherwise
   * @throws Error if version not found
   */
  public rollbackTo(versionId: string): boolean {
    this.validateString(versionId, 'versionId');
    
    if (!this.versions.has(versionId)) {
      throw new Error(`Version ${versionId} not found`);
    }

    try {
      this.gitGateway.checkout(versionId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Deletes a version
   * @param versionId - The version ID to delete
   * @returns True if deleted, false if not found
   */
  public deleteVersion(versionId: string): boolean {
    this.validateString(versionId, 'versionId');
    return this.versions.delete(versionId);
  }

  /**
   * Gets the current version ID
   * @returns The current version ID
   * @throws Error if no versions available
   */
  public getCurrentVersion(): string {
    const history = this.gitGateway.getHistory(1);
    if (history.length === 0) {
      throw new Error('No versions available');
    }
    return history[0].hash;
  }

  /**
   * Adds a tag to a version
   * @param versionId - The version ID
   * @param tag - The tag to add
   * @throws Error if version not found
   */
  public tagVersion(versionId: string, tag: string): void {
    this.validateString(versionId, 'versionId');
    this.validateString(tag, 'tag');
    
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    
    if (!version.tags.includes(tag)) {
      version.tags.push(tag);
    }
  }

  /**
   * Finds a version by tag
   * @param tag - The tag to search for
   * @returns The version ID
   * @throws Error if no version found with tag
   */
  public findByTag(tag: string): string {
    this.validateString(tag, 'tag');
    
    for (const [versionId, version] of this.versions) {
      if (version.tags.includes(tag)) {
        return versionId;
      }
    }
    throw new Error(`No version found with tag ${tag}`);
  }

  /**
   * Validates a string input
   * @param value - The value to validate
   * @param name - The parameter name for error messages
   * @throws Error if validation fails
   */
  private validateString(value: unknown, name: string): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${name} must be a non-empty string`);
    }
  }

  /**
   * Gets all tags across all versions
   * @returns Array of unique tags
   */
  public getAllTags(): string[] {
    const allTags = new Set<string>();
    for (const version of this.versions.values()) {
      for (const tag of version.tags) {
        allTags.add(tag);
      }
    }
    return Array.from(allTags);
  }

  /**
   * Removes a tag from a version
   * @param versionId - The version ID
   * * @param tag - The tag to remove
   * @throws Error if version not found
   */
  public untagVersion(versionId: string, tag: string): void {
    this.validateString(versionId, 'versionId');
    this.validateString(tag, 'tag');
    
    const version = this.versions.get(versionId);
    if (!version) {
      throw new Error(`Version ${versionId} not found`);
    }
    
    const tagIndex = version.tags.indexOf(tag);
    if (tagIndex !== -1) {
      version.tags.splice(tagIndex, 1);
    }
  }

  /**
   * Gets versions by author
   * @param author - The author name
   * @returns Array of version information
   */
  public getVersionsByAuthor(author: string): VersionInfo[] {
    this.validateString(author, 'author');
    
    return Array.from(this.versions.values())
      .filter(version => version.author === author)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Gets the total number of versions
   * @returns The count of versions
   */
  public getVersionCount(): number {
    return this.versions.size;
  }

  /**
   * Clears all versions (use with caution)
   */
  public clearAllVersions(): void {
    this.versions.clear();
  }
}