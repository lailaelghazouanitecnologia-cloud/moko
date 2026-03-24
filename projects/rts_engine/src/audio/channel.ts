import { AudioManager } from './audio-manager';
import { Sound } from './sound';

/**
 * 2D audio playback controller.
 * Manages the lifecycle and properties of a single audio channel.
 */
export class Channel {
  public readonly id: string;
  private gain: GainNode;
  private source: AudioBufferSourceNode | null = null;
  private sound: Sound | null = null;
  private volume: number = 1.0;
  private loop: boolean = false;
  private playing: boolean = false;
  private pausedAt: number = 0;
  private startTime: number = 0;

  /**
   * Creates a new Channel instance.
   * @param id - Unique identifier for this channel.
   * @param audioManager - Reference to the global AudioManager instance.
   * @throws {Error} If audioManager is invalid or missing required properties.
   */
  constructor(id: string, audioManager: AudioManager) {
    if (!id || typeof id !== 'string') {
      throw new Error('Channel id must be a non-empty string');
    }
    if (!audioManager) {
      throw new Error('AudioManager instance is required');
    }

    this.id = id;

    const context = (audioManager as any)['context'] as AudioContext | undefined;
    const masterGain = (audioManager as any)['masterGain'] as GainNode | undefined;

    if (!context) {
      throw new Error('AudioManager missing AudioContext');
    }
    if (!masterGain) {
      throw new Error('AudioManager missing masterGain');
    }

    this.gain = context.createGain();
    this.gain.connect(masterGain);
    this.gain.gain.value = this.volume;
  }

  /**
   * Start playback of the provided sound.
   * @param sound - The Sound asset to play.
   * @throws {Error} If sound is invalid or audio context is unavailable.
   */
  public play(sound: Sound): void {
    if (!sound) {
      throw new Error('Sound is required');
    }

    this.stop();

    const context = (AudioManager.instance as any)?.['context'] as AudioContext | undefined;
    if (!context) {
      throw new Error('AudioContext unavailable');
    }

    try {
      this.source = (sound as any).create();
      this.source!.loop = this.loop;
      this.source!.connect(this.gain);
      this.sound = sound;
      this.playing = true;
      this.startTime = context.currentTime;
      this.pausedAt = 0;
      this.source!.start(0);
    } catch (err) {
      this.playing = false;
      this.source = null;
      this.sound = null;
      throw new Error(`Failed to start playback: ${(err as Error).message}`);
    }
  }

  /**
   * Stop playback and clear the current source.
   */
  public stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {
        // Ignore errors if source is already stopped
      }
      try {
        this.source.disconnect();
      } catch (e) {
        // Ignore errors if source is already disconnected
      }
      this.source = null;
    }
    this.playing = false;
    this.pausedAt = 0;
    this.sound = null;
  }

  /**
   * Pause playback while preserving the current position.
   */
  public pause(): void {
    if (!this.playing || !this.source) return;

    const context = (AudioManager.instance as any)?.['context'] as AudioContext | undefined;
    if (!context) {
      console.warn('AudioContext unavailable during pause');
      return;
    }

    this.pausedAt = context.currentTime - this.startTime;

    try {
      this.source.stop();
      this.source.disconnect();
    } catch (e) {
      // Ignore errors if source is already stopped/disconnected
    }

    this.source = null;
    this.playing = false;
  }

  /**
   * Resume playback from the paused position.
   * @throws {Error} If sound is unavailable or audio context is missing.
   */
  public resume(): void {
    if (this.playing || !this.sound || this.pausedAt <= 0) return;

    const context = (AudioManager.instance as any)?.['context'] as AudioContext | undefined;
    if (!context) {
      throw new Error('AudioContext unavailable');
    }

    try {
      this.source = (this.sound as any).create();
      this.source!.loop = this.loop;
      this.source!.connect(this.gain);
      this.playing = true;
      this.startTime = context.currentTime - this.pausedAt;
      this.source!.start(0, this.pausedAt);
    } catch (err) {
      this.playing = false;
      this.source = null;
      throw new Error(`Failed to resume playback: ${(err as Error).message}`);
    }
  }

  /**
   * Update the volume of this channel.
   * @param volume - Desired volume between 0 and 1.
   */
  public setVolume(volume: number): void {
    if (typeof volume !== 'number' || isNaN(volume)) {
      console.warn('Invalid volume value; clamping to 0–1 range');
      volume = 0;
    }
    this.volume = Math.max(0, Math.min(1, volume));
    this.gain.gain.value = this.volume;
  }

  /**
   * Enable or disable looping for the current and future sources.
   * @param loop - True to enable looping.
   */
  public setLoop(loop: boolean): void {
    this.loop = Boolean(loop);
    if (this.source) {
      this.source.loop = this.loop;
    }
  }

  /**
   * Get the current playback position in seconds.
   * @returns Current time elapsed since start, or 0 if not playing.
   */
  public getPosition(): number {
    if (!this.playing || !this.sound) return 0;

    const context = (AudioManager.instance as any)?.['context'] as AudioContext | undefined;
    if (!context) {
      console.warn('AudioContext unavailable for position query');
      return 0;
    }

    return context.currentTime - this.startTime;
  }

  /**
   * Seek to a specific time in the sound.
   * @param time - Target time in seconds.
   */
  public setPosition(time: number): void {
    if (typeof time !== 'number' || isNaN(time) || time < 0) {
      console.warn('Invalid time value; ignoring seek');
      return;
    }
    if (!this.sound) return;

    const wasPlaying = this.playing;
    const paused = this.pausedAt;

    if (wasPlaying) this.pause();
    this.pausedAt = time;
    if (wasPlaying) {
      this.resume();
    } else {
      this.pausedAt = paused;
    }
  }

  /**
   * Indicates whether this channel is currently playing audio.
   * @returns True if playing.
   */
  public isPlaying(): boolean {
    return this.playing;
  }

  /**
   * Indicates whether this channel is paused.
   * @returns True if paused but has a valid pause position.
   */
  public isPaused(): boolean {
    return !this.playing && this.pausedAt > 0 && this.sound !== null;
  }

  /**
   * Get the current volume of this channel.
   * @returns Volume between 0 and 1.
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * Get the current loop setting.
   * @returns True if looping is enabled.
   */
  public getLoop(): boolean {
    return this.loop;
  }

  /**
   * Get the sound asset currently assigned to this channel.
   * @returns The Sound object or null if none.
   */
  public getSound(): Sound | null {
    return this.sound;
  }

  /**
   * Get the paused position in seconds.
   * @returns Paused time or 0 if not paused.
   */
  public getPausedAt(): number {
    return this.pausedAt;
  }
}
