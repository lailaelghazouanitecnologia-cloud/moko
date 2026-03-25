export interface IDisplay {
  readonly width: number;
  readonly height: number;
  clear(): void;
  getPixel(x: number, y: number): boolean;
  setPixel(x: number, y: number, on: boolean): void;
  drawSprite(x: number, y: number, bytes: Uint8Array): boolean;
  getBuffer(): Uint8Array;
}
