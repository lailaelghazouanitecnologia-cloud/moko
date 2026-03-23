import { RenderEngine } from '../graphics';
import { PhysicsEngine } from '../physics';
import { ScriptEngine } from '../scripts';
import { Scene } from '../gameobject';
import { Input } from '../input';
import { Time } from '../core';

export class Engine {
  fps: number;
  renderEngine: RenderEngine;
  physicsEngine: PhysicsEngine;
  scriptEngine: ScriptEngine;
  currentScene: Scene | null;
  scenes: Map<string, Scene>;
  input: Input;
  loaded: boolean;
  physicsEnabled: boolean;

  constructor() {
    this.fps = 60;
    this.renderEngine = new RenderEngine();
    this.physicsEngine = new PhysicsEngine();
    this.scriptEngine = new ScriptEngine();
    this.currentScene = null;
    this.scenes = new Map<string, Scene>();
    this.input = new Input();
    this.loaded = false;
    this.physicsEnabled = true;
  }

  init(): void {
    this.renderEngine.init();
    this.physicsEngine.init();
    this.scriptEngine.init();
    this.input.init();
    this.loaded = true;
  }

  run(): void {
    if (!this.loaded) {
      throw new Error('Engine not initialized. Call init() first.');
    }

    const loop = (timestamp: number) => {
      Time.tick(timestamp);

      this.updateScene();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  updateScene(): void {
    if (!this.currentScene) {
      return;
    }

    if (this.currentScene.hasNewObjects()) {
      this.currentScene.flush();
    }

    this.scriptEngine.update();

    if (this.physicsEnabled) {
      const fixedTimeStep = 1 / 60;
      this.physicsEngine.update(fixedTimeStep);
    }

    this.renderEngine.update();
    this.renderEngine.render();

    this.currentScene.cleanTrash();
  }

  async loadScene(key: string): Promise<void> {
    const scene = this.scenes.get(key);
    if (!scene) {
      throw new Error(`Scene '${key}' not found`);
    }

    if (this.currentScene) {
      this.currentScene.reset();
    }

    this.currentScene = scene;
    await scene.load();
  }

  getCurrentScene(): Scene | null {
    return this.currentScene;
  }

  setCurrentScene(scene: Scene): void {
    if (this.currentScene) {
      this.currentScene.reset();
    }
    this.currentScene = scene;
  }

  addScene(key: string, scene: Scene): void {
    this.scenes.set(key, scene);
  }

  setClearColor(r: number, g: number, b: number, a: number): void {
    this.renderEngine.setClearColor(r, g, b, a);
  }

  enablePhysics(enabled: boolean): void {
    this.physicsEnabled = enabled;
  }
}
