import { EventEmitter } from '../core/eventemitter';
import { Vec3 } from '../math/vec3';
import { Mat4 } from '../math/mat4';
import { GraphicsDevice } from '../graphics/graphicsdevice';
import { Material } from '../graphics/material';
import { Mesh } from '../graphics/mesh';
import { MeshInstance } from '../graphics/meshinstance';
import { Component } from './component';
import { Entity } from './entity';

export class MeshRenderer extends Component {
    private _mesh: Mesh | null = null;
    private _material: Material | null = null;
    private _meshInstance: MeshInstance | null = null;
    private _visible: boolean = true;
    private _castShadows: boolean = true;
    private _receiveShadows: boolean = true;
    private _layer: number = 0;
    private _castShadowsLightmap: boolean = true;
    private _lightmapSizeMultiplier: number = 1;
    private _renderStyle: number = 0;
    private _receiveShadowsLightmap: boolean = true;
    private _lightmapScale: Vec3 = new Vec3(1, 1, 1);
    private _lightmapOffset: Vec3 = new Vec3(0, 0, 0);

    constructor(entity: Entity) {
        super(entity);
    }

    get mesh(): Mesh | null {
        return this._mesh;
    }

    set mesh(value: Mesh | null) {
        this.setMesh(value);
    }

    get material(): Material | null {
        return this._material;
    }

    set material(value: Material | null) {
        this.setMaterial(value);
    }

    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        this._visible = value;
        if (this._meshInstance) {
            this._meshInstance.visible = value;
        }
    }

    get castShadows(): boolean {
        return this._castShadows;
    }

    set castShadows(value: boolean) {
        this._castShadows = value;
        if (this._meshInstance) {
            this._meshInstance.castShadow = value;
        }
    }

    get receiveShadows(): boolean {
        return this._receiveShadows;
    }

    set receiveShadows(value: boolean) {
        this._receiveShadows = value;
        if (this._meshInstance) {
            this._meshInstance.receiveShadow = value;
        }
    }

    get layer(): number {
        return this._layer;
    }

    set layer(value: number) {
        this._layer = value;
        if (this._meshInstance) {
            this._meshInstance.layer = value;
        }
    }

    get castShadowsLightmap(): boolean {
        return this._castShadowsLightmap;
    }

    set castShadowsLightmap(value: boolean) {
        this._castShadowsLightmap = value;
    }

    get lightmapSizeMultiplier(): number {
        return this._lightmapSizeMultiplier;
    }

    set lightmapSizeMultiplier(value: number) {
        this._lightmapSizeMultiplier = value;
    }

    get renderStyle(): number {
        return this._renderStyle;
    }

    set renderStyle(value: number) {
        this._renderStyle = value;
    }

    get receiveShadowsLightmap(): boolean {
        return this._receiveShadowsLightmap;
    }

    set receiveShadowsLightmap(value: boolean) {
        this._receiveShadowsLightmap = value;
    }

    get lightmapScale(): Vec3 {
        return this._lightmapScale;
    }

    set lightmapScale(value: Vec3) {
        this._lightmapScale.copy(value);
    }

    get lightmapOffset(): Vec3 {
        return this._lightmapOffset;
    }

    set lightmapOffset(value: Vec3) {
        this._lightmapOffset.copy(value);
    }

    render(device: GraphicsDevice, camera: any): void {
        if (!this._meshInstance || !this._visible) return;
        this._meshInstance.render(device, camera);
    }

    setMesh(mesh: Mesh | null): void {
        if (this._mesh === mesh) return;
        
        this._mesh = mesh;
        
        if (this._meshInstance) {
            this._meshInstance.mesh = mesh;
        } else if (mesh && this._material) {
            this._meshInstance = new MeshInstance(mesh, this._material);
            this._updateMeshInstanceProperties();
        }
    }

    setMaterial(material: Material | null): void {
        if (this._material === material) return;
        
        this._material = material;
        
        if (this._meshInstance) {
            this._meshInstance.material = material;
        } else if (material && this._mesh) {
            this._meshInstance = new MeshInstance(this._mesh, material);
            this._updateMeshInstanceProperties();
        }
    }

    updateUniforms(): void {
        if (!this._meshInstance) return;
        
        const worldTransform = this.entity.getWorldTransform();
        this._meshInstance.setWorldTransform(worldTransform);
        
        if (this._material) {
            this._material.update();
        }
    }

    private _updateMeshInstanceProperties(): void {
        if (!this._meshInstance) return;
        
        this._meshInstance.visible = this._visible;
        this._meshInstance.castShadow = this._castShadows;
        this._meshInstance.receiveShadow = this._receiveShadows;
        this._meshInstance.layer = this._layer;
    }

    onEnable(): void {
        if (this._meshInstance) {
            this._meshInstance.visible = this._visible;
        }
    }

    onDisable(): void {
        if (this._meshInstance) {
            this._meshInstance.visible = false;
        }
    }

    onDestroy(): void {
        if (this._meshInstance) {
            this._meshInstance.destroy();
            this._meshInstance = null;
        }
    }
}
