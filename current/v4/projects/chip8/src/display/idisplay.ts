export interface IDisplay {
  drawSprite(x: number, y: number, spriteData: Uint8Array, height: number): boolean;
  clear(): void;
  getPixel(x: number, y: number): boolean;
  setPixel(x: number, y: number, state: boolean): void;
  refresh(): void;
  getWidth(): number;
  getHeight(): number;
}
