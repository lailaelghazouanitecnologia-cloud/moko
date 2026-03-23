import { EventEmitter } from '../core/event-emitter';
import { ResourceLoader } from '../core/resource-loader';

export class Sound extends EventEmitter {
  private _src: string;
  private _audio: HTMLAudioElement;
  private _volume: number = 1;
  private _loop: boolean = false;
  private _currentTime: number = 0;
  private _onEnded?: () => void;

  constructor(src: string) {
    super();
    this._src = src;
    this._audio = new Audio();
    this._audio.src = src;
    this._audio.preload = 'auto';
    this._audio.volume = this._volume;
    this._audio.loop = this._loop;
    this._audio.currentTime = this._currentTime;

    this._audio.addEventListener('ended', () => {
      if (this._onEnded) {
        this._onEnded();
      }
      this.emit('ended');
    });

    this._audio.addEventListener('timeupdate', () => {
      this._currentTime = this._audio.currentTime;
    });
  }

  play(): void {
    this._audio.play();
  }

  pause(): void {
    this._audio.pause();
  }

  stop(): void {
    this._audio.pause();
    this._audio.currentTime = 0;
    this._currentTime = 0;
  }

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    this._volume = Math.max(0, Math.min(1, value));
    this._audio.volume = this._volume;
  }

  get loop(): boolean {
    return this._loop;
  }

  set loop(value: boolean) {
    this._loop = value;
    this._audio.loop = this._loop;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  set currentTime(value: number) {
    this._currentTime = Math.max(0, value);
    this._audio.currentTime = this._currentTime;
  }

  get onEnded(): (() => void) | undefined {
    return this._onEnded;
  }

  set onEnded(callback: (() => void) | undefined) {
    this._onEnded = callback;
  }

  get src(): string {
    return this._src;
  }

  get duration(): number {
    return this._audio.duration || 0;
  }

  get paused(): boolean {
    return this._audio.paused;
  }

  get ended(): boolean {
    return this._audio.ended;
  }
}
