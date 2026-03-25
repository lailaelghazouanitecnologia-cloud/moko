export interface IDisplay {
  readonly width: number;
  readonly height: number;

  clear(): void;
  draw(x: number, y: number, row: number): boolean;
  render(): void;
  getPixel(x: number, y: number): number;
  setPixel(x: number, y: number, val: number): void;
}
