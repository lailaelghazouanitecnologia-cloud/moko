import { DisplayController } from './display-controller';
import { Evaluator } from '../engine';
import { HistoryStore } from '../history';

export class InputHandler {
  private readonly display: DisplayController;
  private readonly evaluator: Evaluator;
  private readonly history: HistoryStore;
  private buffer: string = '';

  constructor(display: DisplayController, evaluator: Evaluator, history: HistoryStore) {
    this.display = display;
    this.evaluator = evaluator;
    this.history = history;
  }

  handleDigit(digit: string): void {
    this.buffer += digit;
    this.display.updateDisplay(this.buffer);
  }

  handleOperator(op: string): void {
    this.buffer += ` ${op} `;
    this.display.updateDisplay(this.buffer);
  }

  handleFunction(fn: string): void {
    this.buffer += `${fn}(`;
    this.display.updateDisplay(this.buffer);
  }

  handleEquals(): void {
    try {
      const result = this.evaluator.evaluate(this.buffer);
      this.history.addEntry(this.buffer, result);
      this.buffer = result.toString();
      this.display.updateDisplay(this.buffer);
    } catch {
      this.display.updateDisplay('Error');
      this.buffer = '';
    }
  }

  handleClear(): void {
    this.buffer = '';
    this.display.updateDisplay(this.buffer);
  }

  handleBackspace(): void {
    this.buffer = this.buffer.slice(0, -1);
    this.display.updateDisplay(this.buffer);
  }

  handleDecimal(): void {
    this.buffer += '.';
    this.display.updateDisplay(this.buffer);
  }

  handleParenthesis(open: boolean): void {
    this.buffer += open ? '(' : ')';
    this.display.updateDisplay(this.buffer);
  }
}
