export interface IDisplay {
  readonly width: number;
  readonly height: number;

  clear(): void;
  drawSprite(x: number, y: number, bytes: Uint8Array, n: number): number;
  getPixel(x: number, y: number): 0 | 1;
  getImageData(): ImageData;
}
