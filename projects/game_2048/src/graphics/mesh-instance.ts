import { Mat4 } from '../math/mat4';
import { Quat } from '../math/quat';
import { Vec3 } from '../math/vec3';
import { GraphicsDevice } from './graphics-device';
import { Material } from './material';
import { Mesh } from './mesh';

/**
 * Represents an instance of a Mesh with a Material and transform properties.
 * Handles rendering state and provides methods for manipulation.
 */
export class MeshInstance {
    mesh: Mesh;
    material: Material;
    visible: boolean;

    private _position: Vec3;
    private _rotation: Quat;
    private _scale: Vec3;
    private _worldMatrix: Mat4;
    private _dirty: boolean;

    /**
     * Creates a new MeshInstance.
     * @param mesh - The mesh to render.
     * @param material - The material to apply to the mesh.
     * @throws {TypeError} If mesh or material is null or undefined.
     */
    constructor(mesh: Mesh, material: Material) {
        if (!mesh) {
            throw new TypeError('Mesh is required for MeshInstance');
        }
        if (!material) {
            throw new TypeError('Material is required for MeshInstance');
        }

        this.mesh = mesh;
        this.material = material;
        this.visible = true;

        this._position = new Vec3();
        this._rotation = new Quat();
        this._scale = new Vec3(1, 1, 1);
        this._worldMatrix = new Mat4();
        this._dirty = true;
    }

    /**
     * Renders this mesh instance using the provided graphics device.
     * @param device - The graphics device to render with.
     * @throws {TypeError} If device is invalid.
     */
    draw(device: GraphicsDevice): void {
        if (!device) {
            throw new TypeError('GraphicsDevice is required for drawing');
        }
        if (!this.visible) return;
        if (!this.material) {
            console.warn('Attempting to draw MeshInstance without a material');
            return;
        }
        if (!this.mesh) {
            console.warn('Attempting to draw MeshInstance without a mesh');
            return;
        }

        if (this._dirty) {
            this._updateWorldMatrix();
            this._dirty = false;
        }

        this.material.apply(device);
        this.mesh.draw(device);
    }

    /**
     * Sets the world position of this instance.
     * @param x - X coordinate.
     * @param y - Y coordinate.
     * @param z - Z coordinate.
     * @throws {TypeError} If any coordinate is not a finite number.
     */
    setPosition(x: number, y: number, z: number): void {
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            throw new TypeError('Position coordinates must be finite numbers');
        }
        this._position.set(x, y, z);
        this._dirty = true;
    }

    /**
     * Sets the rotation of this instance using a quaternion.
     * @param qx - X component of the quaternion.
     * @param qy - Y component of the quaternion.
     * @param qz - Z component of the quaternion.
     * @param qw - W component of the quaternion.
     * @throws {TypeError} If any component is not a finite number.
     */
    setRotation(qx: number, qy: number, qz: number, qw: number): void {
        if (!Number.isFinite(qx) || !Number.isFinite(qy) || !Number.isFinite(qz) || !Number.isFinite(qw)) {
            throw new Type('Quaternion components must be finite numbers');
        }
        this._rotation.set(qx, qy, qz, qw);
        this._dirty = true;
    }

    /**
     * Sets the scale of this instance.
     * @param x - Scale along X axis.
     * @param y - Scale along Y axis.
     * @param z - Scale along Z axis.
     * @throws {TypeError} If any scale is not a finite number.
     * @throws {RangeError} If any scale is zero or negative.
     */
    setScale(x: number, y: number, z: number): void {
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
            throw new TypeError('Scale values must be finite numbers');
        }
        if (x <= 0 || y <= 0 || z <= 0) {
            throw new RangeError('Scale values must be positive');
        }
        this._scale.set(x, y, z);
        this._dirty = true;
    }

    /**
     * Returns the current world transform matrix as a Float32Array.
     * Updates the matrix if the transform is marked as dirty.
     * @returns The world matrix data.
     */
    getWorldMatrix(): Float32Array {
        if (this._dirty) {
            this._updateWorldMatrix();
            this._dirty = false;
        }
        return this._worldMatrix.data;
    }

    /**
     * Replaces the material used by this instance.
     * @param material - The new material to apply.
     * @throws {TypeError} If material is null or undefined.
     */
    setMaterial(material: Material): void {
        if (!material) {
            throw new TypeError('Material is required for setMaterial');
        }
        this.material = material;
    }

    /**
     * Sets the visibility of this instance.
     * @param visible - Whether the instance should be rendered.
     * @throws {TypeError} If visible is not a boolean.
     */
    setVisible(visible: boolean): void {
        if (typeof visible !== 'boolean') {
            throw new TypeError('Visible must be a boolean value');
        }
        this.visible = visible;
    }

    /**
     * Creates a deep copy of this instance.
     * @returns A new MeshInstance with copied transform and material.
     * @throws {Error} If cloning fails due to invalid internal state.
     */
    clone(): MeshInstance {
        try {
            const clone = new MeshInstance(this.mesh, this.material.clone());
            clone._position.copy(this._position);
            clone._rotation.copy(this._rotation);
            clone._scale.copy(this._scale);
            clone._worldMatrix.copy(this._worldMatrix);
            clone._dirty = this._dirty;
            clone.visible = this.visible;
            return clone;
        } catch (err) {
            throw new Error(`Failed to clone MeshInstance: ${err}`);
        }
    }

    /**
     * Updates the internal world matrix from current transform components.
     * @private
     */
    private _updateWorldMatrix(): void {
        this._worldMatrix.setTRS(this._position, this._rotation, this._scale);
    }
}
