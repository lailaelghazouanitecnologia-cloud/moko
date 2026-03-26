import type { Uint8 } from '../input/iinput';

export interface IDisplay {
  drawSprite(x: Uint8, y: Uint8, spriteData: Uint8Array, height: Uint8): Uint8;
  clear(): void;
  getPixel(x: Uint8, y: Uint8): Uint8;
  setPixel(x: Uint8, y: Uint8, value: Uint8): void;
  render(): void;
  getWidth(): number;
  getHeight(): number;
  isDirty(): boolean;
}
