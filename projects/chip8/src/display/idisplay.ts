export interface IDisplay {
  readonly width: number;
  readonly height: number;
  clear(): void;
  draw_sprite(x: number, y: number, height: number, bytes: Uint8Array): number;
  get_pixel(x: number, y: number): number;
  set_pixel(x: number, y: number, val: number): void;
  get_framebuffer(): Uint8Array;
}
