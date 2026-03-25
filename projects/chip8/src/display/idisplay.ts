export interface IDisplay {
  readonly width: number;
  readonly height: number;
  readonly buffer: Uint8Array;

  clear(): void;
  setPixel(x: number, y: number, on: boolean): void;
  getPixel(x: number, y: number): boolean;
  drawSprite(x: number, y: number, bytes: Uint8Array): boolean;
  render(): void;
}
