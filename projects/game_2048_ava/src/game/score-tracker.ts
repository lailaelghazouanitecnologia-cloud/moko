export class ScoreTracker {
  private currentScore: number;
  private highScore: number;
  private readonly storageKey = '2048-highscore';

  constructor() {
    this.currentScore = 0;
    this.highScore = 0;
    this.loadHighScore();
  }

  addScore(points: number): void {
    this.currentScore += points;
    this.updateHighScore();
  }

  resetScore(): void {
    this.currentScore = 0;
  }

  getCurrentScore(): number {
    return this.currentScore;
  }

  getHighScore(): number {
    return this.highScore;
  }

  updateHighScore(): void {
    if (this.currentScore > this.highScore) {
      this.highScore = this.currentScore;
      try {
        localStorage.setItem(this.storageKey, this.highScore.toString());
      } catch {
        // ignore storage errors
      }
    }
  }

  loadHighScore(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) {
          this.highScore = parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
  }
}
