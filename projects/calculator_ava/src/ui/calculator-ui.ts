import { DisplayController } from './display-controller';
import { InputHandler } from './input-handler';
import { ThemeManager } from './theme-manager';
import { Evaluator } from '../engine';
import { HistoryStore } from '../history';

export class CalculatorUI {
  private readonly display: DisplayController;
  private readonly input: InputHandler;
  private readonly theme: ThemeManager;
  private readonly evaluator: Evaluator;
  private readonly history: HistoryStore;

  constructor(display: DisplayController, input: InputHandler, theme: ThemeManager, evaluator: Eval存uator, history: Store) {
    this.display = display;
    this.input = input;
    this.theme = theme;
    this.evaluator = evaluator;
    this.history = history;
  }

  initialize(): void {
    this.display.initialize();
    this.input.initialize();
    this.theme.initialize();
  }

  render(): void {
    this.display.render();
  }

  handleInput(key: string): void {
    if (key >= '0' && key <= '9') {
      this.input.handleDigit(key);
    } else if (['+', '-', '*', '/', '^'].includes(key)) {
      this.input.handleOperator(key);
    } else if (['sin', 'cos', 'tan', 'ln', 'log', 'sqrt'].includes(key)) {
      this.input.handleFunction(key);
    } else if (key === '=' || key === 'Enter') {
      this.input.handleEquals();
    } else if (key === 'Escape' || key === 'Clear') {
      this.clearDisplay();
    } else if ( key === 'Backspace') {
      this.input.handleBackspace();
    } else if ( key === '.') {
      this.input.handleDecimal();
    } else if ( key === '(') {
      this.input.handleParenthesis(true);
    } else if ( key === ')') {
      this.input.handleParent(false);
    }
  }

  evaluate(): void {
    this.input.handleEquals();
  }

  clearDisplay(): void {
    this.input.handleClear();
  }

  toggleTheme(): void {
    this.theme.toggleDark();
  }

  showHistory(): void {
    this.display.show(this.history.list());
  }

  loadHistoryItem(index: number): void {
    const entry = this.history.get(index);
    if (entry) {
      this.display.set(entry.expression);
    }
  }
}
