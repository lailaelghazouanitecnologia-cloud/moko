import { Channel, Channel3d } from './index';

/**
 * Central 3D audio controller for managing playback, volume, and spatial audio.
 */
export class AudioManager {
  masterVolume: number;
  listener: Listener;
  channels: Map<string, Channel>;

  private audioContext: AudioContext;
  private resourceLoader: ResourceLoader;
  private sounds: Map<string, Sound>;

  /**
   * Creates an instance of AudioManager.
   * @param resourceLoader - Resource loader for fetching audio assets.
   * @throws {Error} If Web Audio API is not supported.
   */
  constructor(resourceLoader: ResourceLoader) {
    if (!resourceLoader) {
      throw new Error('ResourceLoader is required');
  }

  this.masterVolume = 1.0;
  this.listener = new Listener();
  this.channels = new Map<string, Channel>();
  this.sounds = new Map<string, Sound>();
  this.resourceLoader = resourceLoader;

  // Initialize Web Audio API context
  if (typeof window !== 'undefined' && window.AudioContext) {
    this.audioContext = new AudioContext();
  } else if (typeof window !== 'undefined' && (window as any).webkitAudioContext) {
    this.audioContext = new (window as any).webkitAudioContext();
  } else {
    throw new Error('Web Audio API not supported');
  }
  }

  /**
   * Loads or retrieves a cached Sound instance for the given URL.
   * @param url - The URL of the audio asset.
   * @returns The corresponding Sound instance.
   * @throws {Error} If the URL is invalid.
   */
  createSound(url: string): Sound {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Invalid sound URL');
  }

  if (this.sounds.has(url)) {
    return this.sounds.get(url)!;
  }

  const sound = new Sound(url, this.audioContext, this.resourceLoader);
  this.sounds.set(url, sound);
  return sound;
  }

  /**
   * Starts 2D playback of a sound.
   * @param sound - The Sound instance to play.
   * @returns The new Channel for controlling playback.
   * @throws {Error} If the sound is invalid.
   */
  play(sound: Sound): Channel {
  if (!sound || !(sound instanceof Sound)) {
    throw new Error('Invalid Sound instance');
  }

  const channel = sound.play();
  const channelId = this.generateChannelId('channel');
  this.channels.set(channelId, channel);

  // Clean up when channel stops
  this.scheduleChannelCleanup(channel, channelId);

  return channel;
  }

  /**
   * Starts 3D spatial playback of a sound.
   * @param sound - The Sound instance to play.
   * @param x - X-coordinate in world space.
   * @param y - Y-coordinate in world space.
   * @param z - Z-coordinate in world space.
   * @returns The new Channel3d for spatial control.
   * @throws {Error} If the sound is invalid or coordinates are invalid.
   */
  play3d(sound: Sound, x: number, y: number, z: number): Channel3d {
  if (!sound || !(sound instanceof Sound)) {
    throw new Error('Invalid Sound instance');
  }
  if (!this.isValidCoordinate(x) || !this.isValidCoordinate(y) || !this.isValidCoordinate(z)) {
    throw new Error('Invalid 3D coordinates');
  }

  const channel3d = sound.play3d(x, y, z);
  const channelId = this.generateChannelId('channel3d');
  this.channels.set(channelId, channel3d);

  // Clean up when channel stops
  this.scheduleChannelCleanup(channel3d, channelId);

  return channel3d;
  }

  /**
   * Stops a channel and removes it from active management.
   * @param channel - The Channel to stop.
   * @throws {Error} If the channel is invalid.
   */
  stop(channel: Channel): void {
  if (!channel || !(channel instanceof Channel)) {
    throw new Error('Invalid Channel instance');
  }

  channel.stop();
  this.removeChannel(channel);
  }

  /**
   * Pauses a channel.
   * @param channel - The Channel to pause.
   * @throws {Error} If the channel is invalid.
   */
  pause(channel: Channel): void {
  if (!channel || !(channel instanceof Channel)) {
    throw new Error('Invalid Channel instance');
  }

  channel.pause();
  }

  /**
   * Resumes a paused channel.
   * @param channel - The Channel to resume.
   * @throws {Error} If the channel is invalid.
   */
  resume(channel: Channel): void {
  if (!channel || !(channel instanceof Channel)) {
    throw new Error('Invalid Channel instance');
  }

  channel.resume();
  }

  /**
   * Sets the global master volume for all playback.
   * @param volume - Desired volume in range [0, 1].
   * @throws {Error} If volume is not a valid number in range [0, 1].
   */
  setMasterVolume(volume: number): void {
  if (typeof volume !== 'number' || isNaN(volume) || volume < 0 || volume > 1) {
    throw new Error('Volume must be a number in range [0, 1]');
  }

  this.masterVolume = volume;

  // Apply to all channels
  for (const channel of this.channels.values()) {
    channel.setVolume(channel.volume * this.masterVolume);
  }
  }

  /**
   * Updates spatial audio for all active 3D channels.
   * @param dt - Delta time in seconds for this frame.
   * @throws {Error} If dt is not a valid number.
   */
  update(dt: number): void {
  if (typeof dt !== 'number' || isNaN(dt) || dt < 0) {
    throw new Error('dt must be a non-negative number');
  }

  for (const channel of this.channels.values()) {
    if (channel instanceof Channel3d) {
      channel.update(this.listener);
    }
  }
  }

  /**
   * Generates a unique channel identifier.
   * @param prefix - Prefix for the ID.
   * @returns Unique channel ID string.
   */
  private generateChannelId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Scheduled cleanup for a channel when it stops playing.
   * @param channel - The channel to monitor.
   * |param channelId - The ID of the channel in the map.
   */
  private scheduleChannelCleanup(channel: Channel, channelId: string): void {
  const checkStopped = () => {
    if (!channel.isPlaying()) {
      this.channels.delete(channelId);
    } else {
      setTimeout(checkStopped, 100);
    }
  };
  checkStopped();
  }

  /**
   * Removes a channel from active management.
   * @param channel - The channel to remove.
   */
  private removeChannel(channel: Channel): void {
  for (const [id, ch] of this.channels.entries()) {
    if (ch === channel) {
      this.channels.delete(id);
      break;
    }
  }
  }

  /**
   * Validates a single coordinate component.
   * @param value - The coordinate value.
   * @returns True if valid.
   */
  private isValidCoordinate(value: number): boolean {
  return typeof value === 'number' && isFinite(value);
  }
}