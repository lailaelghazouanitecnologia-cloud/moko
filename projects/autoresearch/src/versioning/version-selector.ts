import { CodeVersioner } from './code-versioner';
import { SelectionStrategy } from './selection-strategy';

/**
 * Selects optimal version based on criteria
 */
export class VersionSelector {
  private versioner: CodeVersioner;
  private strategy: SelectionStrategy;

  constructor(versioner: CodeVersioner, strategy: SelectionStrategy = SelectionStrategy.LATEST) {
    if (!versioner) {
      throw new Error('CodeVersioner instance is required');
    }
    this.version = versioner;
    this.strategy = strategy;
  }

  /**
   * Selects a version based on the provided criteria
   * @param criteria - Selection criteria for choosing a version
   * @returns The ID of the selected version
   * @throws {Error} If no versions are available or criteria are invalid
   */
  public selectVersion(criteria: SelectionCriteria): string {
    if (!criteria) {
      throw new Error('Selection criteria is required');
    }

    const versions = this.versioner.listVersions();
    if (versions.length === 0) {
      throw new Error('No versions available');
    }

    switch (criteria.strategy) {
      case SelectionStrategy.BY_DATE:
        return this.selectByDate(criteria.date || new Date());
      case SelectionStrategy.BY_TAG:
        return criteria.tag ? this.selectByTag(criteria.tag) : this.selectLatestStable();
      case SelectionStrategy.BEFORE_VERSION:
        return criteria.versionId ? this.selectBeforeVersion(criteria.versionId) : this.selectLatestStable();
      case SelectionStrategy.AFTER_VERSION:
        return criteria.versionId ? this.selectAfterVersion(criteria.versionId) : this.selectLatestStable();
      case SelectionStrategy.LATEST_STABLE:
      default:
        return this.selectLatestStable();
    }
  }

  /**
   * Selects the version closest to the specified date
   * @param date - The target date
   * @returns The ID of the closest version
   * @throws {Error} If date is invalid or no versions are available
   */
  public selectByDate(date: Date): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Valid date is required');
    }

    const versions = this.versioner.listVersions();
    if (versions.length === 0) {
      throw new Error('No versions available');
    }

    let closestVersion: VersionInfo | null = null;
    let minTimeDiff = Infinity;

    for (const version of versions) {
      const timeDiff = Math.abs(version.timestamp.getTime() - date.getTime());
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestVersion = version;
      }
    }

    return closestVersion ? closestVersion.id : this.selectLatestStable();
  }

  /**
   * Selects a version by its tag
   * @param tag - The tag to search for
   * @returns The ID of the version with the matching tag
   * @throws {Error} If tag is invalid or not found
   */
  public selectByTag(tag: string): string {
    if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
      throw new Error('Valid tag is required');
    }

    try {
      return this.versioner.findByTag(tag);
    } catch (error) {
      return this.selectLatestStable();
    }
  }

  /**
   * Selects the latest stable version
   * @returns The ID of the latest stable version
   * @throws {Error} If no versions are available
   */
  public selectLatestStable(): string {
    const versions = this.versioner.listVersions();
    if (versions.length === 0) {
      throw new Error('No versions available');
    }

    const sortedVersions = versions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return sortedVersions[0].id;
  }

  /**
   * Selects the version immediately before the specified version
   * @param versionId - The reference version ID
   * @returns The ID of the previous version
   * @throws {Error} If versionId is invalid or no previous version exists
   */
  public selectBeforeVersion(versionId: string): string {
    if (!versionId || typeof versionId !== 'string' || versionId.trim().length === 0) {
      throw new Error('Valid version ID is required');
    }

    const versions = this.versioner.listVersions();
    if (versions.length === 0) {
      throw new Error('No versions available');
    }

    let targetVersion: VersionInfo;
    try {
      targetVersion = this.versioner.getVersion(versionId);
    } catch (error) {
      throw new Error(`Version with ID ${versionId} not found`);
    }

    const earlierVersions = versions.filter(v => v.timestamp < targetVersion.timestamp);
    if (earlierVersions.length === 0) {
      throw new Error('No version exists before the specified version');
    }

    const sortedVersions = earlierVersions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return sortedVersions[0].id;
  }

  /**
   * Selects the version immediately after the specified version
   * @param versionId - The reference version ID
   * @returns The ID of the next version
   * @throws {Error} If versionId is invalid or no subsequent version exists
   */
  public selectAfterVersion(versionId: string): string {
    if (!versionId || typeof versionId !== 'string' || versionId.trim().length === 0) {
      throw new Error('Valid version ID is required');
    }

    const versions = this.versioner.listVersions();
    if (versions.length === 0) {
      throw new Error('No versions available');
    }

    let targetVersion: VersionInfo;
    try {
      targetVersion = this.versioner.getVersion(versionId);
    } catch (error) {
      throw new Error(`Version with ID ${versionId} not found`);
    }

    const laterVersions = versions.filter(v => v.timestamp > targetVersion.timestamp);
    if (laterVersions.length === 0) {
      throw new Error('No version exists after the specified version');
    }

    const sortedVersions = laterVersions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return sortedVersions[0].id;
  }

  /**
   * Retrieves all versions within a specified range
   * @param from - The start version ID
   * @param to - The end version ID
   * @returns An array of versions in chronological order
   * @throws {Error} If either version ID is invalid or not found
   */
  public getVersionRange(from: string, to: string): VersionInfo[] {
    if (!from || typeof from !== 'string' || from.trim().length === 0) {
      throw new Error('Valid start version ID is required');
    }

    if (!to || typeof to !== 'string' || to.trim().length === 0) {
      throw new Error('Valid end version ID is required');
    }

    const versions = this.versioner.listVersions();
    if (versions.length === 0) {
      throw new Error('No versions available');
    }

    let fromVersion: VersionInfo;
    let toVersion: VersionInfo;

    try {
      fromVersion = this.versioner.getVersion(from);
    } catch (error) {
      throw new Error(`Start version with ID ${from} not found`);
    }

    try {
      toVersion = this.versioner.getVersion(to);
    } catch (error) {
      throw new Error(`End version with ID ${to} not found`);
    }

    const minTime = Math.min(fromVersion.timestamp.getTime(), toVersion.timestamp.getTime());
    const maxTime = Math.max(fromVersion.timestamp.getTime(), toVersion.timestamp.getTime());

    return versions
      .filter(v => v.timestamp.getTime() >= minTime && v.timestamp.getTime() <= maxTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Sets the selection strategy for future operations
   * @param strategy - The new selection strategy
   */
  public setStrategy(strategy: SelectionStrategy): void {
    if (!strategy || !Object.values(SelectionStrategy).includes(strategy)) {
      throw new Error('Valid selection strategy is required');
    }
    this.strategy = strategy;
  }

  /**
   * Gets the current selection strategy
   * @returns The current selection strategy
   */
  public getStrategy(): SelectionStrategy {
    return this.strategy;
  }

  /**
   * Gets the versioner instance
   * @returns The current CodeVersioner instance
   */
  public getVersioner(): CodeVersioner {
    return this.versioner;
  }
}