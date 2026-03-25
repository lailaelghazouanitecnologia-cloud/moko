import { SceneRegistry } from './scene-registry';
import { AssetRegistry } from './asset-registry';
import { ScriptRegistry } from './script-registry';
import { Timer } from '../core/timer';

/**
 * Central orchestrator for engine subsystems.
 * Manages the main loop, scene loading, and script/asset registration.
 */
export class Application {
  sceneRegistry: SceneRegistry;
  assetRegistry: AssetRegistry;
  scriptRegistry: ScriptRegistry;
  isRunning: boolean;
  deltaTime: number;
  fixedTimeStep: number;

  private _lastTime: number;
  private _accumulator: number;
  private _timer: Timer;

  constructor() {
    this.sceneRegistry = new SceneRegistry();
    this.assetRegistry = new AssetRegistry();
    this.scriptRegistry = new ScriptRegistry();
    this.isRunning = false;
    this.deltaTime = 0;
    this.fixedTimeStep = 1 / 60; // 60 FPS fixed timestep
    this._lastTime = 0;
    this._accumulator = 0;
    this._timer = new Timer();
  }

  /**
   * Launch the main loop and start the application.
   * @returns {void}
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this._lastTime = performance.now();
    this._accumulator = 0;

    this._timer.start();
    this._mainLoop();
  }

  /**
   * Halt the main loop and stop the application.
   * @returns {void}
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this._timer.stop();
  }

  /**
   * Advance one frame with the provided delta time.
   * @param {number} dt - Frame delta time in seconds.
   * @returns {void}
   */
  update(dt: number): void {
    if (typeof dt !== 'number' || dt < 0 || !isFinite(dt)) {
      throw new Error('update expects a non-negative finite number for dt');
    }

    this.deltaTime = dt;

    const activeScene = this.sceneRegistry.get(this.sceneRegistry.activeScene);
    if (activeScene) {
      activeScene.systems.forEach(system => {
        try {
          system.update(dt);
        } catch (err) {
          console.error('Error during system update:', err);
        }
      });
    }

    this.scriptRegistry.active.forEach(scriptId => {
      const script = this.scriptRegistry.get(scriptId);
      if (script && typeof script.update === 'function') {
        try {
          script.update(dt);
        } catch (err) {
          console.error(`Error updating script ${scriptId}:`, err);
        }
      }
    });
  }

  /**
   * Perform a fixed physics step.
   * @returns {void}
   */
  fixedUpdate(): void {
    const activeScene = this.sceneRegistry.get(this.sceneRegistry.activeScene);
    if (activeScene) {
      activeScene.systems.forEach(system => {
        if (typeof system.fixedUpdate === 'function') {
          try {
            system.fixedUpdate(this.fixedTimeStep);
          } catch (err) {
            console.error('Error during system fixedUpdate:', err);
          }
        }
      });
    }
  }

  /**
   * Switch to a new scene by name.
   * @param {string} name - Name of the scene to load.
   * @returns {Promise<void>}
   * @throws {Error} If name is not a non-empty string.
   */
  async loadScene(name: string): Promise<void> {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('loadScene requires a non-empty string for name');
    }

    try {
      await this.sceneRegistry.load(name);
    } catch (err) {
      console.error(`Failed to load scene: ${name}`, err);
      throw err;
    }
  }

  /**
   * Add asset data to the registry.
   * @param {string} id - Unique identifier for the asset.
   * @param {any} data - Asset data to cache.
   * @returns {void}
   * @throws {Error} If id is not a non-empty string.
   */
  registerAsset(id: string, data: any): void {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('registerAsset requires a non-empty string for id');
    }

    this.assetRegistry.cache.set(id, data);
  }

  /**
   * Register a script class with the engine.
   * @param {string} name - Name identifier for the script.
   * @param {new () => any} cls - Constructor function for the script class.
   * @returns {void}
   * @throws {Error} If name is not a non-empty string or cls is not a constructor.
   */
  registerScript(name: string, cls: new () => any): void {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('registerScript requires a non-empty string for name');
    }
    if (typeof cls !== 'function') {
      throw new Error('registerScript expects a constructor function for cls');
    }

    let script: any;
    try {
      script = new cls();
    } catch (err) {
      throw new Error(`Failed to instantiate script class "${name}": ${err}`);
    }

    this.scriptRegistry.register(name, script);
  }

  /**
   * Get the current frame duration in milliseconds.
   * @returns {number} Delta time in milliseconds.
   */
  getDeltaTime(): number {
    return this.deltaTime;
  }

  /**
   * Main execution loop that schedules updates and handles fixed timestep.
   * @private
   * @returns {void}
   */
  private _mainLoop(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const frameTime = (currentTime - this._lastTime) / 1000; // Convert to seconds
    this._lastTime = currentTime;

    this._accumulator += frameTime;

    while (this._accumulator >= this.fixedTimeStep) {
      this.fixedUpdate();
      this._accumulator -= this.fixedTimeStep;
    }

    this.update(frameTime);

    requestAnimationFrame(() => this._mainLoop());
  }
}