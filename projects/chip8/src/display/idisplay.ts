export interface IDisplay {
  drawSprite(x: number, y: number, sprite: Uint8Array): boolean;
  clear(): void;
  getPixel(x: number, y: number): boolean;
  setPixel(x: number, y: number, value: boolean): void;
  getFramebuffer(): Uint8Array;
}
