import { Component } from './component';
import { Camera } from './camera';
import { Material } from '../graphics/material';
import { Mesh } from '../graphics/mesh';

/**
 * Renders a mesh for entities.
 * Handles mesh rendering with materials, shadow options, and layer configuration.
 */
export class MeshRenderer extends Component {
    private _mesh: Mesh;
    private _material: Material;
    private _castShadows: boolean;
    private _receiveShadows: boolean;
    private _layer: number;

    constructor(entity: any) {
        super(entity);
        this._castShadows = true;
        this._receiveShadows = true;
        this._layer = 0;
    }

    /**
     * Gets the current mesh to render
     */
    get mesh(): Mesh {
        return this._mesh;
    }

    /**
     * Sets the mesh to render
     * @param value - The mesh to render
     */
    set mesh(value: Mesh) {
        if (!value) {
            console.warn('MeshRenderer: Attempted to set null or undefined mesh');
            return;
        }
        this._mesh = value;
    }

    /**
     * Gets the current material
     */
    get material(): Material {
        return this._material;
    }

    /**
     * Sets the material to render with
     * @param value - The material to render with
     */
    set material(value: Material) {
        if (!value) {
            console.warn('MeshRenderer: Attempted to set null or undefined material');
            return;
        }
        this._material = value;
    }

    /**
     * Gets whether this renderer casts shadows
     */
    get castShadows(): boolean {
        return this._castShadows;
    }

    /**
     * Sets whether this renderer casts shadows
     * @param value - True to cast shadows, false to disable
     */
    set castShadows(value: boolean) {
        this._castShadows = Boolean(value);
    }

    /**
     * Gets whether this renderer receives shadows
     */
    get receiveShadows(): boolean {
        return this._receiveShadows;
    }

    /**
     * Sets whether this renderer receives shadows
     * @param value - True to receive shadows, false to disable
     */
    set receiveShadows(value: boolean) {
        this._receiveShadows = Boolean(value);
    }

    /**
     * Gets the render layer
     */
    get layer(): number {
        return this._layer;
    }

    /**
     * Sets the render layer
     * @param value - The layer index (must be non-negative integer)
     */
    set layer(value: number) {
        if (!Number.isInteger(value) || value < 0) {
            console.warn(`MeshRenderer: Invalid layer value ${value}. Must be a non-negative integer.`);
            return;
        }
        this._layer = value;
    }

    /**
     * Renders the mesh with the current material
     * @param camera - The camera used for rendering
     */
    render(camera: Camera): void {
        if (!this._validateRenderState()) {
            return;
        }

        const device = this._getGraphicsDevice();
        if (!device) {
            console.warn('MeshRenderer: Graphics device not found');
            return;
        }

        try {
            this._material.bind();
            this._mesh.draw();
        } catch (error) {
            console.error('MeshRenderer: Error during render', error);
        }
    }

    /**
     * Sets the material to render with
     * @param material - The material to use
     */
    setMaterial(material: Material): void {
        if (!material) {
            console.warn('MeshRenderer: Cannot set null material');
            return;
        }
        this._material = material;
    }

    /**
     * Gets the current material
     * @returns The current material
     */
    getMaterial(): Material {
        return this._material;
    }

    /**
     * Sets the mesh to render
     * @param mesh - The mesh to render
     */
    setMesh(mesh: Mesh): void {
        if (!mesh) {
            console.warn('MeshRenderer: Cannot set null mesh');
            return;
        }
        this._mesh = mesh;
    }

    /**
     * Gets the current mesh
     * @returns The current mesh
     */
    getMesh(): Mesh {
        return this._mesh;
    }

    /**
     * Sets shadow casting and receiving options
     * @param cast - Whether to cast shadows
     * @param receive - Whether to receive shadows
     */
    setShadowOptions(cast: boolean, receive: boolean): void {
        this._castShadows = Boolean(cast);
        this._receiveShadows = Boolean(receive);
    }

    /**
     * Sets the render layer
     * @param layer - The layer index (must be non-negative integer)
     */
    setLayer(layer: number): void {
        if (!Number.isInteger(layer) || layer < 0) {
            console.warn(`MeshRenderer: Invalid layer value ${layer}. Must be a non-negative integer.`);
            return;
        }
        this._layer = layer;
    }

    /**
     * Validates the render state
     * @returns True if ready to render
     */
    private _validateRenderState(): boolean {
        if (!this._mesh) {
            return false;
        }
        if (!this._material) {
            return false;
        }
        return true;
    }

    /**
     * Gets the graphics device from the entity's scene
     * @returns The graphics device or null if not found
     */
    private _getGraphicsDevice(): any | null {
        const scene = (this as any).entity?.scene;
        return scene?.graphicsDevice || null;
    }
}
