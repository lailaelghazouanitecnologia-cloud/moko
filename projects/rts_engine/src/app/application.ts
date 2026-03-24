import { Scene } from '../scene';
import { SceneRegistry } from './scene-registry';
import { AssetRegistry } from './index';
import { ScriptRegistry } from './script-registry';
// UNRESOLVED: import { SceneFactory } from '../scene/factory';
// UNRESOLVED: import { Loader } from '../asset/loader';
// UNRESOLVED: import { Script } from '../script';

export interface AppConfig {
  bootScene?: string;
  width?: number;
  height?: number;
}

export interface AppStats {
  frameTime: number;
  fps: number;
  drawCalls: number;
}

/**
 * Main application controller that manages scenes, assets, and scripts.
 * Handles the application lifecycle and provides a central registry for all game components.
 */
export class Application {
  private registry: SceneRegistry;
  private assets: AssetRegistry;
  private scripts: ScriptRegistry;
  private currentScene: Scene | null = null;
  private running: boolean = false;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private stats: AppStats = {
    frameTime: 16.67,
    fps: 60,
    drawCalls: 0
  };

  constructor() {
    this.registry = new SceneRegistry();
    this.assets = new AssetRegistry();
    this.scripts = new ScriptRegistry();
  }

  /**
   * Initialize the application and start the main loop.
   * @param config - Optional configuration object
   * @throws {Error} If the boot scene is specified but not registered
   */
  async start(config?: AppConfig): Promise<void> {
    if (this.running) {
      throw new Error('Application is already running');
    }

    this.running = true;
    this.lastFrameTime = performance.now();

    if (config?.bootScene) {
      if (!this.registry.has(config.bootScene)) {
        throw new Error(`Boot scene '${config.bootScene}' is not registered`);
      }
      await this.loadScene(config.bootScene);
    }
  }

  /**
   * Stop the application and cleanup resources.
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.currentScene) {
      try {
        await this.currentScene.destroy();
      } catch (error) {
        console.error('Error destroying current scene:', error);
      }
      this.currentScene = null;
    }

    // Cleanup registries
    this.registry.clear();
    this.assets.clear();
    this.scripts.clear();
  }

  /**
   * Load a scene by name and make it the current scene.
   * @param name - The name of the scene to load
   * @returns The loaded scene
   * @throws {Error} If the scene is not registered
   */
  async loadScene(name: string): Promise<Scene> {
    if (!name || typeof name !== 'string') {
      throw new Error('Scene name must be a non-empty string');
    }

    const factory = this.registry.get(name);
    if (!factory) {
      throw new Error(`Scene '${name}' is not registered`);
    }

    let scene: Scene;
    try {
      scene = factory();
    } catch (error) {
      throw new Error(`Failed to create scene '${name}': ${error}`);
    }

    if (this.currentScene) {
      try {
        await this.currentScene.destroy();
      } catch (error) {
        console.error('Error destroying previous scene:', error);
      }
    }

    this.currentScene = scene;
    return scene;
  }

  /**
   * Preload multiple assets in parallel.
   * @param urls - Array of asset URLs to preload
   * @throws {Error} If urls is not an array or contains invalid entries
   */
  async preloadAssets(urls: string[]): Promise<void> {
    if (!Array.isArray(urls)) {
      throw new Error('URLs must be an array');
    }

    if (urls.length === 0) {
      return;
    }

    const invalidUrls = urls.filter(url => !url || typeof url !== 'string');
    if (invalidUrls.length > 0) {
      throw new Error('All URLs must be non-empty strings');
    }

    try {
      await this.assets.preload(urls);
    } catch (error) {
      throw new Error(`Failed to preload assets: ${error}`);
    }
  }

  /**
   * Register a scene factory.
   * @param name - The name of the scene
   * @param factory - Factory function that creates the scene
   * @throws {Error} If name is invalid or factory is not a function
   */
  registerScene(name: string, factory: SceneFactory): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Scene name must be a non-empty string');
    }

    if (typeof factory !== 'function') {
      throw new Error('Scene factory must be a function');
    }

    this.registry.register(name, factory);
  }

  /**
   * Register an asset loader for a specific type.
   * @param type - The asset type
   * @param loader - The loader instance
   * @throws {Error} If type is invalid or loader is invalid
   */
  registerAsset(type: string, loader: Loader): void {
    if (!type || typeof type !== 'string') {
      throw new Error('Asset type must be a non-empty string');
    }

    if (!loader || typeof loader.load !== 'function') {
      throw new Error('Asset loader must have a load method');
    }

    this.assets.register(type, loader);
  }

  /**
   * Register a script.
   * @param name - The name of the script
   * @param script - The script instance
   * @throws {Error} If name is invalid or script is invalid
   */
  registerScript(name: string, script: Script): void {
    if (!name || typeof name !== 'string') {
      throw new Error('Script name must be a non-empty string');
    }

    if (!script || typeof script.update !== 'function') {
      throw new Error('Script must have an update method');
    }

    this.scripts.register(name, script);
  }

  /**
   * Update the current scene with the given delta time.
   * @param dt - Delta time in seconds
   * @throws {Error} If dt is invalid
   */
  tick(dt: number): void {
    if (typeof dt !== 'number' || dt < 0) {
      throw new Error('Delta time must be a non-negative number');
    }

    if (!this.running) {
      return;
    }

    if (this.currentScene) {
      try {
        this.currentScene.update(dt);
        this.updateStats(dt);
      } catch (error) {
        console.error('Error updating scene:', error);
      }
    }
  }

  /**
   * Resize the application and notify the current scene.
   * @param width - The new width
   * @param height - The new height
   * @throws {Error} If width or height is invalid
   */
  resize(width: number, height: number): void {
    if (typeof width !== 'number' || width <= 0) {
      throw new Error('Width must be a positive number');
    }

    if (typeof height !== 'number' || height <= 0) {
      throw new Error('Height must be a positive number');
    }

    if (this.currentScene) {
      try {
        this.currentScene.resize(width, height);
      } catch (error) {
        console.error('Error resizing scene:', error);
      }
    }
  }

  /**
   * Get current application statistics.
   * @returns Application statistics including frame time, FPS, and draw calls
   */
  getStats(): AppStats {
    return { ...this.stats };
  }

  /**
   * Check if the application is currently running.
   * @returns True if running, false otherwise
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get the currently active scene.
   * @returns The current scene or null if none is active
   */
  getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  /**
   * Update internal statistics based on frame time.
   * @param dt - Delta time in seconds
   */
  private updateStats(dt: number): void {
    this.frameCount++;
    this.stats.frameTime = dt * 1000; // Convert to milliseconds
    this.stats.fps = dt > 0 ? Math.round(1 / dt) : 0;
    
    // Reset draw calls counter (would be updated by renderer in real implementation)
    this.stats.drawCalls = 0;
  }
}