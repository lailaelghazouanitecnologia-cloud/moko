import { EventEmitter } from './event-emitter';
import { Timer } from './timer';
import { Tags } from './tags';
import { Platform } from './platform';

export class ResourceLoader {
    private cache: Map<string, any> = new Map();
    private inflight: Map<string, Promise<any>> = new Map();

    async load(url: string, type?: string): Promise<any> {
        const key = url + (type ? `:${type}` : '');
        
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }
        
        if (this.inflight.has(key)) {
            return this.inflight.get(key);
        }
        
        let promise: Promise<any>;
        
        switch (type) {
            case 'image':
                promise = this.loadImage(url);
                break;
            case 'text':
                promise = this.loadText(url);
                break;
            case 'json':
                promise = this.loadJson(url);
                break;
            case 'arraybuffer':
                promise = this.loadArrayBuffer(url);
                break;
            case 'blob':
                promise = this.loadBlob(url);
                break;
            default:
                promise = fetch(url).then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to load ${url}: ${response.statusText}`);
                    }
                    return response;
                });
        }
        
        this.inflight.set(key, promise);
        
        try {
            const result = await promise;
            this.cache.set(key, result);
            this.inflight.delete(key);
            return result;
        } catch (error) {
            this.inflight.delete(key);
            throw error;
        }
    }

    loadImage(url: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }

    async loadText(url: string): Promise<string> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load text: ${url}`);
        }
        return response.text();
    }

    async loadJson(url: string): Promise<any> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load JSON: ${url}`);
        }
        return response.json();
    }

    async loadArrayBuffer(url: string): Promise<ArrayBuffer> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load array buffer: ${url}`);
        }
        return response.arrayBuffer();
    }

    async loadBlob(url: string): Promise<Blob> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load blob: ${url}`);
        }
        return response.blob();
    }

    async preload(urls: string[]): Promise<any[]> {
        const promises = urls.map(url => this.load(url));
        return Promise.all(promises);
    }

    clearCache(url?: string): void {
        if (url) {
            this.cache.delete(url);
            this.cache.delete(`${url}:image`);
            this.cache.delete(`${url}:text`);
            this.cache.delete(`${url}:json`);
            this.cache.delete(`${url}:arraybuffer`);
            this.cache.delete(`${url}:blob`);
        } else {
            this.cache.clear();
        }
    }

    isCached(url: string): boolean {
        return this.cache.has(url) ||
               this.cache.has(`${url}:image`) ||
               this.cache.has(`${url}:text`) ||
               this.cache.has(`${url}:json`) ||
               this.cache.has(`${url}:arraybuffer`) ||
               this.cache.has(`${url}:blob`);
    }

    static createObjectURL(buffer: ArrayBuffer, type: string): string {
        const blob = new Blob([buffer], { type });
        return URL.createObjectURL(blob);
    }

    static revokeObjectURL(url: string): void {
        URL.revokeObjectURL(url);
    }
}
