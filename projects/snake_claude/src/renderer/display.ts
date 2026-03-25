import { GameStatus } from '../core/types';
import { GameState } from '../game/state';

/**
 * Formats and renders score information and overlay screens
 * (game over, pause, title) to the terminal.
 */
export class ScoreDisplay {
  /**
   * Format the current score line.
   * @param score - The player's current score.
   * @param highScore - The all-time high score.
   * @returns A formatted score string.
   */
  formatScore(score: number, highScore: number): string {
    return `  Score: ${score}  |  High Score: ${highScore}`;
  }

  /**
   * Format the game status line (controls hint).
   * @param status - The current game status.
   * @returns A status/controls string.
   */
  formatStatus(status: GameStatus): string {
    switch (status) {
      case GameStatus.Ready:
        return '  Press [R] to start  |  [WASD / Arrows] to move  |  [Ctrl-C] to quit';
      case GameStatus.Running:
        return '  [P] Pause  |  [R] Restart  |  [Ctrl-C] Quit';
      case GameStatus.Paused:
        return '  == PAUSED ==  |  [P] Resume  |  [R] Restart  |  [Ctrl-C] Quit';
      case GameStatus.GameOver:
        return '  == GAME OVER ==  |  [R] Restart  |  [Ctrl-C] Quit';
    }
  }

  /**
   * Render the game-over summary.
   * @param score - Final score.
   * @param highScore - All-time high score.
   * @param isNewHighScore - Whether this game set a new record.
   * @returns Multi-line game-over text.
   */
  formatGameOver(score: number, highScore: number, isNewHighScore: boolean): string {
    const lines: string[] = [
      '',
      '  ============================',
      '         GAME OVER',
      '  ============================',
      '',
      `   Final Score: ${score}`,
    ];

    if (isNewHighScore) {
      lines.push('   *** NEW HIGH SCORE! ***');
    } else {
      lines.push(`   High Score:  ${highScore}`);
    }

    lines.push('');
    lines.push('   Press [R] to play again');
    lines.push('   Press [Ctrl-C] to quit');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Render the title / ready screen.
   * @returns Multi-line title text.
   */
  formatTitleScreen(): string {
    const lines: string[] = [
      '',
      '  ============================',
      '        SNAKE  GAME',
      '  ============================',
      '',
      '   Controls:',
      '     WASD or Arrow Keys - Move',
      '     P - Pause / Resume',
      '     R - Start / Restart',
      '     Ctrl-C - Quit',
      '',
      '   Press [R] to start!',
      '',
    ];
    return lines.join('\n');
  }

  /**
   * Render the full HUD (score + status) for a given game state.
   * @param state - The current game state.
   * @returns Multi-line HUD text to display below the grid.
   */
  renderHUD(state: GameState): string {
    const lines: string[] = [
      this.formatScore(state.score, state.highScore),
      this.formatStatus(state.status),
    ];

    if (state.status === GameStatus.GameOver) {
      lines.push(
        this.formatGameOver(state.score, state.highScore, state.score >= state.highScore && state.score > 0),
      );
    }

    if (state.status === GameStatus.Ready) {
      lines.push(this.formatTitleScreen());
    }

    return lines.join('\n');
  }

  /**
   * Write the HUD to stdout.
   * @param state - The current game state.
   */
  draw(state: GameState): void {
    process.stdout.write(this.renderHUD(state) + '\n');
  }
}
