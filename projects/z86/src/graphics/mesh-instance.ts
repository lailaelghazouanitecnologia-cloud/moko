import { Mat4 } from '../math';
import { Mesh } from './mesh';
import { Material } from './material';

export class MeshInstance {
    mesh: Mesh;
    material: Material;
    transform: Mat4;

    constructor(mesh: Mesh, material: Material) {
        this.mesh = mesh;
        this.material = material;
        this.transform = new Mat4();
    }

    setTransform(matrix: Mat4): void {
        this.transform.copy(matrix);
    }

    getTransform(): Mat4 {
        return this.transform;
    }

    setMesh(mesh: Mesh): void {
        this.mesh = mesh;
    }

    getMesh(): Mesh {
        return this.mesh;
    }

    setMaterial(material: Material): void {
        this.material = material;
    }

    getMaterial(): Material {
        return this.material;
    }

    draw(device: any): void {
        if (!this.mesh || !this.material) return;
        
        this.material.setParameter('matrix_model', this.transform.data);
        this.material.bind(device);
        
        this.mesh.draw(device);
    }
}
