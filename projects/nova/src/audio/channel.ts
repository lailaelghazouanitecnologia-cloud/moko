import { Sound } from './sound';

export class Channel {
    private sound: Sound | null = null;
    private source: AudioBufferSourceNode | null = null;
    private gain: GainNode | null = null;
    private panner: StereoPannerNode | null = null;
    private playing: boolean = false;
    private paused: boolean = false;
    private currentTime: number = 0;
    private volume: number = 1;
    private pitch: number = 1;
    private loop: boolean = false;
    private audioContext: AudioContext;
    private startTime: number = 0;
    private pauseTime: number = 0;

    constructor(audioContext: AudioContext) {
        this.audioContext = audioContext;
        this.gain = audioContext.createGain();
        this.panner = audioContext.createStereoPanner();
        this.gain.connect(this.panner);
        this.panner.connect(audioContext.destination);
    }

    play(): void {
        if (!this.sound || this.playing) return;

        if (this.paused && this.source) {
            this.source.playbackRate.value = this.pitch;
            this.source.connect(this.gain!);
            this.startTime = this.audioContext.currentTime - this.pauseTime;
            this.paused = false;
            this.playing = true;
            return;
        }

        this.source = this.audioContext.createBufferSource();
        this.source.buffer = this.sound.getBuffer();
        this.source.loop = this.loop;
        this.source.playbackRate.value = this.pitch;
        
        this.source.connect(this.gain!);
        this.source.start(0, this.currentTime);
        
        this.startTime = this.audioContext.currentTime - this.currentTime;
        this.playing = true;
        this.paused = false;

        this.source.onended = () => {
            if (!this.loop) {
                this.playing = false;
                this.currentTime = 0;
            }
        };
    }

    pause(): void {
        if (!this.playing || this.paused || !this.source) return;

        this.source.disconnect();
        this.pauseTime = this.audioContext.currentTime - this.startTime;
        this.currentTime = this.pauseTime;
        this.paused = true;
        this.playing = false;
    }

    stop(): void {
        if (!this.source) return;

        this.source.stop();
        this.source.disconnect();
        this.source = null;
        this.playing = false;
        this.paused = false;
        this.currentTime = 0;
    }

    setVolume(v: number): void {
        this.volume = Math.max(0, Math.min(1, v));
        if (this.gain) {
            this.gain.gain.value = this.volume;
        }
    }

    getVolume(): number {
        return this.volume;
    }

    setPitch(p: number): void {
        this.pitch = Math.max(0.1, p);
        if (this.source) {
            this.source.playbackRate.value = this.pitch;
        }
    }

    getPitch(): number {
        return this.pitch;
    }

    setLoop(l: boolean): void {
        this.loop = l;
        if (this.source) {
            this.source.loop = this.loop;
        }
    }

    getLoop(): boolean {
        return this.loop;
    }

    setPan(p: number): void {
        if (this.panner) {
            this.panner.pan.value = Math.max(-1, Math.min(1, p));
        }
    }

    getPan(): number {
        return this.panner ? this.panner.pan.value : 0;
    }

    getCurrentTime(): number {
        if (this.playing && !this.paused) {
            return this.audioContext.currentTime - this.startTime;
        }
        return this.currentTime;
    }

    getDuration(): number {
        return this.sound ? this.sound.getDuration() : 0;
    }

    isPlaying(): boolean {
        return this.playing;
    }

    isPaused(): boolean {
        return this.paused;
    }

    destroy(): void {
        this.stop();
        if (this.panner) {
            this.panner.disconnect();
            this.panner = null;
        }
        if (this.gain) {
            this.gain.disconnect();
            this.gain = null;
        }
        this.sound = null;
    }

    setSound(sound: Sound): void {
        this.sound = sound;
    }
}
