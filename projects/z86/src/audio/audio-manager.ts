import { EventEmitter } from '../core';
import { Vec3 } from '../math';

export class AudioManager extends EventEmitter {
  private static instance: AudioManager;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private initialized = false;
  private sounds = new Map<string, any>();
  private channels = new Map<string, any>();
  private volume = 1.0;

  private constructor() {
    super();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.volume;
      
      this.initialized = true;
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw new Error(`Failed to initialize AudioManager: ${error}`);
    }
  }

  play(soundId: string, options?: { loop?: boolean; volume?: number; pitch?: number }): void {
    if (!this.initialized) {
      throw new Error('AudioManager not initialized');
    }

    const sound = this.sounds.get(soundId);
    if (!sound) {
      throw new Error(`Sound '${soundId}' not found`);
    }

    const source = this.audioContext!.createBufferSource();
    const gainNode = this.audioContext!.createGain();
    
    source.buffer = sound.buffer;
    source.connect(gainNode);
    gainNode.connect(this.masterGain!);
    
    if (options?.loop) {
      source.loop = true;
    }
    
    if (options?.volume !== undefined) {
      gainNode.gain.value = options.volume;
    }
    
    if (options?.pitch !== undefined) {
      source.playbackRate.value = options.pitch;
    }
    
    source.start();
    
    const channel = {
      id: `${soundId}_${Date.now()}`,
      source,
      gainNode,
      stop: () => {
        source.stop();
        source.disconnect();
        gainNode.disconnect();
      }
    };
    
    this.channels.set(channel.id, channel);
    
    source.onended = () => {
      this.channels.delete(channel.id);
    };
  }

  stop(channelId?: string): void {
    if (channelId) {
      const channel = this.channels.get(channelId);
      if (channel) {
        channel.stop();
        this.channels.delete(channelId);
      }
    } else {
      this.channels.forEach(channel => channel.stop());
      this.channels.clear();
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  getVolume(): number {
    return this.volume;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  addSound(id: string, sound: any): void {
    this.sounds.set(id, sound);
  }

  removeSound(id: string): void {
    this.sounds.delete(id);
  }

  getSound(id: string): any {
    return this.sounds.get(id);
  }

  getAllSounds(): string[] {
    return Array.from(this.sounds.keys());
  }

  getActiveChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  suspend(): void {
    if (this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  destroy(): void {
    this.stop();
    this.sounds.clear();
    this.channels.clear();
    
    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.initialized = false;
    this.emit('destroyed');
  }
}
