import { ResourceLoader } from '../core';

export class Sound {
    buffer: AudioBuffer;
    duration: number;
    sampleRate: number;
    length: number;
    name: string;

    constructor() {
        this.buffer = null as any;
        this.duration = 0;
        this.sampleRate = 0;
        this.length = 0;
        this.name = '';
    }

    static fromBuffer(buffer: AudioBuffer): Sound {
        const sound = new Sound();
        sound.buffer = buffer;
        sound.duration = buffer.duration;
        sound.sampleRate = buffer.sampleRate;
        sound.length = buffer.length;
        return sound;
    }

    static async fromUrl(url: string, loader: ResourceLoader): Promise<Sound> {
        const arrayBuffer = await loader.loadArrayBuffer(url);
        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        const sound = Sound.fromBuffer(audioBuffer);
        sound.name = url.split('/').pop() || url;
        return sound;
    }

    clone(): Sound {
        const cloned = new Sound();
        cloned.buffer = this.buffer;
        cloned.duration = this.duration;
        cloned.sampleRate = this.sampleRate;
        cloned.length = this.length;
        cloned.name = this.name;
        return cloned;
    }

    destroy(): void {
        this.buffer = null as any;
        this.duration = 0;
        this.sampleRate = 0;
        this.length = 0;
        this.name = '';
    }
}
