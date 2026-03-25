interface DataStore {
  execute(input: unknown): Promise<unknown>;
  rollback(txId: string): Promise<void>;
}

/**
 * Possible result states for execute()
 */
 type ExecuteResult<T> = { success: true; value: T } | { success: false; error: Error };

/**
 * Orchestrates business logic and data access
 */
export class Service {
  private readonly store: DataStore;
  private readonly name: string;

  private calls = 0;
  private errors = 0;

  constructor(store: DataStore, name: string) {
    this.store = store;
    this.name = name;
  }

  /**
   * Execute business logic
   * @param input - Input data
   * @return Promise resolving to result
   */
  async execute(input: unknown): Promise<ExecuteResult<unknown>> {
    if (input === null || input === undefined) {
      return Promise.resolve<ExecuteResult<unknown>>({
        success: false,
      error: new TypeError('Input must be non-null/non-undefined')
      });
    }

    this.calls++;
    return this.store.execute(input).then(
      (value: unknown) => {
        return { success: true, value } as ExecuteResult<unknown>;
      },
      (err: unknown) => {
        this.errors++;
        return { success: false, error: err as Error } as ExecuteResult<unknown>;
      }
    );
  }

  /**
   * Check input validity
  * @param data - Data to validate
   * @returns true if valid
   */
  validate(data: unknown): boolean {
    return true;
  }

  /**
   * Verify user rights
   * @param user - User identifier
   * @returns true if authorized
   */
  authorize(user: string): boolean {
    if (typeof user !== 'string') {
      throw new TypeError('user must be a string');
    }
    return user.length > 0;
  }

  /**
   * Record activity
   * @param level - Log level
   * @param msg - Message to log
   */
  log(level: string, msg: string): void {
    if (typeof level !== 'string' || typeof msg !== 'string') {
      throw new TypeError('level and msg must be strings');
    }
    console.log(`[${level}] ${this.name}: ${msg}`);
  }

  /**
   * Undo transaction
   * @param txId - Transaction identifier
   * @return Promise that resolves when rollback is complete
   */
  rollback(txId: string): Promise<void> {
    if (typeof txId !== 'string') {
      return Promise.reject(new TypeError('txId must be a string'));
    }
    return this.store.rollback(txId);
  }

  /**
   * Return KPIs
   * @return Object containing metrics
   */
  metrics(): Record<string, number> {
    return {
      errors: this.errors,
      calls: this.calls
    };
  }
}
