import { Sound } from './sound';
import { Channel } from './channel';
import { Channel3 } from './channel3';
import { Listener } from './listener';

/**
 * Central audio system managing all sounds and channels.
 * Singleton that coordinates loading, playback and 3‑d positioning.
 */
export class AudioManager {
  private static _instance: AudioManager | null = null;

  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sounds = new Map<string, Sound>();
  private channels = new Map<string, Channel | Channel3>();
  private listener: Listener | null = null;

  private constructor() {}

  /**
   * Obtain the singleton instance.
   * @returns The AudioManager instance.
   */
  static get instance(): AudioManager {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager();
    }
    return AudioManager._instance;
  }

  /**
   * Initialise the audio subsystem.
   * Creates the AudioContext, master gain and listener.
   * Resumes a suspended context automatically.
   * @returns A promise that resolves when initialisation is complete.
   * @throws {Error} If Web Audio is unavailable.
   */
  async init(): Promise<void> {
    if (this.context) return;

    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio API not supported');

    this.context = new Ctor();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.value = 1.0;

    this.listener = new Listener(this.context);

    if (this.context.state === 'suspended') await this.context.resume();
  }

  /**
   * Load a sound file and cache it under an id.
   * Duplicate ids return the existing sound.
   * @param id Unique identifier for the sound.
   * @param url Absolute or relative URL to the audio file.
   * @returns Promise resolving to the Sound instance.
   * @throws {Error} If fetch or decoding fails.
   */
  async loadSound(id: string, url: string): Promise<Sound> {
    if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid sound id');
    if (typeof url !== 'string' || !url.trim()) throw new Error('Invalid url');

    if (this.sounds.has(id)) return this.sounds.get(id)!;

    if (!this.context) throw new Error('AudioManager not initialized');

    let response: Response;
    try {
      response = await fetch(url);
      if (!response.ok) throw new Error(`Network error: ${response.status}`);
    } catch (e) {
      throw new Error(`Failed to fetch sound "${id}" from ${url}: ${(e as Error).message}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await this.context.decodeAudioData(arrayBuffer.slice(0));
    } catch (e) {
      throw new Error(`Failed to decode audio data for "${id}": ${(e as Error).message}`);
    }

    const sound = new Sound(id, audioBuffer);
    this.sounds.set(id, sound);
    return sound;
  }

  /**
   * Create a 2-d or 3-d channel for grouping sounds.
   * Duplicate ids return the existing channel.
   * @param id Unique identifier for the channel.
   * @param type '2d' (default) or '3d'.
   * @returns The new or existing Channel/Channel3.
   * @throws {Error} If the manager is not initialised.
   */
  createChannel(id: string, type: '2d' | '3d' = '2d'): Channel | Channel3 {
    if (typeof id !== 'string' || !id.trim()) throw new Error('Invalid channel id');
    if (this.channels.has(id)) return this.channels.get(id)!;
    if (!this.context || !this.masterGain) throw new Error('AudioManager not initialized');

    const channel = type === '3d'
      ? new Channel3(id, this.context, this.masterGain)
      : new Channel(id, this.context, this.masterGain);

    this.channels.set(id, channel);
    return channel;
  }

  /**
   * Play a sound on a channel (creates a 2-d channel automatically if none supplied).
   * @param soundId  Id of the cached sound.
   * @param channelId Id of an existing or new channel; defaults to unique name.
   * @returns The channel the sound is playing on.
   *  @throws {Error} If the sound is not found.
   */
  play(soundId: string, channelId?: string): Channel | Channel3 {
    if (typeof soundId !== 'string' || !soundId.trim()) throw new Error('Invalid sound id');
    const sound = this.sounds.get(soundId);
    if (!sound) throw new Error(`Sound "${soundId}" not found`);

    const id = typeof channelId === 'string' && channelId.trim()
      ? channelId.trim()
      : `channel-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    let channel = this.channels.get(id);
    if (!channel) channel = this.createChannel(id, '2d');

    channel.play(sound);
    return channel;
  }

  /**
   * Stop every playing channel.
   */
  stopAll(): void {
    for (const ch of this.channels.values()) ch.stop();
  }

  /**
   * Adjust the master volume for all channels.
   * Values are clamped to 0–1.
   * @param volume 0 (silent) to 1 (full).
   * @throws {Error} If volume is not a number.
   */
  setMasterVolume(volume: number): void {
    if (typeof volume !== 'number' || !isFinite(volume)) throw new Error('Volume must be a finite number');
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }

  /**
   * Update 3‑d positional audio (call every frame).
   * @param dt Delta time in seconds (unused; kept for consistency).
   */
  update(dt: number): void {
    if (typeof dt !== 'number' || !isFinite(dt)) return;
    for (const ch of this.channels.values()) {
      if (ch instanceof Channel3) ch.update();
    }
  }

  /**
   * Release all resources and shut down the audio system.
   */
  destroy(): void {
    this.stopAll();

    for (const ch of this.channels.values()) ch.stop();
    this.channels.clear();
    this.sounds.clear();

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }

    if (this.context) {
      this.context.close().catch(() => { /* ignore */ });
      this.context = null;
    }

    this.listener = null;
    AudioManager._instance = null;
  }
}
