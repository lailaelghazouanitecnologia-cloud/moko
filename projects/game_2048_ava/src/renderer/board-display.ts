interface Palette {
  readonly empty: string
  readonly filled: string
  readonly border: string
  readonly header: string
}

export class BoardDisplay {
  private size: number
  private palette: Palette
  private spacing: number

  constructor(size: number = 8, palette: Palette = { empty: '·', filled: '●', border: '-', header: '+' }, spacing: number = 1) {
      if (typeof size !== 'number' || isNaN(size)) throw new TypeError('size must be a valid number');
      if (typeof spacing !== 'number' || isNaN(spacing)) throw new TypeError('spacing must be a valid number');
    this.size = size
    this.palette = palette
    this.spacing = spacing
  }

  render(board: GameBoard): void {
    this.printHeader()
    for (let y = 0; y < board.height; y++) {
      const row: Cell[] = []
      for (let x = 0; x < board.width; x++) {
        const cell = board.getCell({ x, y } as Position)
        row.push(cell)
      }
      this.printRow(row)
    }
    this.printFooter()
  }

  printRow(row: Cell[]): void {
    let line = ''
    for (const cell of row) {
      const ch = cell.piece ? this.palette.filled : this.palette.empty
      line += ch + ' '.repeat(this.spacing)
    }
    console.log(line.trimEnd())
  }

  printBorder(): void {
    const line = this.palette.border.repeat(this.size * (this.spacing + 1))
    console.log(line)
  }

  printHeader(): void {
    const header = this.palette.header.repeat(this.size * (this.spacing + 1))
    console.log(header)
  }

  printFooter(): void {
    const footer = this.palette.border.repeat(this.size * (this.spacing + 1))
    console.log(footer)
  }

  resetColor(): void {
    process.stdout.write('\x1b[0m')
  }

  setSize(size: number): void {
    this.size = size
  }

  setPalette(palette: Palette): void {
    this.palette = palette
  }
}
