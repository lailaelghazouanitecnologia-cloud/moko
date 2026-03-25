import { ActionCapture } from './action-capture';

export class CaptureViewer {
  private capture: ActionCapture | null = null;
  private currentFrame = 0;
  private playbackSpeed = 1.0;
  private loop = false;
  private isPlaying = false;
  private isPaused = false;

  load(capture: ActionCapture): void {
    this.capture = capture;
    this.currentFrame = 0;
  }

  async start(): Promise<void> {
    if (!this.capture) throw new Error('No capture loaded');
    this.isPlaying = true;
    this.isPaused = false;
    await this.capture.replay();
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentFrame = 0;
  }

  seek(frame: number): void {
    this.currentFrame = Math.max(0, frame);
  }

  previous(): void {
    this.currentFrame = Math.max(0, this.currentFrame - 1);
  }

  setSpeed(speed: number): void {
    this.playbackSpeed = Math.max(0.1, speed);
  }
}
