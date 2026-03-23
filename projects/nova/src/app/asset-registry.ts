import { ResourceLoader } from '../core';
import { Asset } from './asset';

export class AssetRegistry {
    private _assets: Map<string, Asset>;
    private _loader: ResourceLoader;
    private _prefix: string;

    constructor(loader: ResourceLoader) {
        this._assets = new Map();
        this._loader = loader;
        this._prefix = '';
    }

    add(asset: Asset): void {
        this._assets.set(asset.id, asset);
    }

    remove(id: string): void {
        this._assets.delete(id);
    }

    get(id: string): Asset {
        const asset = this._assets.get(id);
        if (!asset) {
            throw new Error(`Asset not found: ${id}`);
        }
        return asset;
    }

    find(name: string): Asset {
        for (const asset of this._assets.values()) {
            if (asset.name === name) {
                return asset;
            }
        }
        throw new Error(`Asset not found: ${name}`);
    }

    findAll(name: string): Asset[] {
        const results: Asset[] = [];
        for (const asset of this._assets.values()) {
            if (asset.name === name) {
                results.push(asset);
            }
        }
        return results;
    }

    async load(url: string, type: string): Promise<Asset> {
        const fullUrl = this._prefix + url;
        const data = await this._loader.load(fullUrl);
        const asset = this._createAsset(data, type);
        asset.id = url;
        asset.name = url;
        this.add(asset);
        return asset;
    }

    async loadBatch(urls: string[]): Promise<Asset[]> {
        const promises = urls.map(url => this.load(url, 'unknown'));
        return Promise.all(promises);
    }

    setPrefix(prefix: string): void {
        this._prefix = prefix;
    }

    getPrefix(): string {
        return this._prefix;
    }

    list(): Asset[] {
        return Array.from(this._assets.values());
    }

    clear(): void {
        this._assets.clear();
    }

    private _createAsset(data: any, type: string): Asset {
        return new Asset(data, type);
    }
}
