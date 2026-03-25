import { Entity } from './entity';
import { Camera } from './camera';
import { Light } from './light';
import { ComponentSystem } from './component-system';
import { BatchManager } from './batch-manager';
import { ForwardRenderer } from './index';

/**
 * Container for entities and systems.
 */
export class Scene {
    root: Entity;
    cameras: Camera[];
    lights: Light[];
    systems: ComponentSystem[];
    batches: BatchManager;

    /**
     * Creates a new Scene.
     */
    constructor() {
        this.root = new Entity('Root');
        this.cameras = [];
        this.lights = [];
        this.systems = [];
        this.batches = new BatchManager(this);
    }

    /**
     * Attach an entity to the scene.
     * @param entity - The entity to add.
     * @throws {TypeError} If entity is not an instance of Entity.
     */
    addEntity(entity: Entity): void {
        if (!(entity instanceof Entity)) {
            throw new TypeError('Expected entity to be an instance of Entity');
        }
        this.root = this.root || new Entity('Root');
        this.root.node.addChild(entity.node);
    }

    /**
     * Detach an entity from the scene.
     * @param entity - The entity to remove.
     * @throws {TypeError} If entity is not an instance of Entity.
     */
    removeEntity(entity: Entity): void {
        if (!(entity instanceof Entity)) {
            throw new TypeError('Expected entity to be an instance of Entity');
        }
        if (!this.root) {
            return;
        }
        this.root.node.removeChild(entity.node);
    }

    /**
     * Register a camera with the scene.
     * @param camera - The camera to register.
     * @throws {TypeError} If camera is not an instance of Camera.
     */
    addCamera(camera: Camera): void {
        if (!(camera instanceof Camera)) {
            throw new TypeTypeError('Expected camera to be an instance of Camera');
        }
        if (!this.cameras) {
            this.cameras = [];
        }
        if (!this.cameras.includes(camera)) {
            this.cameras.push(camera);
        }
    }

    /**
     * Unregister a camera from the scene.
     * @param camera - The camera to unregister.
     * @throws {TypeError} If camera is not an instance of Camera.
     */
    removeCamera(camera: Camera): void {
        if (!(camera instanceof Camera)) {
            throw new TypeError('Expected camera to be an instance of Camera');
        }
        if (!this.cameras) {
            return;
        }
        const index = this.cameras.indexOf(camera);
        if (index !== -1) {
            this.cameras.splice(index, 1);
        }
    }

    /**
     * Register a light with the scene.
     * @param light - The light to register.
     * @throws {TypeError} If light is not an instance of Light.
     */
    addLight(light: Light): void {
        if (!(light instanceof Light)) {
            throw new TypeError('Expected light to be an instance of Light');
        }
        if (!this.lights) {
            this.lights = [];
        }
        if (!this.lights.includes(light)) {
            this.lights.push(light);
        }
    }

    /**
     * Unregister a light from the scene.
     * @param light - The light to unregister.
     * @throws {TypeError} If light is not an instance of Light.
     */
    removeLight(light: Light): void {
        if (!(light instanceof Light)) {
            throw new TypeError('Expected light to be an instance of Light');
        }
        if (!this.llights) {
            return;
        }
        const index = this.lights.indexOf(light);
        if (index !== -1) {
            this.lights.splice(index, 1);
        }
    }

    /**
     * Update all systems in the scene.
     * @param dt - Delta time in seconds.
     * @throws {TypeError} If dt is not a number.
     */
    update(dt: number): void {
        if (typeof dt !== 'number' || isNaN(dt) || !isFinite(dt)) {
            throw new TypeError('Expected dt to be a finite number');
        }
        if (!this.systems) {
            this.systems = [];
        }
        for (const system of this.systems) {
            if (system && typeof system.update === 'function') {
                system.update(dt);
            }
        }
    }

    /**
     * Render the scene using the provided renderer.
     * @param renderer - The renderer to use.
     * @throws {TypeError} If renderer is not an instance of ForwardRenderer.
     */
    render(renderer: ForwardRenderer): void {
        if (!(renderer instanceof ForwardRenderer)) {
            throw new TypeError('Expected renderer to be an instance of ForwardRenderer');
        }
        if (renderer && typeof renderer.render === 'function') {
            renderer.render(this);
        }
    }
}