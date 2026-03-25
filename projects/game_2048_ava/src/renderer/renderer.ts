import { GameBoard } from '../game';

export class Renderer {
  readonly width: number;
  readonly height: number;
  readonly colors: Map<number, string>;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.colors = new Map<number, string>([
      [0, '\x1b[90m'],
      [2, '\x1b[37m'],
      [4, '\x1b[36m'],
      [8, '\x1b[35m'],
      [16, '\x1b[34m'],
      [32, '\x1b[33m'],
      [64, '\x1b[31m'],
      [128, '\x1b[32m'],
      [256, '\x1b[93m'],
      [512, '\x1b[92m'],
      [1024, '\x1b[91m'],
      [2048, '\x1b[95m']
    ]);
  }

  clear(): void {
    console.clear();
  }

  drawBoard(board: GameBoard): void {
    const size = board.size;
    const cellWidth = 6;
    const cellHeight = 3;
    
    this.clear();
    
    const topBorder = '┌' + '──────'.repeat(size) + '┐';
    const bottomBorder = '└' + '──────'.repeat(size) + '┘';
    const middleBorder = '├' + '──────'.repeat(size) + '┤';
    
    console.log(topBorder);
    
    for (let row = 0; row < size; row++) {
      const rowLines: string[] = ['│', '│', '│'];
      
      for (let col = 0; col < size; col++) {
        const value = board.getTile({ row, col });
        const color = this.getTileColor(value);
        const reset = '\x1b[0m';
        const paddedValue = value === 0 ? '' : value.toString();
        const centered = paddedValue.padStart(3).padEnd(6);
        
        rowLines[0] += '      │';
        rowLines[1] += color + centered + reset + '│';
        rowLines[2] += '      │';
      }
      
      console.log(rowLines[0]);
      console.log(rowLines[1]);
      console.log(rowLines[2]);
      
      if (row < size - 1) {
        console.log(middleBorder);
      }
    }
    
    console.log(bottomBorder);
  }

  drawScore(score: number): void {
    console.log(`\nScore: ${score}`);
  }

  drawState(state: 'idle' | 'playing' | 'won' | 'lost'): void {
    const stateText = state === 'idle' ? 'Press arrow keys to start' :
                     state === 'playing' ? 'Use arrow keys to move tiles' :
                     state === 'won' ? 'You won! Press R to restart' :
                     'Game over! Press R to restart';
    
    console.log(`\n${stateText}`);
  }

  drawHelp(): void {
    console.log('\nControls:');
    console.log('  Arrow keys - Move tiles');
    console.log('  R          - Restart game');
    console.log('  Q          - Quit');
  }

  drawMessage(msg: string): void {
    console.log(`\n${msg}`);
  }

  getTileColor(value: number): string {
    return this.colors.get(value) ?? '\x1b[90m';
  }
}
