import { EventEmitter } from '../core';
import { Vec3 } from '../math';

export class Channel extends EventEmitter {
  private _audioContext: AudioContext;
  private _gainNode: GainNode;
  private _pannerNode: PannerNode | null = null;
  private _source: AudioBufferSourceNode | null = null;
  private _sound: Sound | null = null;
  private _loop: boolean = false;
  private _volume: number = 1.0;
  private _pitch: number = 1.0;
  private _isPlaying: boolean = false;
  private _isPaused: boolean = false;
  private _startTime: number = 0;
  private _pauseTime: number = 0;
  private _duration: number = 0;
  private _currentTime: number = 0;

  constructor(audioContext: AudioContext) {
    super();
    this._audioContext = audioContext;
    this._gainNode = audioContext.createGain();
    this._gainNode.connect(audioContext.destination);
  }

  get volume(): number {
    return this._volume;
  }

  set volume(value: number) {
    this._volume = Math.max(0, Math.min(1, value));
    this._gainNode.gain.setValueAtTime(this._volume, this._audioContext.currentTime);
  }

  get pitch(): number {
    return this._pitch;
  }

  set pitch(value: number) {
    this._pitch = Math.max(0.01, value);
    if (this._source) {
      this._source.playbackRate.setValueAtTime(this._pitch, this._audioContext.currentTime);
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
    if (this._isPlaying && !this._isPaused) {
      return this._audioContext.currentTime - this._startTime;
    }
    return this._currentTime;
  }

  get duration(): number {
    return this._duration;
  }

  get isPlaying(): boolean {
    return this._isPlaying && !this._isPaused;
  }

  get isPaused(): boolean {
    return this._isPaused;
  }

  connect(node: AudioNode): void {
    this._gainNode.connect(node);
  }

  disconnect(node?: AudioNode): void {
    if (node) {
      this._gainNode.disconnect(node);
    } else {
      this._gainNode.disconnect();
    }
  }

  play(sound?: Sound): void {
    if (sound) {
      this._sound = sound;
    }

    if (!this._sound) {
      return;
    }

    if (this._isPaused) {
      this.resume();
      return;
    }

    this.stop();

    const buffer = this._sound.getBuffer();
    if (!buffer) {
      return;
    }

    this._source = this._audioContext.createBufferSource();
    this._source.buffer = buffer;
    this._source.loop = this._loop;
    this._source.playbackRate.value = this._pitch;
    this._source.connect(this._gainNode);

    this._duration = buffer.duration;
    this._startTime = this._audioContext.currentTime;
    this._isPlaying = true;
    this._isPaused = false;

    this._source.start(0);
    this._source.onended = () => {
      if (!this._loop) {
        this.stop();
      }
    };

    this.emit('play');
  }

  pause(): void {
    if (!this._isPlaying || this._isPaused) {
      return;
    }

    this._pauseTime = this._audioContext.currentTime;
    this._currentTime = this._pauseTime - this._startTime;
    this._isPaused = true;

    if (this._source) {
      this._source.stop();
      this._source = null;
    }

    this.emit('pause');
  }

  resume(): void {
    if (!this._isPlaying || !this._isPaused) {
      return;
    }

    if (!this._sound) {
      return;
    }

    const buffer = this._sound.getBuffer();
    if (!buffer) {
      return;
    }

    this._source = this._audioContext.createBufferSource();
    this._source.buffer = buffer;
    this._source.loop = this._loop;
    this._source.playbackRate.value = this._pitch;
    this._source.connect(this._gainNode);

    this._startTime = this._audioContext.currentTime - this._currentTime;
    this._isPaused = false;

    this._source.start(0, this._currentTime);
    this._source.onended = () => {
      if (!this._loop) {
        this.stop();
      }
    };

    this.emit('resume');
  }

  stop(): void {
    if (this._source) {
      this._source.stop();
      this._source = null;
    }

    this._isPlaying = false;
    this._isPaused = false;
    this._currentTime = 0;
    this._startTime = 0;
    this._pauseTime = 0;

    this.emit('stop');
  }

  setPosition(x: number, y: number, z: number): void {
    if (!this._pannerNode) {
      this._pannerNode = this._audioContext.createPanner();
      this._gainNode.disconnect();
      this._gainNode.connect(this._pannerNode);
      this._pannerNode.connect(this._audioContext.destination);
    }

    this._pannerNode.setPosition(x, y, z);
  }

  setVelocity(x: number, y: number, z: number): void {
    if (this._pannerNode) {
      this._pannerNode.setVelocity(x, y, z);
    }
  }

  setMaxDistance(distance: number): void {
    if (this._pannerNode) {
      this._pannerNode.maxDistance = distance;
    }
  }

  setMinDistance(distance: number): void {
    if (this._pannerNode) {
      this._pannerNode.refDistance = distance;
    }
  }

  setRollOffFactor(factor: number): void {
    if (this._pannerNode) {
      this._pannerNode.rolloffFactor = factor;
    }
  }

  setModel(model: string): void {
    if (this._pannerNode) {
      switch (model) {
        case 'linear':
          this._pannerNode.distanceModel = 'linear';
          break;
        case 'inverse':
          this._pannerNode.distanceModel = 'inverse';
          break;
        case 'exponential':
          this._pannerNode.distanceModel = 'exponential';
          break;
      }
    }
  }

  setPan(pan: number): void {
    if (this._pannerNode) {
      this._pannerNode.panningModel = 'equalpower';
      const x = Math.sin(pan * Math.PI / 2);
      const z = Math.cos(pan * Math.PI / 2);
      this._pannerNode.setPosition(x, 0, z);
    }
  }

  setCone(insideAngle: number, outsideAngle: number, outsideVolume: number): void {
    if (this._pannerNode) {
      this._pannerNode.coneInnerAngle = insideAngle;
      this._pannerNode.coneOuterAngle = outsideAngle;
      this._pannerNode.coneOuterGain = outsideVolume;
    }
  }

  setOrientation(x: number, y: number, z: number): void {
    if (this._pannerNode) {
      this._pannerNode.setOrientation(x, y, z);
    }
  }

  destroy(): void {
    this.stop();
    this._gainNode.disconnect();
    if (this._pannerNode) {
      this._pannerNode.disconnect();
    }
    this.removeAllListeners();
  }
}
