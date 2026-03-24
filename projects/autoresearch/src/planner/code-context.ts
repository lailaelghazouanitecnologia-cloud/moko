import { File } from '../file';
import { DependencyGraph } from '../dependency-graph';
import { CoverageReport } from '../coverage-report';

/**
 * Represents the complete analysis context for a codebase.
 * This interface aggregates all the information needed for code planning and analysis,
 * including source files, dependency relationships, and test coverage metrics.
 */
export interface CodeContext {
  /**
   * An array of source files in the codebase.
   * Each file contains metadata and content information.
   */
  files: File[];

  /**
   * The dependency graph representing relationships between modules/files.
   * Used to understand import/export relationships and potential circular dependencies.
   */
  dependencies: DependencyGraph;

  /**
   * Test coverage report for the codebase.
   * Contains metrics about which parts of the code are covered by tests.
   */
  testCoverage: CoverageReport;
}

/**
 * Validates that a CodeContext object has all required fields with valid data.
 * @param context - The CodeContext to validate
 * @throws {Error} If the context is invalid
 */
export function validateCodeContext(context: CodeContext): void {
  if (!context) {
    throw new Error('CodeContext cannot be null or undefined');
  }

  if (!Array.isArray(context.files)) {
    throw new Error('CodeContext.files must be an array');
  }

  if (!context.dependencies || typeof context.dependencies !== 'object') {
    throw new Error('CodeContext.dependencies must be a valid DependencyGraph');
  }

  if (!context.testCoverage || typeof context.testCoverage !== 'object') {
    throw new Error('CodeContext.testCoverage must be a valid CoverageReport');
  }

  // Validate each file in the files array
  for (let i = 0; i < context.files.length; i++) {
    const file = context.files[i];
    if (!file || typeof file !== 'object') {
      throw new Error(`CodeContext.files[${i}] must be a valid File object`);
    }
  }
}

/**
 * Creates a new CodeContext with default empty values.
 * @returns A new CodeContext instance with empty arrays and default objects
 */
export function createEmptyCodeContext(): CodeContext {
  return {
    files: [],
    dependencies: { nodes: [], edges: [] },
    testCoverage: { files: [], summary: { total: 0, covered: 0, percentage: 0 } }
  };
}

/**
 * Merges multiple CodeContext objects into a single context.
 * @param contexts - Array of CodeContext objects to merge
 * @returns A new merged CodeContext
 * @throws {Error} If any context is invalid or if there are duplicate files
 */
export function mergeCodeContexts(...contexts: CodeContext[]): CodeContext {
  if (!contexts || contexts.length === 0) {
    throw new Error('At least one CodeContext must be provided');
  }

  // Validate all contexts first
  contexts.forEach((context, index) => {
    try {
      validateCodeContext(context);
    } catch (error) {
      throw new Error(`Invalid context at index ${index}: ${error.message}`);
    }
  });

  const merged: CodeContext = {
    files: [],
    dependencies: { nodes: [], edges: [] },
    testCoverage: { files: [], summary: { total: 0, covered: 0, percentage: 0 } }
  };

  const filePaths = new Set<string>();

  for (const context of contexts) {
    // Merge files with duplicate checking
    for (const file of context.files) {
      if (filePaths.has(file.path)) {
        throw new Error(`Duplicate file path found: ${file.path}`);
      }
      filePaths.add(file.path);
      merged.files.push(file);
    }

    // Merge dependencies (assuming nodes and edges can be concatenated)
    merged.dependencies.nodes.push(...context.dependencies.nodes);
    merged.dependencies.edges.push(...context.dependencies.edges);

    // Merge test coverage files
    merged.testCoverage.files.push(...context.testCoverage.files);
  }

  // Recalculate coverage summary
  const total = merged.testCoverage.files.reduce((sum, file) => sum + (file.total || 0), 0);
  const covered = merged.testCoverage.files.reduce((sum, file) => sum + (file.covered || 0), 0);
  merged.testCoverage.summary = {
    total,
    covered,
    percentage: total > 0 ? (covered / total) * 100 : 0
  };

  return merged;
}

/**
 * Checks if a CodeContext is empty (has no files).
 * @param context - The CodeContext to check
 * @returns True if the context has no files
 */
export function isEmptyContext(context: CodeContext): boolean {
  return !context || !context.files || context.files.length === 0;
}

/**
 * Filters the CodeContext to include only files that match the given predicate.
 * @param context - The original CodeContext
 * @param predicate - Function that returns true for files to keep
 * @returns A new filtered CodeContext
 * @throws {Error} If the context is invalid
 */
export function filterCodeContext(
  context: CodeContext,
  predicate: (file: File) => boolean
): CodeContext {
  validateCodeContext(context);

  if (typeof predicate !== 'function') {
    throw new Error('Predicate must be a function');
  }

  const filteredFiles = context.files.filter(predicate);
  const filteredPaths = new Set(filteredFiles.map(f => f.path));

  const filteredDependencies = {
    nodes: context.dependencies.nodes.filter(node => filteredPaths.has(node.path)),
    edges: context.dependencies.edges.filter(
      edge => filteredPaths.has(edge.source) && filteredPaths.has(edge.target)
    )
  };

  const filteredCoverage = {
    files: context.testCoverage.files.filter(file => filteredPaths.has(file.path)),
    summary: { ...context.testCoverage.summary }
  };

  // Recalculate summary for filtered coverage
  const total = filteredCoverage.files.reduce((sum, file) => sum + (file.total || 0), 0);
  const covered = filteredCoverage.files.reduce((sum, file) => sum + (file.covered || 0), 0);
  filteredCoverage.summary = {
    total,
    covered,
    percentage: total > 0 ? (covered / total) * 100 : 0
  };

  return {
    files: filteredFiles,
    dependencies: filteredDependencies,
    testCoverage: filteredCoverage
  };
}
