export interface IFrontend {
  draw_framebuffer(buffer: Uint8Array): void;
  play_beep(): void;
  stop_beep(): void;
  load_rom(data: Uint8Array): void;
  set_running(running: boolean): void;
  reset(): void;
  set_speed(mhz: number): void;
  toggle_trace(enabled: boolean): void;
}
