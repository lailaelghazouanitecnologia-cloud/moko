import { Vec3 } from '../math/vec3';
import { Mat4 } from '../math/mat4';
import { GraphicsDevice } from '../graphics/index';
import { VertexBuffer } from '../graphics/vertex-buffer';
import { IndexBuffer } from '../graphics/index';
import { Material } from '../graphics/material';
import { PrimitiveType } from '../graphics/mesh';

export interface BatchGroup {
    name: string;
    materials: Material[];
    meshInstances: MeshInstance[];
    vertexBuffer: VertexBuffer;
    indexBuffer: IndexBuffer;
    primitiveType: PrimitiveType;
    vertexCount: number;
    indexCount: number;
}

export interface Batch {
    group: BatchGroup;
    worldMatrices: Mat4[];
    materials: Material[];
    boundingBox: {
        min: Vec3;
        max: Vec3;
    };
}

/**
 * Manages batching of mesh instances to reduce draw calls.
 * Groups mesh instances by material and mesh type for efficient rendering.
 */
export class BatchManager {
    private batches: Map<string, Batch> = new Map();
    private batchGroups: Map<string, BatchGroup> = new Map();
    private meshInstances: Map<string, MeshInstance> = new Map();
    private graphicsDevice: GraphicsDevice;
    private maxBatchSize: number = 65536;

    constructor(graphicsDevice: GraphicsDevice) {
        if (!graphicsDevice) {
            throw new Error('GraphicsDevice is required');
        }
        this.graphicsDevice = graphicsDevice;
    }

    /**
     * Adds a mesh instance to the batch manager for potential batching.
     * @param meshInstance - The mesh instance to add
     * @throws {Error} If meshInstance is invalid or missing required properties
     */
    addMeshInstance(meshInstance: MeshInstance): void {
        if (!meshInstance || !meshInstance.mesh || !meshInstance.material) {
            throw new Error('Invalid or incomplete mesh instance');
        }

        const mesh = meshInstance.mesh;
        const material = meshInstance.material;
        const key = this.generateBatchKey(material, mesh);

        if (!this.meshInstances.has(meshInstance.id)) {
            this.meshInstances.set(meshInstance.id, meshInstance);
        }

        let batchGroup = this.batchGroups.get(key);
        if (!batchGroup) {
            batchGroup = this.createBatchGroup(material, mesh);
            this.batchGroups.set(key, batchGroup);
        }

        this.addToBatchGroup(batchGroup, meshInstance);
    }

    /**
     * Removes a mesh instance from the batch manager.
     * @param meshInstance - The mesh instance to remove
     * @throws {Error} If meshInstance is invalid
     */
    removeMeshInstance(meshInstance: MeshInstance): void {
        if (!meshInstance || !meshInstance.id) {
            throw new Error('Invalid mesh instance');
        }

        const mesh = meshInstance.mesh;
        const material = meshInstance.material;
        const key = this.generateBatchKey(material, mesh);

        this.meshInstances.delete(meshInstance.id);

        const batchGroup = this.batchGroups.get(key);
        if (batchGroup) {
            const index = batchGroup.meshInstances.indexOf(meshInstance);
            if (index !== -1) {
                batchGroup.meshInstances.splice(index, 1);
            }

            if (batchGroup.meshInstances.length === 0) {
                this.destroyBatchGroup(batchGroup);
                this.batchGroups.delete(key);
            }
        }
    }

    /**
     * Updates the batch data based on current mesh instances.
     * Should be called after adding/removing mesh instances.
     */
    update(): void {
        this.batches.clear();

        for (const [key, batchGroup] of this.batchGroups) {
            if (batchGroup.meshInstances.length === 0) continue;

            const batch = this.createBatch(batchGroup);
            this.batches.set(key, batch);
        }
    }

    /**
     * Returns all current batches.
     * @returns Array of all batches
     */
    getBatches(): Batch[] {
        return Array.from(this.batches.values());
    }

    /**
     * Returns a specific batch by name.
     * @param name - The name of the batch to retrieve
     * @returns The batch or undefined if not found
     */
    getBatch(name: string): Batch | undefined {
        if (!name || typeof name !== 'string') {
            return undefined;
        }
        return this.batches.get(name);
    }

    /**
     * Clears all batches and groups.
     */
    clear(): void {
        for (const batchGroup of this.batchGroups.values()) {
            this.destroyBatchGroup(batchGroup);
        }
        this.batches.clear();
        this.batchGroups.clear();
        this.meshInstances.clear();
    }

    /**
     * Returns the number of active batches.
     */
    get batchCount(): number {
        return this.batches.size;
    }

    /**
     * Returns the number of active batch groups.
     */
    get groupCount(): number {
        return this.batchGroups.size;
    }

    /**
     * Returns the number of managed mesh instances.
     */
    get instanceCount(): number {
        return this.meshInstances.size;
    }

    private generateBatchKey(material: Material, mesh: Mesh): string {
        if (!material || !mesh) {
            throw new Error('Material and mesh are required for batch key generation');
        }
        const materialKey = material.id || 'default';
        const meshKey = mesh.id || 'default';
        return `${materialKey}_${meshKey}`;
    }

    private createBatchGroup(material: Material, mesh: Mesh): BatchGroup {
        if (!material || !mesh) {
            throw new Error('Material and mesh are required to create batch group');
        }

        const vertexBuffer = new VertexBuffer(this.graphicsDevice, mesh.vertexFormat, this.maxBatchSize);
        const indexBuffer = new IndexBuffer(this.graphicsDevice, this.maxBatchSize);

        return {
            name: this.generateBatchKey(material, mesh),
            materials: [material],
            meshInstances: [],
            vertexBuffer: vertexBuffer,
            indexBuffer: indexBuffer,
            primitiveType: mesh.primitiveType || PrimitiveType.TRIANGLES,
            vertexCount: 0,
            indexCount: 0
        };
    }

    private addToBatchGroup(batchGroup: BatchGroup, meshInstance: MeshInstance): void {
        if (!batchGroup || !meshInstance) {
            throw new Error('Batch group and mesh instance are required');
        }

        if (batchGroup.meshInstances.length >= this.maxBatchSize) {
            return;
        }

        batchGroup.meshInstances.push(meshInstance);
    }

    private createBatch(batchGroup: BatchGroup): Batch {
        if (!batchGroup || batchGroup.meshInstances.length === 0) {
            throw new Error('Invalid batch group');
        }

        const worldMatrices: Mat4[] = [];
        const min = new Vec3(Infinity, Infinity, Infinity);
        const max = new Vec3(-Infinity, -Infinity, -Infinity);

        for (const meshInstance of batchGroup.meshInstances) {
            if (!meshInstance || !meshInstance.worldMatrix) continue;

            worldMatrices.push(meshInstance.worldMatrix);
            
            const bounds = this.calculateBounds(meshInstance);
            min.x = Math.min(min.x, bounds.min.x);
            min.y = Math.min(min.y, bounds.min.y);
            min.z = Math.min(min.z, bounds.min.z);
            max.x = Math.max(max.x, bounds.max.x);
            max.y = Math.max(max.y, bounds.max.y);
            max.z = Math.max(max.z, bounds.max.z);
        }

        return {
            group: batchGroup,
            worldMatrices: worldMatrices,
            materials: batchGroup.materials,
            boundingBox: {
                min: min,
                max: max
            }
        };
    }

    private calculateBounds(meshInstance: MeshInstance): { min: Vec3; max: Vec3 } {
        if (!meshInstance || !meshInstance.mesh) {
            return {
                min: new Vec3(0, 0, 0),
                max: new Vec3(0, 0, 0)
            };
        }

        const mesh = meshInstance.mesh;
        const worldMatrix = meshInstance.worldMatrix;

        const positions = mesh.getPositions();
        if (!positions || positions.length === 0) {
            return {
                min: new Vec3(0, 0, 0),
                max: new Vec3(0, 0, 0)
            };
        }

        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (let i = 0; i < positions.length; i += 3) {
            const localPos = new Vec3(positions[i], positions[i + 1], positions[i + 2]);
            const worldPos = new Vec3();
            worldMatrix.transformPoint(localPos, worldPos);

            minX = Math.min(minX, worldPos.x);
            minY = Math.min(minY, worldPos.y);
            minZ = Math.min(minZ, worldPos.z);
            maxX = Math.max(maxX, worldPos.x);
            maxY = Math.max(maxY, worldPos.y);
            maxZ = Math.max(maxZ, worldPos.z);
        }

        return {
            min: new Vec3(minX, minY, minZ),
            max: new Vec3(maxX, maxY, maxZ)
        };
    }

    private destroyBatchGroup(batchGroup: BatchGroup): void {
        if (!batchGroup) return;

        if (batchGroup.vertexBuffer && batchGroup.vertexBuffer.destroy) {
            batchGroup.vertexBuffer.destroy();
        }
        if (batchGroup.indexBuffer && batchGroup.indexBuffer.destroy) {
            batchGroup.indexBuffer.destroy();
        }
    }
}

class Mesh {
    id?: string;
    vertexFormat: any;
    primitiveType: PrimitiveType;
    private positions?: number[];

    constructor(vertexFormat: any, primitiveType: PrimitiveType = PrimitiveType.TRIANGLES) {
        this.vertexFormat = vertexFormat;
        this.primitiveType = primitiveType;
    }

    getPositions(): number[] | undefined {
        return this.positions;
    }

    setPositions(positions: number[]): void {
        this.positions = positions;
    }
}

class Material {
    id?: string;

    constructor(id?: string) {
        this.id = id;
    }
}

class MeshInstance {
    id: string;
    mesh: Mesh;
    material: Material;
    worldMatrix: Mat4;

    constructor(mesh: Mesh, material: Material) {
        if (!mesh || !material) {
            throw new Error('Mesh and material are required');
        }
        this.id = this.generateId();
        this.mesh = mesh;
        this.material = material;
        this.worldMatrix = new Mat4();
    }

    private generateId(): string {
        return 'mesh_' + Math.random().toString(36).substr(2, 9);
    }
}
