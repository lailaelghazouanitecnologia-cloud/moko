import { Mesh } from './mesh';
import { Material } from './material';
import { Mat4 } from '../math/mat4';

/**
 * Renderable instance that combines a mesh and a material for drawing.
 */
export class MeshInstance {
    private _mesh: Mesh;
    private _material: Material;
    private _worldMatrix: Mat4;

    /**
     * Creates a new MeshInstance.
     * @param mesh - The mesh to render.
     * @param material - The material to apply.
     * @throws {TypeError} If mesh or material is null or undefined.
     */
    constructor(mesh: Mesh, material: Material) {
        if (!mesh) {
            throw new TypeError('Mesh cannot be null or undefined');
        }
        if (!material) {
            throw new TypeError('Material cannot be null or undefined');
        }
        this._mesh = mesh;
        this._material = material;
        this._worldMatrix = new Mat4();
    }

    /**
     * Gets the mesh.
     */
    get mesh(): Mesh {
        return this._mesh;
    }

    /**
     * Sets the mesh.
     * @param value - The new mesh.
     * @throws {TypeError} If value is null or undefined.
     */
    set mesh(value: Mesh) {
        if (!value) {
            throw new TypeError('Mesh cannot be null or undefined');
        }
        this._mesh = value;
    }

    /**
     * Gets the material.
     */
    get material(): Material {
        return this._material;
    }

    /**
     * Sets the material.
     * @param value - The new material.
     * @throws {TypeError} If value is null or undefined.
     */
    set material(value: Material) {
        if (!value) {
            throw new TypeError('Material cannot be null or undefined');
        }
        this._material = value;
    }

    /**
     * Gets the world matrix.
     */
    get worldMatrix(): Mat4 {
        return this._worldMatrix;
    }

    /**
     * Sets the world matrix.
     * @param value - The new world matrix.
     * @throws {TypeError} If value is null or undefined.
     */
    set worldMatrix(value: Mat4) {
        if (!value) {
            throw new TypeError('World matrix cannot be null or undefined');
        }
        this._worldMatrix = value;
    }

    /**
     * Updates the world matrix.
     * @param matrix - The new matrix values.
     */
    updateMatrix(matrix: Mat4): void {
        if (!matrix) {
            throw new TypeError('Matrix cannot be null or undefined');
        }
        this._worldMatrix.copy(matrix);
    }

    /**
     * Resets the world matrix to identity.
     */
    resetMatrix(): void {
        this._worldMatrix.identity();
    }

    /**
     * Determines whether this instance is ready for rendering.
     */
    isReady(): boolean {
        return !!(this._mesh && this._material);
    }

    /**
     * Disposes resources held by this instance.
     */
    dispose(): void {
        // Mesh and material are typically managed externally, so we just clear references
        this._mesh = null as any;
        this._material = null as any;
        this._worldMatrix = null as any;
    }
}
