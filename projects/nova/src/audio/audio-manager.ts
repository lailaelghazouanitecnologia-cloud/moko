import { ResourceLoader, Platform } from '../core';
import { Mat3, Mat4, BoundingBox } from '../math';
import { Sound } from './sound';
import { Channel } from './channel';
import { Channel3d } from './channel3d';
import { Listener } from './listener';

export interface SoundOptions {
    loop?: boolean;
    volume?: number;
    pitch?: number;
}

export class AudioManager {
    private context: AudioContext | null = null;
    private loader: ResourceLoader;
    private volume: number = 1;
    private suspended: boolean = false;
    private sounds: Map<string, Sound> = new Map();
    private listener: Listener;
    private static _instance: AudioManager | null = null;

    constructor() {
        this.loader = new ResourceLoader();
        this.listener = new Listener();
    }

    static get instance(): AudioManager {
        if (!AudioManager._instance) {
            AudioManager._instance = new AudioManager();
        }
        return AudioManager._instance;
    }

    async initialize(): Promise<void> {
        if (this.context) {
            return;
        }

        this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        if (this.context.state === 'suspended') {
            const resumeContext = async () => {
                await this.context!.resume();
                document.removeEventListener('click', resumeContext);
                document.removeEventListener('touchstart', resumeContext);
                document.removeEventListener('keydown', resumeContext);
            };
            
            document.addEventListener('click', resumeContext);
            document.addEventListener('touchstart', resumeContext);
            document.addEventListener('keydown', resumeContext);
        }
    }

    async createSound(url: string, options?: SoundOptions): Promise<Sound> {
        if (!this.context) {
            await this.initialize();
        }

        if (this.sounds.has(url)) {
            return this.sounds.get(url)!;
        }

        const arrayBuffer = await this.loader.loadArrayBuffer(url);
        const audioBuffer = await this.context!.decodeAudioData(arrayBuffer.slice(0));
        
        const sound = new Sound(audioBuffer, options);
        this.sounds.set(url, sound);
        
        return sound;
    }

    createChannel(sound?: Sound): Channel {
        if (!this.context) {
            throw new Error('AudioManager not initialized');
        }
        return new Channel(this.context, sound);
    }

    createChannel3d(sound?: Sound): Channel3d {
        if (!this.context) {
            throw new Error('AudioManager not initialized');
        }
        return new Channel3d(this.context, sound);
    }

    setVolume(v: number): void {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.context) {
            this.context.listener.setPosition(0, 0, 0);
        }
    }

    getVolume(): number {
        return this.volume;
    }

    suspend(): void {
        if (this.context && this.context.state === 'running') {
            this.context.suspend();
            this.suspended = true;
        }
    }

    resume(): void {
        if (this.context && this.context.state === 'suspended') {
            this.context.resume();
            this.suspended = false;
        }
    }

    update(dt: number): void {
        if (!this.context) return;
        
        this.listener.update(dt);
        
        for (const sound of this.sounds.values()) {
            if (sound.update) {
                sound.update(dt);
            }
        }
    }

    destroy(): void {
        if (this.context) {
            this.context.close();
            this.context = null;
        }
        
        for (const sound of this.sounds.values()) {
            if (sound.destroy) {
                sound.destroy();
            }
        }
        this.sounds.clear();
        
        AudioManager._instance = null;
    }
}
