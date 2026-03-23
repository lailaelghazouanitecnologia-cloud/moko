import { EventEmitter } from '../core/event-emitter';
import { Timer } from '../core/timer';
import { ResourceLoader } from '../core/resource-loader';
import { Platform } from '../core/platform';
import { SceneRegistry } from './scene-registry';
import { AssetRegistry } from './asset-registry';
import { ScriptRegistry } from './script-registry';

export class Application extends EventEmitter {
    private _sceneRegistry: SceneRegistry;
    private _assetRegistry: AssetRegistry;
    private _scriptRegistry: ScriptRegistry;
    private _timer: Timer;
    private _resourceLoader: ResourceLoader;
    private _platform: Platform;
    private _running: boolean = false;
    private _frameId: number | null = null;

    constructor() {
        super();
        this._sceneRegistry = new SceneRegistry();
        this._assetRegistry = new AssetRegistry();
        this._scriptRegistry = new ScriptRegistry();
        this._timer = new Timer();
        this._resourceLoader = new ResourceLoader();
        this._platform = new Platform();
    }

    public run(): void {
        if (this._running) return;
        this._running = true;
        this.emit('start');
        this._tick();
    }

    public shutdown(): void {
        if (!this._running) return;
        this._running = false;
        if (this._frameId !== null) {
            cancelAnimationFrame(this._frameId);
            this._frameId = null;
        }
        this.emit('shutdown');
    }

    private _tick = (): void => {
        if (!this._running) return;
        this._timer.update();
        this.emit('update', this._timer.deltaTime);
        this.emit('render');
        this._frameId = requestAnimationFrame(this._tick);
    };

    get sceneRegistry(): SceneRegistry {
        return this._sceneRegistry;
    }

    get assetRegistry(): AssetRegistry {
        return this._assetRegistry;
    }

    get scriptRegistry(): ScriptRegistry {
        return this._scriptRegistry;
    }

    get timer(): Timer {
        return this._timer;
    }

    get resourceLoader(): ResourceLoader {
        return this._resourceLoader;
    }

    get platform(): Platform {
        return this._platform;
    }

    get running(): boolean {
        return this._running;
    }
}
