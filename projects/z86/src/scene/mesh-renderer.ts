import { Component } from './component';
import { Entity } from './entity';
import { WebGLDevice } from '../graphics';
import { Mat4, Vec3 } from '../math';

export class MeshRenderer extends Component {
    private _mesh: any = null;
    private _material: any = null;
    private _device: WebGLDevice | null = null;

    constructor(entity: Entity) {
        super(entity);
    }

    setMesh(mesh: any): void {
        this._mesh = mesh;
    }

    setMaterial(material: any): void {
        this._material = material;
    }

    render(device: WebGLDevice, worldTransform: Mat4): void {
        this._device = device;
        if (!this._mesh || !this._material) return;

        const modelMatrix = worldTransform.clone();
        const normalMatrix = new Mat4().copy(modelMatrix).invert().transpose();

        this._material.setParameter('matrix_model', modelMatrix.data);
        this._material.setParameter('matrix_normal', normalMatrix.data);

        this._material.bind();
        this._mesh.draw();
        this._material.unbind();
    }
}
