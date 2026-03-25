import { Material } from '../graphics/material';
import { Entity } from './entity';
import { MeshRenderer } from './mesh-renderer';
import { Scene } from './scene';

/**
 * Groups renderable entities by material for efficient draw calls.
 */
export class BatchManager {
    private batches: Map<Material, Entity[]>;
    private dirty: boolean;
    private scene: Scene;

    constructor(scene: Scene) {
        if (!scene) {
            throw new Error('BatchManager requires a valid Scene');
        }
        this.batches = new Map<Material, Entity[]>();
        this.dirty = false;
        this.scene = scene;
    }

    /**
     * Adds an entity to the appropriate material batch.
     * @param entity The entity to add.
     */
    add(entity: Entity): void {
        if (!entity || !(entity instanceof Entity)) {
            return;
        }

        const meshRenderer = entity.getComponent(MeshRenderer);
        if (!meshRenderer) return;

        const material = meshRenderer.material;
        if (!material) return;

        let batch = this.batches.get(material);
        if (!batch) {
            batch = [];
            this.batches.set(material, batch);
        }

        if (!batch.includes(entity)) {
            batch.push(entity);
            this.dirty = true;
        }
    }

    /**
     * Removes an entity from its material batch.
     * @param entity The entity to remove.
     */
    remove(entity: Entity): void {
        if (!entity || !(entity instanceof Entity)) {
            return;
        }

        const meshRenderer = entity.getComponent(MeshRenderer);
        if (!meshRenderer) return;

        const material = meshRenderer.material;
        if (!material) return;

        const batch = this.batches.get(material);
        if (!batch) return;

        const index = batch.indexOf(entity);
        if (index !== -1) {
            batch.splice(index, 1);
            if (batch.length === 0) {
                this.batches.delete(material);
            }
            this.dirty = true;
        }
    }

    /**
     * Rebuilds all batches from the current scene entities.
     */
    rebuild(): void {
        this.batches.clear();
        this.dirty = false;

        if (!this.scene || !this.scene.root) {
            return;
        }

        const entities = this.scene.root.getComponents(Entity);
        if (!entities) return;

        for (const entity of entities) {
            this.add(entity);
        }
    }

    /**
     * Retrieves the array of entities associated with a given material.
     * @param material The material to lookup.
     * @returns An array of entities using the material, or an empty array if none found.
     */
    getBatch(material: Material): Entity[] {
        if (!material) {
            return [];
        }
        return this.batches.get(material) || [];
    }

    /**
     * Clears all batches and resets the dirty flag.
     */
    clear(): void {
        this.batches.clear();
        this.dirty = false;
    }

    /**
     * Marks the batch manager as dirty, indicating a rebuild may be required.
     */
    markDirty(): void {
        this.dirty = true;
    }

    /**
     * Checks whether the batch manager is dirty.
     * @returns True if dirty, false otherwise.
     */
    isDirty(): boolean {
        return this.dirty;
    }

    /**
     * Returns the number of materials currently batched.
     * @returns The number of materials.
     */
    getBatchCount(): number {
        return this.batches.size;
    }

    /**
     * Returns the total number of entities across all batches.
     * @returns The total number of entities.
     */
    getTotalEntityCount(): number {
        let count = 0;
        for (const batch of this.batches.values()) {
            count += batch.length;
        }
        return count;
    }

    /**
     * Returns an array of all materials currently in batches.
     * @returns An array of materials.
     */
    getMaterials(): Material[] {
        return Array.from(this.batches.keys());
    }

    /**
     * Returns an array of all entities across all batches.
     * @returns An array of entities.
     */
    getAllEntities(): Entity[] {
        const entities: Entity[] = [];
        for (const batch of this.batches.values()) {
            entities.push(...batch);
        }
        return entities;
    }
}