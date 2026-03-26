export type Uint8 = number;

export interface IDisplay {
  drawSprite(x: Uint8, y: Uint8, bytes: Uint8Array, n: Uint8): Uint8;
  clear(): void;
  getPixel(x: Uint8, y: Uint8): Uint8;
  setPixel(x: Uint8, y: Uint8, value: Uint8): void;
  render(): ImageData;
  getWidth(): Uint8;
  getHeight(): Uint8;
}
