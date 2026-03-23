import { EventEmitter } from '../core/eventemitter';
import { ResourceLoader } from '../core/resourceloader';

export interface Asset {
    id: string;
    type: string;
    data: any;
    loaded: boolean;
}

export class AssetRegistry extends EventEmitter {
    private assets: Map<string, Asset>;
    private loader: ResourceLoader;

    constructor() {
        super();
        this.assets = new Map<string, Asset>();
        this.loader = new ResourceLoader();
    }

    register(id: string, type: string, data: any): void {
        if (this.assets.has(id)) {
            throw new Error(`Asset with id '${id}' already registered`);
        }
        const asset: Asset = {
            id,
            type,
            data,
            loaded: false
        };
        this.assets.set(id, asset);
        this.emit('register', asset);
    }

    get(id: string): Asset | null {
        return this.assets.get(id) || null;
    }

    async load(id: string): Promise<Asset> {
        const asset = this.assets.get(id);
        if (!asset) {
            throw new Error(`Asset with id '${id}' not found`);
        }
        if (asset.loaded) {
            return asset;
        }
        try {
            const loadedData = await this.loader.load(asset.data);
            asset.data = loadedData;
            asset.loaded = true;
            this.emit('load', asset);
            return asset;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    unload(id: string): void {
        const asset = this.assets.get(id);
        if (!asset) {
            throw new Error(`Asset with id '${id}' not found`);
        }
        if (!asset.loaded) {
            return;
        }
        asset.loaded = false;
        this.emit('unload', asset);
    }

    list(): Asset[] {
        return Array.from(this.assets.values());
    }

    clear(): void {
        this.assets.clear();
        this.emit('clear');
    }
}
