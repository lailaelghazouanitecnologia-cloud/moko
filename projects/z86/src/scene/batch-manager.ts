import { EventEmitter } from '../core';
import { Vec3, Mat4 } from '../math';
import { GraphicsDevice, VertexBuffer, IndexBuffer, Shader, Texture, Material, Mesh, MeshInstance } from '../graphics';
import { GraphNode } from './graph-node';
import { Entity } from './entity';
import { Component } from './component';
import { ComponentSystem } from './component-system';
import { Camera } from './camera';
import { Light } from './light';
import { MeshRenderer } from './mesh-renderer';
import { Scene } from './scene';
import { ForwardRenderer } from './forward-renderer';

export class BatchManager extends EventEmitter {
    private device: GraphicsDevice;
    private batches: Map<string, BatchGroup>;
    private meshInstances: MeshInstance[];
    private materials: Material[];
    private shaders: Map<string, Shader>;
    private textures: Map<string, Texture>;
    private vertexBuffers: Map<string, VertexBuffer>;
    private indexBuffers: Map<string, IndexBuffer>;
    private dirty: boolean;
    private maxBatchSize: number;
    private batchCount: number;

    constructor(device: GraphicsDevice) {
        super();
        this.device = device;
        this.batches = new Map();
        this.meshInstances = [];
        this.materials = [];
        this.shaders = new Map();
        this.textures = new Map();
        this.vertexBuffers = new Map();
        this.indexBuffers = new Map();
        this.dirty = true;
        this.maxBatchSize = 65536;
        this.batchCount = 0;
    }

    addMesh(mesh: Mesh, material: Material, node: GraphNode): void {
        const meshInstance = new MeshInstance(mesh, material, node);
        this.meshInstances.push(meshInstance);
        this.dirty = true;
    }

    removeMesh(mesh: Mesh): void {
        this.meshInstances = this.meshInstances.filter(instance => instance.mesh !== mesh);
        this.dirty = true;
    }

    addMeshInstance(meshInstance: MeshInstance): void {
        this.meshInstances.push(meshInstance);
        this.dirty = true;
    }

    removeMeshInstance(meshInstance: MeshInstance): void {
        const index = this.meshInstances.indexOf(meshInstance);
        if (index !== -1) {
            this.meshInstances.splice(index, 1);
            this.dirty = true;
        }
    }

    update(scene: Scene): void {
        if (!this.dirty) return;

        this.batches.clear();
        this.batchCount = 0;

        const groups = new Map<string, MeshInstance[]>();

        for (const instance of this.meshInstances) {
            if (!instance.visible) continue;

            const key = this.generateBatchKey(instance);
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(instance);
        }

        for (const [key, instances] of groups) {
            const batchGroup = new BatchGroup();
            batchGroup.material = instances[0].material;
            batchGroup.shader = this.getShader(instances[0].material);
            batchGroup.instances = instances;
            batchGroup.vertexBuffer = this.createVertexBuffer(instances);
            batchGroup.indexBuffer = this.createIndexBuffer(instances);
            batchGroup.worldTransforms = instances.map(i => i.node.getWorldTransform());
            batchGroup.count = instances.length;

            this.batches.set(key, batchGroup);
            this.batchCount++;
        }

        this.dirty = false;
    }

    render(camera: Camera, renderer: ForwardRenderer): void {
        for (const [key, batch] of this.batches) {
            if (batch.count === 0) continue;

            this.device.setShader(batch.shader);
            this.device.setVertexBuffer(batch.vertexBuffer);
            this.device.setIndexBuffer(batch.indexBuffer);

            if (batch.material) {
                batch.material.bind();
            }

            for (let i = 0; i < batch.count; i++) {
                const transform = batch.worldTransforms[i];
                this.device.scope.setValue('matrix_model', transform.data);
                this.device.draw(batch.indexBuffer.getCount());
            }
        }
    }

    clear(): void {
        this.batches.clear();
        this.meshInstances.length = 0;
        this.materials.length = 0;
        this.shaders.clear();
        this.textures.clear();
        this.vertexBuffers.clear();
        this.indexBuffers.clear();
        this.batchCount = 0;
        this.dirty = true;
    }

    getBatchCount(): number {
        return this.batchCount;
    }

    getMaxBatchSize(): number {
        return this.maxBatchSize;
    }

    setMaxBatchSize(size: number): void {
        this.maxBatchSize = Math.max(1, size);
        this.dirty = true;
    }

    isDirty(): boolean {
        return this.dirty;
    }

    markDirty(): void {
        this.dirty = true;
    }

    private generateBatchKey(instance: MeshInstance): string {
        const materialId = instance.material ? instance.material.id : 'default';
        const meshId = instance.mesh.id;
        const shaderId = instance.material && instance.material.shader ? instance.material.shader.id : 'default';
        return `${materialId}_${meshId}_${shaderId}`;
    }

    private getShader(material: Material): Shader {
        if (!material || !material.shader) {
            throw new Error('Material or shader is null');
        }
        return material.shader;
    }

    private createVertexBuffer(instances: MeshInstance[]): VertexBuffer {
        const totalVertices = instances.reduce((sum, instance) => sum + instance.mesh.vertexBuffer.getCount(), 0);
        const format = instances[0].mesh.vertexBuffer.getFormat();
        const buffer = new VertexBuffer(this.device, format, totalVertices);
        
        let offset = 0;
        for (const instance of instances) {
            const srcBuffer = instance.mesh.vertexBuffer;
            const data = new Float32Array(srcBuffer.getCount() * format.size / 4);
            srcBuffer.read(data);
            buffer.write(data, offset);
            offset += srcBuffer.getCount() * format.size;
        }

        return buffer;
    }

    private createIndexBuffer(instances: MeshInstance[]): IndexBuffer {
        const totalIndices = instances.reduce((sum, instance) => sum + instance.mesh.indexBuffer.getCount(), 0);
        const buffer = new IndexBuffer(this.device, totalIndices, true);
        
        let offset = 0;
        let vertexOffset = 0;
        for (const instance of instances) {
            const srcBuffer = instance.mesh.indexBuffer;
            const data = new Uint16Array(srcBuffer.getCount());
            srcBuffer.read(data);
            
            for (let i = 0; i < data.length; i++) {
                data[i] += vertexOffset;
            }
            
            buffer.write(data, offset);
            offset += data.length * 2;
            vertexOffset += instance.mesh.vertexBuffer.getCount();
        }

        return buffer;
    }
}

class BatchGroup {
    material: Material | null = null;
    shader: Shader | null = null;
    instances: MeshInstance[] = [];
    vertexBuffer: VertexBuffer | null = null;
    indexBuffer: IndexBuffer | null = null;
    worldTransforms: Mat4[] = [];
    count: number = 0;
}
