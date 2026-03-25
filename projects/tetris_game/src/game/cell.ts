import { Config, EventType, Logger } from '../core';
import { Game } from './game';
import { Player } from './player';
import { Board } from './board';
import { Move } from './move';

/**
 * Represents a cell on the game board.
 */
export class Cell {
  /**
   * The value stored in the cell.
   */
  private value: string;

  /**
   * Initializes a new instance of the Cell class.
   * 
   * @param value The initial value of the cell. Defaults to an empty string.
   */
  constructor(value: string = '') {
    this.value = this.validateValue(value);
  }

  /**
   * Updates the value of the cell.
   * 
   * @param value The new value of the cell.
   * @throws {Error} If the value is invalid.
   */
  public update(value: string): void {
    this.value = this.validateValue(value);
  }

  /**
   * Gets the current value of the cell.
   * 
   * @returns The current value of the cell.
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Validates the given value.
   * 
   * @param value The value to validate.
   * @returns The validated value.
   * @throws {Error} If the value is invalid.
   */
  private validateValue(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Invalid value. Value must be a string.');
    }
    return value;
  }

  /**
   * Checks if the cell is empty.
   * 
   * @returns True if the cell is empty, false otherwise.
   */
  public isEmpty(): boolean {
    return this.value === '';
  }

  /**
   * Checks if the cell has a specific value.
   * 
   * @param value The value to check for.
   * @returns True if the cell has the specified value, false otherwise.
   */
  public hasValue(value: string): boolean {
    return this.value === value;
  }

  /**
   * Resets the cell to its initial state.
   */
  public reset(): void {
    this.value = '';
  }
}
