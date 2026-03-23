import { Component } from './component';
import { GraphicsDevice, Material, Mesh, MeshInstance } from '../graphics';
import { Mat4 } from '../math';

export class MeshRenderer extends Component {
    private _mesh: Mesh | null = null;
    private _material: Material | null = null;
    private _meshInstance: MeshInstance | null = null;
    private _worldTransform: Mat4 = new Mat4();

    constructor(entity: any) {
        super(entity);
    }

    setMesh(mesh: Mesh | null): void {
        this._mesh = mesh;
        this._updateMeshInstance();
    }

    setMaterial(material: Material | null): void {
        this._material = material;
        this._updateMeshInstance();
    }

    updateUniforms(device: GraphicsDevice): void {
        if (!this._meshInstance) return;
        this._meshInstance.updateUniforms(device);
    }

    render(device: GraphicsDevice): void {
        if (!this._meshInstance) return;
        this._meshInstance.render(device);
    }

    private _updateMeshInstance(): void {
        if (this._mesh && this._material) {
            this._meshInstance = new MeshInstance(this._mesh, this._material);
        } else {
            this._meshInstance = null;
        }
    }
}
