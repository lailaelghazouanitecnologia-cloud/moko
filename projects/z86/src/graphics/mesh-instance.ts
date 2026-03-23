import { EventEmitter } from '../core';
import { Vec3, Mat4 } from '../math';
import { Mesh } from './mesh';
import { Material } from './material';

export class MeshInstance {
    mesh: Mesh;
    material: Material;
    node: any; // Missing Node type reference
    visible: boolean = true;
    castShadow: boolean = true;
    receiveShadow: boolean = true;
    cull: boolean = true;
    renderStyle: number = 0;
    aabb: any; // Missing BoundingBox type reference
    _worldAabb: any; // Missing BoundingBox type reference
    _boneAabb: any; // Missing BoundingBox type reference
    _aabbVer: number = 0;
    _boneAabbVer: number = 0;
    _customAabb: any; // Missing BoundingBox type reference
    _layer: number = 0;
    _shader: any; // Missing Shader type reference
    _materialAsset: any;
    _batchGroupId: number = -1;
    _drawOrder: number = 0;
    _skinInstance: any;
    _morphInstance: any;
    _lightHash: number = 0;
    _receiveShadowShader: any; // Missing Shader type reference
    _shaderDefs: number = 0;
    _isVisible: boolean = true;
    _materialEvents: any;
    _materialAssetEvents: any;
    _dirtyShader: boolean = true;
    _dirtyMaterialAsset: boolean = true;
    _dirtyMaterial: boolean = true;
    _dirtyAabb: boolean = true;
    _dirtyBoneAabb: boolean = true;
    _dirtyLayer: boolean = true;
    _dirtyDrawOrder: boolean = true;
    _dirtyVisible: boolean = true;
    _dirtyCastShadow: boolean = true;
    _dirtyReceiveShadow: boolean = true;
    _dirtyCull: boolean = true;
    _dirtyRenderStyle: boolean = true;
    _dirtySkinInstance: boolean = true;
    _dirtyMorphInstance: boolean = true;
    _dirtyLightHash: boolean = true;
    _dirtyReceiveShadowShader: boolean = true;
    _dirtyShaderDefs: boolean = true;
    _dirtyIsVisible: boolean = true;
    _dirtyMaterialEvents: boolean = true;
    _dirtyMaterialAssetEvents: boolean = true;
    _dirtyDirtyShader: boolean = true;
    _dirtyDirtyMaterialAsset: boolean = true;
    _dirtyDirtyMaterial: boolean = true;
    _dirtyDirtyAabb: boolean = true;
    _dirtyDirtyBoneAabb: boolean = true;
    _dirtyDirtyLayer: boolean = true;
    _dirtyDirtyDrawOrder: boolean = true;
    _dirtyDirtyVisible: boolean = true;
    _dirtyDirtyCastShadow: boolean = true;
    _dirtyDirtyReceiveShadow: boolean = true;
    _dirtyDirtyCull: boolean = true;
    _dirtyDirtyRenderStyle: boolean = true;
    _dirtyDirtySkinInstance: boolean = true;
    _dirtyDirtyMorphInstance: boolean = true;
    _dirtyDirtyLightHash: boolean = true;
    _dirtyDirtyReceiveShadowShader: boolean = true;
    _dirtyDirtyShaderDefs: boolean = true;
    _dirtyDirtyIsVisible: boolean = true;
    _dirtyDirtyMaterialEvents: boolean = true;
    _dirtyDirtyMaterialAssetEvents: boolean = true;

    constructor(mesh: Mesh, material: Material) {
        this.mesh = mesh;
        this.material = material;
    }

    setMaterial(material: Material): void {
        this.material = material;
        this._dirtyMaterial = true;
        this._dirtyShader = true;
    }

    setMesh(mesh: Mesh): void {
        this.mesh = mesh;
        this._dirtyAabb = true;
        this._dirtyBoneAabb = true;
    }

    setVisible(visible: boolean): void {
        this.visible = visible;
        this._dirtyVisible = true;
    }

    setCastShadow(castShadow: boolean): void {
        this.castShadow = castShadow;
        this._dirtyCastShadow = true;
    }

    setReceiveShadow(receiveShadow: boolean): void {
        this.receiveShadow = receiveShadow;
        this._dirtyReceiveShadow = true;
    }

    setCull(cull: boolean): void {
        this.cull = cull;
        this._dirtyCull = true;
    }

    setRenderStyle(renderStyle: number): void {
        this.renderStyle = renderStyle;
        this._dirtyRenderStyle = true;
    }

    setLayer(layer: number): void {
        this._layer = layer;
        this._dirtyLayer = true;
    }

    setDrawOrder(drawOrder: number): void {
        this._drawOrder = drawOrder;
        this._dirtyDrawOrder = true;
    }

    setBatchGroupId(batchGroupId: number): void {
        this._batchGroupId = batchGroupId;
    }

    setSkinInstance(skinInstance: any): void {
        this._skinInstance = skinInstance;
        this._dirtySkinInstance = true;
    }

    setMorphInstance(morphInstance: any): void {
        this._morphInstance = morphInstance;
        this._dirtyMorphInstance = true;
    }

    setCustomAabb(aabb: any): void {
        this._customAabb = aabb;
        this._dirtyAabb = true;
    }

    getWorldTransform(): Mat4 {
        return this.node ? this.node.getWorldTransform() : Mat4.IDENTITY;
    }

    getAabb(): any {
        if (this._dirtyAabb) {
            this._updateAabb();
        }
        return this._worldAabb;
    }

    _updateAabb(): void {
        if (!this.mesh) return;
        
        const worldTransform = this.getWorldTransform();
        const meshAabb = this._customAabb || this.mesh.aabb;
        
        if (!this._worldAabb) {
            this._worldAabb = { center: new Vec3(), halfExtents: new Vec3() };
        }
        
        this._worldAabb.center.copy(meshAabb.center);
        this._worldAabb.halfExtents.copy(meshAabb.halfExtents);
        
        const scale = worldTransform.getScale();
        this._worldAabb.halfExtents.mul(scale);
        
        worldTransform.transformPoint(this._worldAabb.center, this._worldAabb.center);
        
        this._dirtyAabb = false;
    }

    update(): void {
        if (this._dirtyShader) {
            this._updateShader();
        }
        
        if (this._dirtyAabb) {
            this._updateAabb();
        }
        
        if (this._dirtyBoneAabb) {
            this._updateBoneAabb();
        }
    }

    _updateShader(): void {
        if (!this.material || !this.mesh) return;
        
        this._shader = this.material.getShader(this.mesh.vertexBuffer.format);
        this._dirtyShader = false;
    }

    _updateBoneAabb(): void {
        if (!this.mesh || !this._skinInstance) return;
        
        if (!this._boneAabb) {
            this._boneAabb = { center: new Vec3(), halfExtents: new Vec3() };
        }
        
        this._boneAabb.center.copy(this.mesh.aabb.center);
        this._boneAabb.halfExtents.copy(this.mesh.aabb.halfExtents);
        
        this._dirtyBoneAabb = false;
    }

    destroy(): void {
        this.mesh = null;
        this.material = null;
        this.node = null;
        this._shader = null;
        this._receiveShadowShader = null;
        this._skinInstance = null;
        this._morphInstance = null;
        this._worldAabb = null;
        this._boneAabb = null;
        this._customAabb = null;
    }
}
