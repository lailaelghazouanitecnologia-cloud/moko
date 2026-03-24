import { Mat4 } from '../math/mat4';
import { BoundingBox } from '../math/bounding-box';
import { Mesh } from '../graphics/mesh';
import { Material } from '../graphics/material';
import { Component } from './component';
import { Entity } from './entity';

/**
 * MeshRenderer is responsible for rendering a {@link Mesh} using a {@link Material}.
 * It supports instancing, skinning, morphing, shadow casting/receiving and frustum culling.
 */
export class MeshRenderer extends Component {
  private _mesh: Mesh | null = null;
  private _material: Material | null = null;
  private _worldMatrix: Mat4 = new Mat4();
  private _boundingBox: BoundingBox = new BoundingBox();
  private _castShadows: boolean = true;
  private _receiveShadows: boolean = true;
  private _renderOrder: number = 0;
  private _layer: number = 0;
  private _visible: boolean = true;
  private _cull: boolean = true;
  private _instanceCount: number = 1;
  private _skinInstance: any = null;
  private _morphInstance: any = null;
  private _materialReferences: number = 0;
  private _dirty: boolean = true;

  constructor(entity: Entity) {
    super(entity);
  }

  /**
   * The mesh to render.
   */
  get mesh(): Mesh | null {
    return this._mesh;
  }

  set mesh(mesh: Mesh | null) {
    if (this._mesh !== mesh) {
      this._mesh = mesh;
      this.updateBoundingBox();
      this.markDirty();
    }
  }

  /**
   * The material used to render the mesh.
   */
  get material(): Material | null {
    return this._inputMaterial;
  }

  set material(material: Material | null) {
    if (this._material !== material) {
      if (this._material) {
        this._materialReferences--;
        if (this._materialReferences === 0) {
          this._material.release();
        }
      }
      this._material = material;
      if (this._material) {
        this._materialReferences++;
        this._material.acquire();
      }
      this.markDirty();
    }
  }

  /**
   * The world transformation matrix of this renderer.
   */
  get worldMatrix(): Mat4 {
    return this._worldMatrix;
  }

  /**
   * The world-space bounding box of the mesh.
   */
  get boundingBox(): BoundingBox {
    return this._boundingBox;
  }

  /**
   * Whether this renderer casts shadows.
   */
  get castShadows(): boolean {
    return this._castShadows;
  }

  set castShadows(value: boolean) {
    this._castShadows = value;
  }

  /**
   * Whether this renderer receives shadows.
   */
  get receiveShadows(): boolean {
    return this._receiveShadows;
  }

  set receiveShadows(value: boolean) {
    this._receiveShadows = value;
  }

  /**
   * Render order for sorting transparent objects.
   */
  get renderOrder(): number {
    return this._renderOrder;
  }

  set renderOrder(value: number) {
    this._renderOrder = value;
  }

  /**
   * The layer bit mask used for selective rendering.
   */
  get layer(): number {
    return this._layer;
  }

  set layer(value: number) {
    this._validateLayer(value);
    this._layer = value;
  }

  /**
   * Whether the renderer is visible.
   */
  get visible(): boolean {
    return this._visible;
  }

  set visible(value: boolean) {
    this._visible = value;
  }

  /**
   * Whether to perform frustum culling on this renderer.
   */
  get cull(): boolean {
    return this._cull;
  }

  set cull(value: boolean) {
    this._cull = value;
  }

  /**
   * Number of instances to render when using GPU instancing.
   */
  get instanceCount(): number {
    return this._instanceCount;
  1}

  set instanceCount(value: number) {
    this._validateInstanceCount(value);
    this._instanceCount = value;
  }

  /**
   * The skin instance used for skeletal animation.
   */
  get skinInstance(): any {
    return this._skinInstance;
  }

  set skinInstance(value: any) {
    this._skinInstance = value;
  }

  /**
   * The morph instance used for morph target animation.
   */
  get morphInstance(): any {
    return this._morphInstance;
  }

  set morphInstance(value: any) {
    this._morphInstance = value;
  }

  /**
   * Initializes the renderer.
   */
  init(): void {
    super.init();
    this.updateWorldTransform();
  }

  /**
   * Updates the renderer.
   * @param dt - Delta time in seconds.
   */
  update(dt: number): void {
    super.update(dt);
    this.updateWorldTransform();
  }

  /**
   * Destroys the renderer and releases resources.
   */
  destroy(): void {
    if (this._material && this._materialReferences > 0) {
      this._materialReferences--;
      if (this._materialReferences === 0) {
        this._material.release();
      }
    }
    this._material = null;
    this._mesh = null;
    this._skinInstance = null;
    this._morphInstance = null;
    super.destroy();
  }

  /**
   * Updates the world transformation matrix.
   */
  updateWorldTransform(): void {
    const transform = this.entity.transform;
    if (transform && transform.worldTransform) {
      this._worldMatrix.copy(transform.worldTransform);
      this.updateBoundingBox();
      this.markDirty();
    }
  }

  /**
   * Updates the bounding box based on the current mesh and world transform.
   */
  updateBoundingBox(): void {
    if (!this._mesh || !this._mesh.boundingBox) {
      this._boundingBox.clear();
      return;
    }

    const meshMin = this._mesh.boundingBox.min;
    const meshMax = this._mesh.boundingBox.max;

    if (!meshMin || !meshMax) {
      this._boundingBox.clear();
      return;
    }

    this._boundingBox.set(meshMin, meshMax);
    this._boundingBox.transform(this._worldMatrix);
  }

  /**
   * Marks the renderer as needing an update.
   */
  markDirty(): void {
    this._dirty = true;
  }

  /**
   * Determines if the renderer is visible to the given camera.
   * @param camera - The camera to test against.
   * @returns True if visible, false otherwise.
   */
  isVisible(camera: any): boolean {
    if (!this._visible || !this._mesh) {
      return false;
    }

    if (this._cull && camera && camera.frustum) {
      return camera.frustum.containsBoundingBox(this._boundingBox);
    }

    return true;
  }

  /**
   * Sets the material for this renderer.
   * @param material - The material to set.
   */
  setMaterial(material: Material): void {
    this.material = material;
  }

  /**
   * Gets the material for this renderer.
   * @returns The current material or null.
   */
  getMaterial(): Material | null {
    return this.material;
  }

  /**
   * Sets the mesh for this renderer.
   * @param mesh - The mesh to set.
   */
  setMesh(mesh: Mesh): void {
    this.mesh = mesh;
  }

  /**
   * Gets the mesh for this renderer.
   * @returns The current mesh or null.
   */
  getMesh(): Mesh | null {
    return this.mesh;
  }

  /**
   * Sets the render order for sorting transparent objects.
   * @param order - The render order.
   */
  setRenderOrder(order: number): void {
    this.renderOrder = order;
  }

  /**
   * Gets the render order.
   * @returns The render order.
   */
  getRenderOrder(): number {
    return this.renderOrder;
  }

  /**
   * Sets the layer bit mask for selective rendering.
   * @param layer - The layer bitmask.
   */
  setLayer(layer: number): void {
    this.layer = layer;
  }

  /**
   * Gets the layer bitmask.
   * @returns The layer.
   */
  getLayer(): number {
    return this.layer;
  }

  /**
   * Sets whether this renderer casts shadows.
   * @param cast - True to cast shadows.
   */
  setCastShadows(cast: boolean): void {
    this.castShadows = cast;
  }

  /**
   * Gets whether this renderer casts shadows.
   * @returns True if casting shadows.
   */
  getCastShadows(): boolean {
    return this.castShadows;
  }

  /**
   * Sets whether this renderer receives shadows.
   * @param receive - True to receive shadows.
   */
  setReceiveShadows(receive: boolean): void {
    this.receiveShadows = receive;
  }

  /**
   * Gets whether this renderer receives shadows.
   * @returns True if receiving shadows.
   */
  getReceiveShadows(): boolean {
    return this.receiveShadows;
  }

  /**
   * Sets the visibility of this renderer.
   * @param visible - True to make visible.
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
  }

  /**
   * Gets the visibility of this renderer.
   * @returns True if visible.
   */
  getVisible(): boolean {
    return this.visible;
  }

  /**
   * Sets whether to perform frustum culling.
   * @param cull - True to enable culling.
   */
  setCull(cull: boolean): void {
    this.cull = c = cull;
  }

  /**
   * Gets whether culling is enabled.
   * @returns True if culling is enabled.
   */
  getCulling(): boolean {
    return this.cull;
  }

  /**
   * Sets the number of instances to render.
   * @param count - Number of instances.
   */
  setInstanceCount(count: number): void {
    this.instanceCount = count;
  }

  /**
   * Gets the number of instances to render.
   * @returns Instance count.
   */
  getInstanceCount(): number {
    return this.instanceCount;
  }

  /**
   * Sets the skin instance for skeletal animation.
   * @param skinInstance - The skin instance.
   */
  setSkinInstance(skinInstance: any): void {
    this.skinInstance = skinInstance;
  }

  /**
   * Gets the skin instance.
   * @returns The skin instance or null.
   */
  getSkinInstance(): any {
    return this.skinInstance;
  }

  /**
   * Sets the morph instance for morph target animation.
   * @param morphInstance - The morph instance.
   */
  setMorphInstance(morphInstance: any): void {
    this.morphInstance = morphInstance;
  }

  /**
   * Gets the morph instance.
   * @returns The morph instance or null.
   */
  getMorphInstance(): any {
    return this.morphInstance;
  }

  /**
   * Clones this renderer.
   * @returns A new MeshRenderer instance with the same properties.
   */
  clone(): MeshRenderer {
    const clone = new MeshRenderer(this.entity);
    clone.mesh = this.mesh;
    clone.material = this.material;
    clone.castShadows = this.castShadows;
    clone.receiveShadows = this.receiveShadows;
    clone.renderOrder = this.renderOrder;
    clone.layer = this.layer;
    clone.visible = this.visible;
    clone.cull = this.cull;
    clone.instanceCount = this.instanceCount;
    clone.skinInstance = this.skinInstance;
    clone.morphInstance = this.morphInstance;
    return clone;
  }

  /**
   * Validates the layer value.
   * @param value - The layer value to validate.
   */
  private _validateLayer(value: number): void {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('Layer must be a non-negative integer.');
    }
  }

  /**
   * Validates the instance count value.
   * @param value - The instance count to validate.
   */
  private _validateInstanceCount(value: number): void {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error('Instance count must be a positive integer.');
    }
  }
}