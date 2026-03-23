import { EventEmitter, Timer, ResourceLoader, Tags, Platform } from '../core';
import { Vec2, Vec3, Vec4, Mat3, Mat4, Quat, Color, Ray } from '../math';
import { GraphicsDevice, WebGLDevice, VertexFormat, VertexBuffer, IndexBuffer, Shader, Texture, RenderTarget } from '../graphics';
import { GraphNode, Entity, Component, ComponentSystem, Camera, Light, MeshRenderer, Scene } from '../scene';
import { Keyboard, Mouse, Touch, Gamepad, InputManager, ElementInput } from '../input';
import { AudioManager, Sound, Channel, Channel3d, Listener } from '../audio';
import { SceneRegistry } from './scene-registry';
import { AssetRegistry } from './asset-registry';
import { ScriptRegistry } from './script-registry';

export interface ApplicationConfig {
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  graphicsDeviceOptions?: any;
  maxTextures?: number;
  mouse?: boolean;
  keyboard?: boolean;
  touch?: boolean;
  gamepad?: boolean;
  audio?: boolean;
  scripts?: boolean;
  assets?: boolean;
  scenes?: boolean;
}

export class Application extends EventEmitter {
  public canvas: HTMLCanvasElement;
  public graphicsDevice: GraphicsDevice;
  public inputManager: InputManager;
  public audioManager: AudioManager;
  public sceneRegistry: SceneRegistry;
  public assetRegistry: AssetRegistry;
  public scriptRegistry: ScriptRegistry;
  public timer: Timer;
  public resourceLoader: ResourceLoader;
  public tags: Tags;
  public platform: Platform;

  private _running: boolean = false;
  private _frameId: number | null = null;
  private _lastTime: number = 0;
  private _deltaTime: number = 0;
  private _targetFrameTime: number = 16.67; // 60 FPS

  constructor(config?: ApplicationConfig) {
    super();

    this.canvas = config?.canvas || document.createElement('canvas');
    this.canvas.width = config?.width || 800;
    this.canvas.height = config?.height || 600;

    this.graphicsDevice = new WebGLDevice(this.canvas, config?.graphicsDeviceOptions, config?.maxTextures);
    this.timer = new Timer();
    this.resourceLoader = new ResourceLoader();
    this.tags = new Tags();
    this.platform = new Platform();

    this.inputManager = new InputManager();
    if (config?.mouse !== false) {
      this.inputManager.mouse = new Mouse(this.canvas);
    }
    if (config?.keyboard !== false) {
      this.inputManager.keyboard = new Keyboard(window);
    }
    if (config?.touch !== false) {
      this.inputManager.touch = new Touch(this.canvas);
    }
    if (config?.gamepad !== false) {
      this.inputManager.gamepad = new Gamepad();
    }

    if (config?.audio !== false) {
      this.audioManager = new AudioManager();
    }

    if (config?.scenes !== false) {
      this.sceneRegistry = new SceneRegistry();
    }

    if (config?.assets !== false) {
      this.assetRegistry = new AssetRegistry();
    }

    if (config?.scripts !== false) {
      this.scriptRegistry = new ScriptRegistry();
    }

    this._bindEvents();
  }

  private _bindEvents(): void {
    window.addEventListener('resize', this._onResize.bind(this));
  }

  private _onResize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.graphicsDevice.setViewport(0, 0, rect.width, rect.height);
    this.emit('resize', rect.width, rect.height);
  }

  public start(): void {
    if (this._running) return;
    this._running = true;
    this._lastTime = performance.now();
    this._run();
    this.emit('start');
  }

  public stop(): void {
    if (!this._running) return;
    this._running = false;
    if (this._frameId !== null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
    this.emit('stop');
  }

  private _run(): void {
    if (!this._running) return;

    const now = performance.now();
    this._deltaTime = now - this._lastTime;
    this._lastTime = now;

    this.timer.update(this._deltaTime);
    this.inputManager.update();
    if (this.audioManager) {
      this.audioManager.update();
    }

    this.emit('update', this._deltaTime);

    this.graphicsDevice.clear();
    this.emit('render');

    this._frameId = requestAnimationFrame(() => this._run());
  }

  public get running(): boolean {
    return this._running;
  }

  public get deltaTime(): number {
    return this._deltaTime;
  }

  public get targetFrameTime(): number {
    return this._targetFrameTime;
  }

  public set targetFrameTime(value: number) {
    this._targetFrameTime = value;
  }
}
