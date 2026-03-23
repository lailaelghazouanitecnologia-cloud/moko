import { Mat4, BoundingBox } from '../math';
import { Mesh } from './mesh';
import { Material } from './material';
import { Node } from './node';

export class MeshInstance {
    mesh: Mesh;
    material: Material;
    node: Node;
    worldBounds: BoundingBox;
    visible: boolean;
    cull: boolean;
    renderStyle: number;
    castShadows: boolean;
    receiveShadows: boolean;
    drawOrder: number;

    constructor(mesh: Mesh, material: Material) {
        this.mesh = mesh;
        this.material = material;
        this.node = null as any;
        this.worldBounds = new BoundingBox();
        this.visible = true;
        this.cull = true;
        this.renderStyle = 0;
        this.castShadows = true;
        this.receiveShadows = true;
        this.drawOrder = 0;
    }

    setNode(node: Node): void {
        this.node = node;
    }

    getWorldBounds(): BoundingBox {
        if (!this.node) {
            return this.worldBounds;
        }
        const worldTransform = this.node.getWorldTransform();
        const meshAabb = this.mesh.aabb;
        const min = meshAabb.min.clone();
        const max = meshAabb.max.clone();
        const corners = [
            new Float32Array([min.x, min.y, min.z, 1]),
            new Float32Array([max.x, min.y, min.z, 1]),
            new Float32Array([min.x, max.y, min.z, 1]),
            new Float32Array([max.x, max.y, min.z, 1]),
            new Float32Array([min.x, min.y, max.z, 1]),
            new Float32Array([max.x, min.y, max.z, 1]),
            new Float32Array([min.x, max.y, max.z, 1]),
            new Float32Array([max.x, max.y, max.z, 1])
        ];
        const transformedCorners = corners.map(corner => {
            const result = new Float32Array(4);
            const m = worldTransform.data;
            result[0] = m[0] * corner[0] + m[4] * corner[1] + m[8] * corner[2] + m[12] * corner[3];
            result[1] = m[1] * corner[0] + m[5] * corner[1] + m[9] * corner[2] + m[13] * corner[3];
            result[2] = m[2] * corner[0] + m[6] * corner[1] + m[10] * corner[2] + m[14] * corner[3];
            result[3] = m[3] * corner[0] + m[7] * corner[1] + m[11] * corner[2] + m[15] * corner[3];
            return new Float32Array([result[0] / result[3], result[1] / result[3], result[2] / result[3]]);
        });
        const worldMin = new Float32Array([Infinity, Infinity, Infinity]);
        const worldMax = new Float32Array([-Infinity, -Infinity, -Infinity]);
        for (const corner of transformedCorners) {
            worldMin[0] = Math.min(worldMin[0], corner[0]);
            worldMin[1] = Math.min(worldMin[1], corner[1]);
            worldMin[2] = Math.min(worldMin[2], corner[2]);
            worldMax[0] = Math.max(worldMax[0], corner[0]);
            worldMax[1] = Math.max(worldMax[1], corner[1]);
            worldMax[2] = Math.max(worldMax[2], corner[2]);
        }
        this.worldBounds.min.set(worldMin[0], worldMin[1], worldMin[2]);
        this.worldBounds.max.set(worldMax[0], worldMax[1], worldMax[2]);
        return this.worldBounds;
    }

    clone(): MeshInstance {
        const clone = new MeshInstance(this.mesh, this.material);
        clone.node = this.node;
        clone.worldBounds = this.worldBounds.clone();
        clone.visible = this.visible;
        clone.cull = this.cull;
        clone.renderStyle = this.renderStyle;
        clone.castShadows = this.castShadows;
        clone.receiveShadows = this.receiveShadows;
        clone.drawOrder = this.drawOrder;
        return clone;
    }
}
