export interface IDisplay {
  drawSprite(x: number, y: number, sprite: Uint8Array, height: number): boolean;
  clear(): void;
  getPixel(x: number, y: number): boolean;
  getFramebuffer(): Uint8Array;
}
