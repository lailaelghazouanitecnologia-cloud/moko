isOccupied: boolean;
  hasFood: boolean;
  food?: Food;
};

export class Board {
  width: number;
  height: number;
  grid: Cell[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grid = [];
    this.reset();
  }

  isInside(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  isOccupied(x: number, y: number): boolean {
    if (!this.isInside(x, y)) {
      return false;
    }
    return this.grid[y][x].isOccupied;
  }

  placeFood(food: Food): void {
    const pos = food.getPosition();
    if (!this.isInside(pos.x, pos.y)) {
      return;
    }
    this.grid[pos.y][pos.x].hasFood = true;
    this.grid[pos.y][pos.x].food = food;
  }

  removeFood(food: Food): void {
    const pos = food.getPosition();
    if (!this.isInside(pos.x, pos.y)) {
      return;
    }
    this.grid[pos.y][pos.x].hasFood = false;
    delete this.grid[pos.y][pos.x].food;
  }

  updateSnake(snake: Snake): void {
    const segments = (snake as any).segments;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x].isOccupied = false;
      }
    }
    for (const segment of segments) {
      if (this.isInside(segment.x, segment.y)) {
        this.grid[segment.y][segment.x].isOccupied = true;
      }
    }
  }

  clearSnake(snake: Snake): void {
    const segments = (snake as any).segments;
    for (const segment of segments) {
      if (this.isInside(segment.x, segment.y)) {
        this.grid[segment.y][segment.x].isOccupied = false;
      }
    }
  }

  reset(): void {
    this.grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          isOccupied: false,
          hasFood: false
        });
      }
      this.grid.push(row);
    }
  }
}
