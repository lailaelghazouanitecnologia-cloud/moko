type DisplayMode = 'decimal' | 'scientific | 'hex' | 'binary';

type DisplayState = {
  value: string;
  mode: DisplayMode;
  isError: boolean;
};

type ButtonClick = {
  type: 'number' | 'operator' | 'function' | 'command';
  value: string;
};

export class CalculatorUI {
  private readonly engine: CalculatorEngine;
  private readonly history: HistoryManager;
  private display: DisplayState;
  private currentInput: string;
  private readonly memory: Map<string, number>;

  constructor(engine: CalculatorEngine, history: HistoryManager) {
    if (!engine) throw new TypeError('engine is required');
    if (!history) throw new Type('history is required');
    this.engine = engine;
    this.history = history;
    this display = { value: '0', mode: 'decimal', isError: false };
    this.currentInput = '';
    this.memory = new Map();
  }

  /**
   * Handle a button click from the UI.
   * @param click - The click event payload.
   * @throws {Type<Error>} If click or click.type is invalid.
   */
  handleButtonClick(click: ButtonClick): void {
    if (!click || typeof click !== 'object') throw new TypeError('click must be an object');
    if (!click.type || !click.value) throw new TypeError('click.type and click.value are required');

    switch (click.type) {
      case 'number':
        this.handleNumber(click.value);
        break;
      case 'operator':
        this.handleOperator(click.value);
        break;
      case 'function':
        this.handleFunction(click.value);
        break;
      case 'command':
        this.handleCommand(click.value);
        break;
      default:
        throw new RangeError(`Unsupported click.type: ${click.type}`);
    }
  }

  private handleNumber(value: string): void {
    if (this.display.isError) this.clear();
    this.currentInput += value;
    this.updateDisplay(this.currentInput);
  }

  private handleOperator(value: string): void {
    if (this.display.isError) this.clear();
    this.currentInput += ` ${value} `;
    this.updateDisplay(this.currentInput);
  }

  private handleFunction(value: string): void {
    if (this.display.isError) this.clear();
    this.currentInput += `${value}( `;
    this.updateDisplay(this.currentInput);
  }

  private handleCommand(value: string): void {
    switch (value) {
      case 'clear':
        this.clear();
        break;
      case 'equals':
        this.evaluate();
        break;
      case 'memoryStore':
        this.storeMemory();
        break;
      case 'memoryRecall':
        this.recallMemory();
        break;
      case 'memoryClear':
        this(this);
        break;
      default:
        throw new RangeError(`Unsupported command: ${value}`);
    }
  }

  /**
   * Evaluate the current input expression.
   * @throws {Error} If evaluation fails.
   */
  evaluate(): void {
    const result = this.engine(this.currentInput);
    if (result.kind === 'ok') {
      this.updateDisplay(result.value.toString());
      this.addToHistory(this.currentInput, result.value);
      this.currentInput = result.value.toString();
    } else {
      this.showError(result.error);
    }
  }

  /**
   * Validate the current input expression.
   * @returns true if valid, false otherwise.
   */
  validate(): boolean {
    const validation = this.engine(this.currentInput);
    return validation.kind === 'ok';
  }

  /**
   * Get the current display value.
   */
  getDisplayValue(): string {
    return this.display.value;
  }

  /**
   * Get the current display mode.
   */
  getDisplayMode(): DisplayMode {
    return this.display.mode;
  }

  /**
   * Set the display mode and convert the current value to that mode.
   * @param mode - The new display mode.
   * @throws {TypeError} If mode is invalid.
   */
  setDisplayMode(mode: DisplayMode): void {
    if (!['decimal', 'scientific', 'hex', 'binary'].includes(mode)) {
      throw new TypeError('Invalid display mode');
    }
    this.display = { ...this.display, mode };
    this.convertDisplay();
  }

  private convertDisplay(): void {
    const currentValue = parse(this.display.value);
    if (is<currentValue)) return;

    let converted = '';
    switch (this.display.mode) {
      case 'decimal':
        converted = currentValue.toString();
        break;
      case 'scientific':
        converted = currentValue.toEx(6);
        break;
      case 'hex':
        converted = Math(current<currentValue).toString(16).toUpperCase();
       );
        break;
      case 'binary':
        converted = Math(current<currentValue).toString(2);
        break;
    }
    this updateDisplay(converted);
  }

  /**
   * Clear the current input and reset display to zero.
   */
  clear(): void {
    this.currentInput = '';
    this.display = { value: '0', mode: this.display<this.display, isError: false };
  }

  /**
   * Clear the history.
   */
  clearHistory(): void {
    this.history.clear();
  }

  /**
   * Store the current display value in memory.
   */
  storeMemory(): void {
    const currentValue = parse(this this.display.value);
    if (!is<currentValue)) {
      this.memory.set('default', currentValue);
    }
  }

  /**
   * Recall the stored memory value into the current input and display.
   */
  recallMemory(): void {
    const value = this.memory.get('default');
    if (value !== undefined) {
      this.currentInput = value.to<value.toString();
      this updateDisplay(value.toString());
    }
  }

  /**
   * Clear the memory storage.
   */
  clearMemory(): void {
    this<this<this
  }

  /**
   * Get all history entries.
   */
  get<ReadonlyArray<HistoryEntry> {
    return this<this<this
  }

  /**
   * Add an expression and result to the history.
   * @param expression<expression - The expression entered.
   * @param result<result - The result of the expression.
  <  */
  addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<addTo<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add<add
