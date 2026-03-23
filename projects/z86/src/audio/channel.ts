import { EventEmitter } from '../core/eventemitter';
import { AudioManager } from './audiomanager';

export class Channel extends EventEmitter {
    private _manager: AudioManager;
    private _gainNode: GainNode;
    private _pannerNode: PannerNode;
    private _volume: number;
    private _pan: number;
    private _muted: boolean;
    private _paused: boolean;
    private _loop: boolean;
    private _playbackRate: number;
    private _audioNodes: AudioNode[];

    constructor(manager: AudioManager) {
        super();
        this._manager = manager;
        const ctx = manager.context;
        this._gainNode = ctx.createGain();
        this._pannerNode = ctx.createPanner();
        this._gainNode.connect(this._pannerNode);
        this._pannerNode.connect(ctx.destination);
        this._volume = 1.0;
        this._pan = 0.0;
        this._muted = false;
        this._paused = false;
        this._loop = false;
        this._playbackRate = 1.0;
        this._audioNodes = [];
    }

    connect(node: AudioNode): void {
        this._pannerNode.disconnect();
        this._pannerNode.connect(node);
    }

    disconnect(node?: AudioNode): void {
        if (node) {
            this._pannerNode.disconnect(node);
        } else {
            this._pannerNode.disconnect();
        }
    }

    setVolume(volume: number): void {
        this._volume = Math.max(0, Math.min(1, volume));
        this._updateGain();
    }

    getVolume(): number {
        return this._volume;
    }

    setPan(pan: number): void {
        this._pan = Math.max(-1, Math.min(1, pan));
        this._pannerNode.setPosition(this._pan, 0, 0);
    }

    getPan(): number {
        return this._pan;
    }

    setMuted(muted: boolean): void {
        this._muted = muted;
        this._updateGain();
    }

    isMuted(): boolean {
        return this._muted;
    }

    setPaused(paused: boolean): void {
        this._paused = paused;
    }

    isPaused(): boolean {
        return this._paused;
    }

    setLoop(loop: boolean): void {
        this._loop = loop;
    }

    getLoop(): boolean {
        return this._loop;
    }

    setPlaybackRate(rate: number): void {
        this._playbackRate = Math.max(0.1, rate);
    }

    getPlaybackRate(): number {
        return this._playbackRate;
    }

    private _updateGain(): void {
        const gain = this._muted ? 0 : this._volume;
        this._gainNode.gain.setValueAtTime(gain, this._manager.context.currentTime);
    }

    addAudioNode(node: AudioNode): void {
        this._audioNodes.push(node);
        node.connect(this._gainNode);
    }

    removeAudioNode(node: AudioNode): void {
        const idx = this._audioNodes.indexOf(node);
        if (idx !== -1) {
            this._audioNodes.splice(idx, 1);
            node.disconnect(this._gainNode);
        }
    }

    clearAudioNodes(): void {
        for (const node of this._audioNodes) {
            node.disconnect(this._gainNode);
        }
        this._audioNodes.length = 0;
    }

    destroy(): void {
        this.clearAudioNodes();
        this._gainNode.disconnect();
        this._pannerNode.disconnect();
        this._gainNode = null as any;
        this._pannerNode = null as any;
        this._manager = null as any;
    }
}
