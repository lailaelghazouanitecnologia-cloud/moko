import { EventEmitter } from '../core';
import { Vec3 } from '../math';

export class Sound extends EventEmitter {
  private _buffer: AudioBuffer | null = null;
  private _gainNode: GainNode;
  private _source: AudioBufferSourceNode | null = null;
  private _context: AudioContext;
  private _loop: boolean = false;
  private _volume: number = 1;
  private _pitch: number = 1;
  private _isPlaying: boolean = false;
  private _startTime: number = 0;
  private _pauseTime: number = 0;
  private _duration: number = 0;

  constructor(context: AudioContext, buffer?: AudioBuffer) {
    super();
    this._context = context;
    this._buffer = buffer || null;
    this._gainNode = context.createGain();
    this._gainNode.connect(context.destination);
    if (buffer) {
      this._duration = buffer.duration;
    }
  }

  get buffer(): AudioBuffer | null {
    return this._buffer;
  }

  set buffer(buffer: AudioBuffer | null) {
    this._buffer = buffer;
    if (buffer) {
      this._duration = buffer.duration;
    }
  }

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    this._volume = Math.max(0, value);
    this._gainNode.gain.setValueAtTime(this._volume, this._context.currentTime);
  }

  get pitch(): number {
    return this._pitch;
  }

  set pitch(value: number) {
    this._pitch = Math.max(0.01, value);
    if (this._source) {
      this._source.playbackRate.setValueAtTime(this._pitch, this._context.currentTime);
    }
  }

  get loop(): boolean {
    return this._loop;
  }

  set loop(value: boolean) {
    this._loop = value;
    if (this._source) {
      this._source.loop = value;
    }
  }

  get currentTime(): number {
    if (!this._isPlaying) return this._pauseTime;
    return this._context.currentTime - this._startTime + this._pauseTime;
  }

  get duration(): number {
    return this._duration;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  play(): void {
    if (this._isPlaying || !this._buffer) return;
    this._startSource(0);
    this._isPlaying = true;
    this._startTime = this._context.currentTime;
    this._pauseTime = 0;
    this.emit('play');
  }

  pause(): void {
    if (!this._isPlaying || !this._source) return;
    this._pauseTime = this.currentTime;
    this._stopSource();
    this._isPlaying = false;
    this.emit('pause');
  }

  stop(): void {
    if (!this._source) return;
    this._stopSource();
    this._isPlaying = false;
    this._pauseTime = 0;
    this.emit('stop');
  }

  seek(time: number): void {
    if (!this._buffer) return;
    const clampedTime = Math.max(0, Math.min(time, this._duration));
    const wasPlaying = this._isPlaying;
    if (wasPlaying) {
      this._stopSource();
    }
    this._pauseTime = clampedTime;
    if (wasPlaying) {
      this._startSource(clampedTime);
    }
  }

  destroy(): void {
    this.stop();
    this._gainNode.disconnect();
    this._buffer = null;
    this.emit('destroy');
    this.removeAllListeners();
  }

  private _startSource(offset: number): void {
    this._source = this._context.createBufferSource();
    this._source.buffer = this._buffer;
    this._source.loop = this._loop;
    this._source.playbackRate.setValueAtTime(this._pitch, this._context.currentTime);
    this._source.connect(this._gainNode);
    this._source.start(0, offset);
    this._source.onended = () => {
      if (!this._loop) {
        this._isPlaying = false;
        this._pauseTime = 0;
        this.emit('ended');
      }
    };
  }

  private _stopSource(): void {
    if (this._source) {
      try {
        this._source.stop();
      } catch (e) {
        // Ignore errors if source is already stopped
      }
      this._source.disconnect();
      this._source = null;
    }
  }
}
