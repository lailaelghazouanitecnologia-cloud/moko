import { EventEmitter } from '../core/eventemitter';
import { Vec3 } from '../math/vec3';
import { Sound } from './sound';
import { Channel } from './channel';
import { Channel3d } from './channel3d';
import { Listener } from './listener';

export class AudioManager extends EventEmitter {
  private static _instance: AudioManager | null = null;
  private _context: AudioContext | null = null;
  private _masterGain: GainNode | null = null;
  private _listener: Listener | null = null;
  private _sounds: Map<string, Sound> = new Map();
  private _channels: Map<string, Channel> = new Map();
  private _initialized: boolean = false;

  private constructor() {
    super();
  }

  static get instance(): AudioManager {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  }

  initialize(): boolean {
    if (this._initialized) {
      return true;
    }

    try {
      this._context = new (window.AudioContext || (window as any).webkitAudioContext)();
      this._masterGain = this._context.createGain();
      this._masterGain.connect(this._context.destination);
      this._listener = new Listener(this._context);
      this._initialized = true;
      this.emit('initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize AudioManager:', error);
      return false;
    }
  }

  play(sound: Sound | string, channel?: string): boolean {
    if (!this._initialized || !this._context) {
      return false;
    }

    if (this._context.state === 'suspended') {
      this._context.resume();
    }

    let soundInstance: Sound;
    if (typeof sound === 'string') {
      soundInstance = this._sounds.get(sound);
      if (!soundInstance) {
        return false;
      }
    } else {
      soundInstance = sound;
    }

    if (channel) {
      const ch = this._channels.get(channel);
      if (ch) {
        return ch.play(soundInstance);
      }
    }

    return soundInstance.play();
  }

  pause(channel?: string): boolean {
    if (!this._initialized) {
      return false;
    }

    if (channel) {
      const ch = this._channels.get(channel);
      if (ch) {
        ch.pause();
        return true;
      }
      return false;
    }

    this._sounds.forEach(sound => sound.pause());
    this._channels.forEach(ch => ch.pause());
    return true;
  }

  stop(channel?: string): boolean {
    if (!this._initialized) {
      return false;
    }

    if (channel) {
      const ch = this._channels.get(channel);
      if (ch) {
        ch.stop();
        return true;
      }
      return false;
    }

    this._sounds.forEach(sound => sound.stop());
    this._channels.forEach(ch => ch.stop());
    return true;
  }

  setVolume(volume: number, channel?: string): boolean {
    if (!this._initialized || !this._masterGain) {
      return false;
    }

    volume = Math.max(0, Math.min(1, volume));

    if (channel) {
      const ch = this._channels.get(channel);
      if (ch) {
        ch.volume = volume;
        return true;
      }
      return false;
    }

    this._masterGain.gain.setValueAtTime(volume, this._context.currentTime);
    return true;
  }

  get context(): AudioContext | null {
    return this._context;
  }

  get masterGain(): GainNode | null {
    return this._masterGain;
  }

  get listener(): Listener | null {
    return this._listener;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  addSound(name: string, sound: Sound): void {
    this._sounds.set(name, sound);
  }

  removeSound(name: string): boolean {
    return this._sounds.delete(name);
  }

  getSound(name: string): Sound | undefined {
    return this._sounds.get(name);
  }

  addChannel(name: string, channel: Channel): void {
    this._channels.set(name, channel);
  }

  removeChannel(name: string): boolean {
    return this._channels.delete(name);
  }

  getChannel(name: string): Channel | undefined {
    return this._channels.get(name);
  }

  destroy(): void {
    this.stop();
    this._sounds.forEach(sound => sound.destroy());
    this._channels.forEach(channel => channel.destroy());
    this._sounds.clear();
    this._channels.clear();
    if (this._masterGain) {
      this._masterGain.disconnect();
    }
    if (this._context) {
      this._context.close();
    }
    this._initialized = false;
    AudioManager._instance = null;
  }
}
