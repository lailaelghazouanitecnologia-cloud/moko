import { Camera } from './camera';
import { Light } from './light';
import { MeshRenderer } from './mesh-renderer';
import { BatchManager } from './batch-manager';
import { Scene } from '../scene';

/**
 * Forward rendering pipeline implementation.
 * Handles light collection, render queue management, and drawing of mesh renderers.
 */
export class ForwardRenderer {
  private camera: Camera;
  private lightList: Light[];
  private renderQueue: MeshRenderer[];
  private batcher: BatchManager;

  constructor() {
    this.camera = null as any;
    this.lightList = [];
    this.renderQueue = [];
    this.batcher = new BatchManager(null as any);
  }

  /**
   * Render the entire scene using forward rendering.
   * @param scene - The scene to render
   * @throws {Error} If scene is null or undefined
   */
  render(scene: Scene): void {
    if (!scene) {
      throw new Error('Scene cannot be null or undefined');
    }

    try {
      this.collectLights(scene);
      this.queueRenderers(scene as any);
      this.sortQueue();
      this.bindLights(this.lightList);
      
      for (const renderer of this.renderQueue) {
        this.draw(renderer);
      }
      
      this.finalize();
    } catch (error) {
      console.error('Error during forward rendering:', error);
      this.finalize(); // Ensure cleanup even on error
      throw error;
    }
  }

  /**
   * Update the camera used for rendering.
   * @param cam - The camera to use
   * @throws {Error} If camera is null or undefined
   */
  setCamera(cam: Camera): void {
    if (!cam) {
      throw new Error('Camera cannot be null or undefined');
    }
    this.camera = cam;
  }

  /**
   * Gather lights from the scene.
   * @param scene - The scene to collect lights from
   * @returns Array of lights in the scene
   * @throws {Error} If scene is null or undefined
   */
  collectLights(scene: Scene): Light[] {
    if (!scene) {
      throw new Error('Scene cannot be null or undefined');
    }
    
    this.lightList = scene.lights || [];
    return this.lightList;
  }

  /**
   * Queue draw calls for mesh renderers.
   * @param renderers - Array of mesh renderers to queue
   * @throws {Error} If renderers is null or undefined
   */
  queueRenderers(renderers: MeshRenderer[]): void {
    if (!renderers) {
      throw new Error('Renderers array cannot be null or undefined');
    }
    this.renderQueue = [...renderers];
  }

  /**
   * Sort the render queue by layer.
   */
  sortQueue(): void {
    if (!this.renderQueue) {
      this.renderQueue = [];
      return;
    }

    this.renderQueue.sort((a, b) => {
      const aLayer = (a as any).layer || 0;
      const bLayer = (b as any).layer || 0;
      return aLayer - bLayer;
    });
  }

  /**
   * Bind light data to shader uniforms.
   * @param lights - Array of lights to bind
   * @throws {Error} If lights array is null or undefined
   */
  bindLights(lights: Light[]): void {
    if (!lights) {
      throw new Error('Lights array cannot be null or undefined');
    }

    // Implementation would bind light data to shader uniforms
    // This is a simplified version
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      if (!light) {
        console.warn(`Light at index ${i} is null or undefined`);
        continue;
      }
      // Bind light properties to shader uniforms
      // Example: shader.setUniform(`u_lightColor[${i}]`, light.color);
    }
  }

  /**
   * Draw a mesh renderer.
   * @param renderer - The mesh renderer to draw
   * @throws {Error} If renderer is null or undefined
   */
  draw(renderer: MeshRenderer): void {
    if (!renderer) {
      throw new Error('Renderer cannot be null or undefined');
    }

    if (!this.camera) {
      console.warn('Cannot draw: camera is not set');
      return;
    }
    
    const mesh = (renderer as any).mesh;
    const material = (renderer as any).material;
    
    if (!mesh || !material) {
      console.warn('Cannot draw: mesh or material is missing');
      return;
    }
    
    // Set up shader and render state
    const shader = material.shader;
    if (shader) {
      try {
        shader.bind();
        // Set uniforms for camera, lights, material properties
        // Draw the mesh
        mesh.draw();
      } catch (error) {
        console.error('Error drawing mesh:', error);
      }
    } else {
      console.warn('Cannot draw: material has no shader');
    }
  }

  /**
   * Cleanup render state and unbind resources.
   */
  finalize(): void {
    // Cleanup render state, unbind resources
    this.renderQueue = [];
  }

  /**
   * Get the current camera.
   * @returns The current camera or null if not set
   */
  getCamera(): Camera | null {
    return this.camera;
  }

  /**
   * Get the current light list.
   * @returns Array of lights
   */
  getLights(): Light[] {
    return [...this.lightList];
  }

  /**
   * Get the current render queue.
   * @returns Array of mesh renderers in the queue
   */
  getRenderQueue(): MeshRenderer[] {
    return [...this.renderQueue];
  }

  /**
   * Clear the render queue.
   */
  clearQueue(): void {
    this.renderQueue = [];
  }

  /**
   * Check if the renderer is ready to render.
   * @returns True if camera is set and ready
   */
  isReady(): boolean {
    return !!this.camera;
  }

  /**
   * Get the number of lights currently collected.
   * @returns Number of lights
   */
  getLightCount(): number {
    return this.lightList.length;
  }

  /**
   * Get the number of renderers in the queue.
   * @returns Number of renderers
   */
  getQueueLength(): number {
    return this.renderQueue.length;
  }
}