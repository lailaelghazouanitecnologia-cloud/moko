export interface GUIOpts {
  readonly theme: string;
  readonly width: number;
  readonly height: number;
  readonly fullscreen: boolean;
  readonly showToolbar: boolean;
  readonly enableAnimations: boolean;

  applyTheme(theme: string): void;
  resize(width: number, height: number): void;
  toggleFullscreen(): void;
}
