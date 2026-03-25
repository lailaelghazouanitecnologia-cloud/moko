import { Config, EventType, Logger } from '../core';
import { Game } from './game';

/**
 * Represents a player in the game.
 */
export class Player {
  private name: string;
  private score: number;

  /**
   * Creates a new player with the given name and initial score.
   * 
   * @param name The name of the player.
   * @param score The initial score of the player. Defaults to 0.
   */
  constructor(name: string, score: number = 0) {
    if (typeof name !== 'string') {
      throw new Error('Name must be a string');
    }
    if (typeof score !== 'number') {
      throw new Error('Score must be a number');
    }
    this.name = name;
    this.score = score;
  }

  /**
   * Updates the score of the player.
   * 
   * @param score The new score of the player.
   */
  public updateScore(score: number): void {
    if (typeof score !== 'number') {
      throw new Error('Score must be a number');
    }
    this.score = score;
  }

  /**
   * Gets the name of the player.
   * 
   * @returns The name of the player.
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Gets the score of the player.
   * 
   * @returns The score of the player.
   */
  public getScore(): number {
    return this.score;
  }

  /**
   * Resets the score of the player to 0.
   */
  public resetScore(): void {
    this.score = 0;
  }

  /**
   * Increases the score of the player by the given amount.
   * 
   * @param amount The amount to increase the score by.
   */
  public increaseScore(amount: number): void {
    if (typeof amount !== 'number') {
      throw new Error('Amount must be a number');
    }
    this.score += amount;
  }

  /**
   * Decreases the score of the player by the given amount.
   * 
   * @param amount The amount to decrease the score by.
   */
  public decreaseScore(amount: number): void {
    if (typeof amount !== 'number') {
      throw new Error('Amount must be a number');
    }
    if (this.score - amount < 0) {
      throw new Error('Score cannot be negative');
    }
    this.score -= amount;
  }

  /**
   * Checks if the player's score is valid.
   * 
   * @returns True if the score is valid, false otherwise.
   */
  public isValidScore(): boolean {
    return typeof this.score === 'number' && !isNaN(this.score);
  }

  /**
   * Checks if the player's name is valid.
   * 
   * @returns True if the name is valid, false otherwise.
   */
  public isValidName(): boolean {
    return typeof this.name === 'string' && this.name.trim() !== '';
  }

  /**
   * Private helper method to validate the input score.
   * 
   * @param score The score to validate.
   * @returns True if the score is valid, false otherwise.
   */
  private validateScore(score: number): boolean {
    return typeof score === 'number' && !isNaN(score);
  }

  /**
   * Private helper method to validate the input name.
   * 
   * @param name The name to validate.
   * @returns True if the name is valid, false otherwise.
   */
  private validateName(name: string): boolean {
    return typeof name === 'string' && name.trim() !== '';
  }
}
