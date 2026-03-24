import { Database } from 'sqlite3';
import { promisify } from 'util';

/**
 * Persists metric results and verdicts for a single evaluation run.
 */
export class ResultStore {
  private dbPath: string;
  private runId: string;
  private createdAt: Date;
  private db: Database;

  /**
   * Creates a new ResultStore instance.
   * @param dbPath - Path to the SQLite database file.
   * @param runId - Unique identifier for the evaluation run.
   * @throws {Error} If dbPath or runId is empty.
   */
  constructor(dbPath: string, runId: string) {
    if (!dbPath || typeof dbPath !== 'string') {
      throw new Error('dbPath must be a non-empty string');
    }
    if (!runId || typeof runId !== 'string') {
      throw new Error('runId must be a non-empty string');
    }
    this.dbPath = dbPath;
    this.runId = runId;
    this.createdAt = new Date();
    this.db = new Database(this.dbPath);
    this.initializeDatabase();
  }

  /**
   * Ensures the required table exists.
   */
  private initializeDatabase(): void {
    const run = this.db.run.bind(this.db);
    run(
      `CREATE TABLE IF NOT EXISTS results (
         run_id TEXT,
         metric TEXT,
         value REAL,
         verdict INTEGER,
         created_at TEXT,
         PRIMARY KEY (run_id, metric)
       )`,
      (err) => {
        if (err) {
          console.error('Failed to initialize database:', err);
          throw err;
        }
      }
    );
  }

  /**
   * Stores a single metric result.
   * @param metric - The metric name.
   * @param value - The numeric value of the metric.
   * @param verdict - Whether the metric passed (true) or failed (false).
   * @throws {Error} If metric is not a non-empty string, value is not a finite number, or verdict is not a boolean.
   */
  async save(metric: string, value: number, verdict: boolean): Promise<void> {
    if (!metric || typeof metric !== 'string') {
      throw new Error('metric must be a non-empty string');
    }
    if (!Number.isFinite(value)) {
      throw new Error('value must be a finite number');
    }
    if (typeof verdict !== 'boolean') {
      throw new Error('verdict must be a boolean');
    }
    const run = promisify(this.db.run.bind(this.db));
    await run(
      `INSERT OR REPLACE INTO results (run_id, metric, value, verdict, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [this.runId, metric, value, verdict ? 1 : 0, this.createdAt.toISOString()]
    );
  }

  /**
   * Retrieves a single metric result.
   * @param metric - The metric name to retrieve.
   * @returns The value and verdict, or null if not found.
   * @throws {Error} If metric is not a non-empty string.
   */
  async load(metric: string): Promise<{ value: number; verdict: boolean } | null> {
    if (!metric || typeof metric !== 'string') {
      throw new Error('metric must be a non-empty string');
    }
    const get = promisify(this.db.get.bind(this.db));
    const row = await get(
      `SELECT value, verdict FROM results WHERE run_id = ? AND metric = ?`,
      [this.runId, metric]
    );
    if (!row) return null;
    return { value: row.value, verdict: !!row.verdict };
  }

  /**
   * Retrieves all metric results for the current run.
   * @returns A mapping from metric names to their value and verdict.
   */
  async loadAll(): Promise<Record<string, { value: number; verdict: boolean }>> {
    const all = promisify(this.db.all.bind(this.db));
    const rows = await all(
      `SELECT metric, value, verdict FROM results WHERE run_id = ?`,
      [this.runId]
    );
    const out: Record<string, { value: number; verdict: boolean }> = {};
    for (const r of rows) {
      out[r.metric] = { value: r.value, verdict: !!r.verdict };
    }
    return out;
  }

  /**
   * Removes a single metric result.
   * @param metric - The metric name to delete.
   * @throws {Error} If metric is not a non-empty string.
   */
  async delete(metric: string): Promise<void> {
    if (!metric || typeof metric !== 'string') {
      throw new Error('metric must be a non-empty string');
    }
    const run = promisify(this.db.run.bind(this.db));
    await run(
      `DELETE FROM results WHERE run_id = ? AND metric = ?`,
      [this.runId, metric]
    );
  }

  /**
   * Deletes all metric results for the current run.
   */
  async clear(): Promise<void> {
    const run = promisify(this.db.run.bind(this.db));
    await run(`DELETE FROM results WHERE run_id = ?`, [this.runId]);
  }

  /**
   * Computes a summary of verdicts for the current run.
   * @returns An object with total, passed, and failed counts.
   */
  async summary(): Promise<{ total: number; passed: number; failed: number }> {
    const all = promisify(this.db.all.bind(this.db));
    const rows = await all(
      `SELECT verdict FROM results WHERE run_id = ?`,
      [this.runId]
    );
    let passed = 0;
    for (const r of rows) {
      if (r.verdict) passed++;
    }
    return { total: rows.length, passed, failed: rows.length - passed };
  }

  /**
   * Closes the underlying database connection.
   */
  async close(): Promise<void> {
    const close = promisify(this.db.close.bind(this.db));
    await close();
  }
}
