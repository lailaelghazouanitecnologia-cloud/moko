import { Entity } from './entity';
import { Camera } from './index';
import { Light } from './light';
import { MeshRenderer } from './mesh-renderer';
import { BatchManager } from './index';
import { ForwardRenderer } from './index';
import { Timer } from '../core/timer';
import { ResourceLoader } from '../core/resource-loader';
import { Tags } from '../core/tags';
import { ComponentSystem } from './index';
import { GraphicsDevice } from '../graphics/index';

/**
 * A scene is a container for entities and their components.
 * It manages the life-cycle of entities, updates component systems,
 * and orchestrates rendering.
 */
export class Scene {
  private name: string;
  private root: Entity;
  private newRoot: Entity;
  private cameras: Camera[] = [];
  private lights: Light[] = [];
  private renderers: MeshRenderer[] = [];
  private batchManager: BatchManager;
  private forwardRenderer: ForwardRenderer;
  private loaded: boolean = false;
  private timer: Timer;
  private resourceLoader: ResourceLoader;
  private tags: Tags;
  private componentSystems: Map<string, ComponentSystem> = new Map();
  private entities: Map<string, Entity> = new Map();
  private trash: Set<Entity> = new Set();

  /**
   * Creates a new Scene.
   * @param name - The name of the scene.
   */
  constructor(name: string = 'Scene') {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Scene name must be a non-empty string');
    }
    this.name = name.trim();
    this.root = new Entity('Root');
    this.newRoot = new Entity('NewRoot');
    this.timer = new Timer();
    this.resourceLoader = new ResourceLoader();
    this.tags = new Tags();
    this.batchManager = new BatchManager();
    this.forwardRenderer = new ForwardRenderer();
  }

  /**
   * Adds an entity to the scene.
   * The entity will be registered on the next flush.
   * @param entity - The entity to add.
   * @throws {Error} If entity is not an instance of Entity.
   */
  addEntity(entity: Entity): void {
    if (!(entity instanceof Entity)) {
      throw new Error('Expected entity to be an instance of Entity');
    }
    this.newRoot.addChild(entity);
  }

  /**
   * Moves all entities from the staging root to the active root and registers them.
   */
  flush(): void {
    const children = [...this.newRoot.children];
    for (const child of children) {
      this.newRoot.removeChild(child);
      this.root.addChild(child);
      this.registerEntity(child as Entity);
    }
  }

  /**
   * Recursively registers an entity and its descendants in the entities map.
   * @param entity - The entity to register.
   * @private
   */
  private registerEntity(entity: Entity): void {
    if (!(entity instanceof Entity)) {
      throw new Error('Expected entity to be an instance of Entity');
    }
    this.entities.set(entity.guid, entity);
    for (const child of entity.children) {
      this.registerEntity(child as Entity);
    }
  }

  /**
   * Resets the scene to its initial state, clearing all entities and systems.
   */
  reset(): void {
    this.root = new Entity('Root');
    this.newRoot = new Entity('NewRoot');
    this.entities.clear();
    this.cameras = [];
    this.lights = [];
    this.renderers = [];
    this.trash.clear();
    this.loaded = false;
  }

  /**
   * Checks if there are new entities that have not been flushed yet.
   * @returns True if there are new entities.
   */
  hasNewEntities(): boolean {
    return this.newRoot.children.length > 0;
  }

  /**
   * Marks an entity for deletion on the next cleanTrash call.
   * @param entity - The entity to delete.
   * @throws {Error} If entity is not an instance of Entity.
   */
  deleteEntity(entity: Entity): void {
    if (!(entity instanceof Entity)) {
      throw new Error('Expected entity to be an instance of Entity');
    }
    this.trash.add(entity);
  }

  /**
   * Removes all entities marked for deletion and cleans their references.
   */
  cleanTrash(): void {
    for (const entity of this.trash) {
      this.removeEntityRecursive(entity);
    }
    this.trash.clear();
  }

  /**
   * Recursively removes an entity and its children from the scene.
   * @param entity - The entity to remove.
   * @private
   */
  private removeEntityRecursive(entity: Entity): void {
    if (!(entity instanceof Entity)) {
      throw new Error('Expected entity to be an instance of Entity');
    }
    for (const child of entity.children) {
      this.removeEntityRecursive(child as Entity);
    }
    this.entities.delete(entity.guid);
    this.removeFromLists(entity);
    if (entity.parent) {
      entity.parent.removeChild(entity);
    }
  }

  /**
   * Removes an entity's components from the respective tracking arrays.
   * @param entity - The entity whose components to remove.
   * @private
   */
  private removeFromLists(entity: Entity): void {
    if (!(entity instanceof Entity)) {
      throw new Error('Expected entity to be an instance of Entity');
    }
    const camera = entity.getComponent('camera') as Camera;
    if (camera) {
      const idx = this.cameras.indexOf(camera);
      if (idx !== -1) this.cameras.splice(idx, 1);
    }
    const light = entity.getComponent('light') as Light;
    if (light) {
      const idx = this.lights.indexOf(light);
      if (idx !== -1) this.lights.splice(idx, 1);
    }
    const renderer = entity.getComponent('meshRenderer') as MeshRenderer;
    if (renderer) {
      const idx = this.renderers.indexOf(renderer);
      if (idx !== -1) this.renderers.splice(idx, 1);
    }
  }

  /**
   * Updates the scene and all its systems.
   * @param dt - Delta time in seconds.
   * @throws {Error} If dt is not a finite number.
   */
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) {
      throw new Error('dt must be a non-negative finite number');
    }
    this.timer.update();
    this.flush();
    this.cleanTrash();
    this.updateComponentSystems(dt);
    this.updateTransforms();
    this.collectRenderables();
  }

  /**
   * Updates all registered component systems.
   * @param dt - Delta time in seconds.
   * @private
   */
  private updateComponentSystems(dt: number): void {
    if (!Number.isFinite(dt) || dt < 0) {
      throw new Error('dt must be a non-negative finite number');
    }
    for (const system of this.componentSystems.values()) {
      system.update(dt);
    }
  }

  /**
   * Updates the world transforms of the entity hierarchy.
   * @private
   */
  private updateTransforms(): void {
    this.root.updateWorldTransform();
  }

  /**
   * Collects all renderable components from the entity hierarchy.
   * @private
   */
  private collectRenderables(): void {
    this.cameras = [];
    this.lights = [];
    this.renderers = [];
    this.collectRenderablesRecursive(this.root);
  }

  /**
   * Recursively collects renderable components from an entity and its children.
   * @param node - The entity node to start collecting from.
   * @private
   */
  private collectRenderablesRecursive(node: Entity): void {
    if (!(node instanceof Entity)) {
      throw new Error('Expected node to be an instance of Entity');
    }
    if (!node.enabled) return;
    const camera = node.getComponent('camera') as Camera;
    if (camera && camera.enabled) this.cameras.push(camera);
    const light = node.getComponent('light') as Light;
    if (light && light.enabled) this.lights.push(light);
    const renderer = node.getComponent('meshRenderer') as MeshRenderer;
    if (renderer && renderer.enabled) this.renderers.push(renderer);
    for (const child of node.children) {
      this.collectRenderablesRecursive(child as Entity);
    }
  }

  /**
   * Renders the scene using the provided graphics device.
   * @param device - The graphics device to render with.
   * @throws {Error} If device is not an instance of GraphicsDevice.
   */
  render(device: GraphicsDevice): void {
    if (!(device instanceof GraphicsDevice)) {
      throw new Error('Expected device to be an instance of GraphicsDevice');
    }
    if (!this.loaded) return;
    this.forwardRenderer.render(device, this.cameras, this.lights, this.renderers, this.batchManager);
  }

  /**
   * Registers a component system to be updated during scene updates.
   * @param system - The system to register.
   * @throws {Error} If system is not an instance of ComponentSystem.
   */
  registerComponentSystem(system: ComponentSystem): void {
    if (!(system instanceof ComponentSystem)) {
      throw new Error('Expected system to be an instance of ComponentSystem');
    }
    this.componentSystems.set(system.id, system);
  }

  /**
   * Finds an entity by name.
   * @param name - The name of the entity to find.
   * @returns The entity if found, otherwise undefined.
   * @throws {Error} If name is not a non-empty string.
   */
  getEntity(name: string): Entity | undefined {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Entity name must be a non-empty string');
    }
    for (const entity of this.entities.values()) {
      if (entity.name === name) return entity;
    }
    return undefined;
  }

  /**
   * Finds an entity by its GUID.
   * @param guid - The GUID of the entity.
   * @returns The entity if found, otherwise undefined.
   * @throws {Error} If guid is not a non-empty string.
   */
  getEntityByGuid(guid: string): Entity | undefined {
    if (typeof guid !== 'string' || guid.trim().length === 0) {
      throw new Error('GUID must be a non-empty string');
    }
    return this.entities.get(guid);
  }

  /**
   * Finds the first entity with the specified tag.
   * @param tag - The tag to search for.
   * @returns The first entity with the tag, or undefined if none found.
   * @throws {Error} If tag is not a non-empty string.
   */
  findEntityByTag(tag: string): Entity | undefined {
    if (typeof tag !== 'string' || tag.trim().length === 0) {
      throw new Error('Tag must be a non-empty string');
    }
    for (const entity of this.entities.values()) {
      if (entity.tags.has(tag)) return entity;
    }
    return undefined;
  }

  /**
   * Finds all entities with the specified tag.
   * @param tag - The tag to search for.
   * @returns An array of entities with the tag.
   * @throws {Error} If tag is not a non-empty string.
   */
  getEntitiesByTag(tag: string): Entity[] {
    if (typeof tag !== 'string' || tag.trim().length === 0) {
      throw new Error('Tag must be a non-empty string');
    }
    const result: Entity[] = [];
    for (const entity of this.entities.values()) {
      if (entity.tags.has(tag)) result.push(entity);
    }
    return result;
  }

  /**
   * Sets the loaded state of the scene.
   * @param loaded - True if the scene is loaded.
   */
  setLoaded(loaded: boolean): void {
    this.loaded = Boolean(loaded);
  }

  /**
   * Gets the loaded state of the scene.
   * @returns True if the scene is loaded.
   */
  getLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Gets the name of the scene.
   * @returns The name of the scene.
   */
  getName(): string {
    return this.name;
  }

  /**
   * Sets the name of the scene.
   * @param name - The new name for the scene.
   * @throws {Error} If name is not a non-empty string.
   */
  setName(name: string): void {
    if (typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Scene name must be a non-empty string');
    }
    this.name = name.trim();
  }

  /**
   * Gets the root entity of the scene hierarchy.
   * @returns The root entity.
   */
  getRoot(): Entity {
    this.flush();
    return this.root;
  }

  /**
   * Gets the cameras in the scene.
   * @returns An array of Camera components.
   */
  getCameras(): Camera[] {
    return this.cameras;
  }

  /**
   * Gets the lights in the scene.
   * @returns An array of Light components.
   */
  getLights(): Light[] {
    return this.lights;
  }

  /**
   * Gets the renderers in the scene.
   * @returns An array of MeshRenderer components.
   */
  getRenderers(): MeshRenderer[] {
    return this.renderers;
  }

  /**
   * Gets the batch manager for the scene.
   * @returns The BatchManager instance.
   */
  getBatchManager(): BatchManager {
    return this.batchManager;
  }

  /**
   * Gets the forward renderer for the scene.
   * @returns The ForwardRenderer instance.
   */
  getForwardRenderer(): ForwardRenderer {
    return this.forwardRenderer;
  }

  /**
   * Gets the timer for the scene.
   * @returns The Timer instance.
   */
  getTimer(): Timer {
    return this.timer;
  }

  /**
   * Gets the resource loader for the scene.
   * @returns The ResourceLoader instance.
   */
  getResourceLoader(): ResourceLoader {
    return this.resourceLoader;
  }

  /**
   * Gets the tags manager for the scene.
   * @returns The Tags instance.
   */
  getTags(): Tags {
    return this.tags;
  }
}
