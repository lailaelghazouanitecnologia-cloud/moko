import { Component } from './component';
import { Entity } from './entity';
import { Mat4 } from '../math';
import { Mesh } from '../graphics';
import { Material } from '../graphics';

export class MeshRenderer extends Component {
    private _mesh: Mesh | null = null;
    private _material: Material | null = null;
    private _modelMatrix: Mat4 = new Mat4();
    private _worldTransform: Mat4 = new Mat4();

    constructor(entity: Entity) {
        super(entity);
    }

    setMesh(mesh: Mesh | null): void {
        this._mesh = mesh;
    }

    setMaterial(material: Material | null): void {
        this._material = material;
    }

    render(): void {
        if (!this._mesh || !this._material) {
            return;
        }

        const device = this.entity.scene.graphicsDevice;
        if (!device) {
            return;
        }

        this._updateWorldTransform();

        const shader = this._material.shader;
        if (!shader) {
            return;
        }

        device.setShader(shader);
        device.setUniform('matrix_model', this._worldTransform.data);
        device.setUniform('matrix_normal', this._calculateNormalMatrix());

        this._material.bind();

        this._mesh.vertexBuffer.bind();
        if (this._mesh.indexBuffer) {
            this._mesh.indexBuffer.bind();
            device.draw(this._mesh.primitiveType, this._mesh.indexBuffer.count);
        } else {
            device.draw(this._mesh.primitiveType, this._mesh.vertexBuffer.numVertices);
        }
    }

    private _updateWorldTransform(): void {
        const node = this.entity.graphNode;
        if (node) {
            this._worldTransform.copy(node.worldTransform);
        } else {
            this._worldTransform.setIdentity();
        }
    }

    private _calculateNormalMatrix(): Mat4 {
        const normalMatrix = new Mat4();
        normalMatrix.copy(this._worldTransform);
        normalMatrix.invert();
        normalMatrix.transpose();
        return normalMatrix;
    }
}
