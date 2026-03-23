import { GraphNode } from './graph-node';
import { Entity } from './entity';
import { Component } from './component';
import { ComponentSystem } from './component-system';
import { Camera } from './camera';
import { Light } from './light';
import { MeshRenderer } from './mesh-renderer';
import { Scene } from './scene';
import { BatchManager } from './batch-manager';
import { ForwardRenderer } from './forward-renderer';
import { EventEmitter, Timer, ResourceLoader, Tags, Platform } from '../core';
import { Vec2, Vec3, Vec4, Mat3, Mat4, Quat, Color, Ray } from '../math';
import { WebGLDevice, Texture, ScopeSpace } from '../graphics';

export class Camera extends Component {
    private _projectionMatrix: Mat4 = new Mat4();
    private _viewMatrix: Mat4 = new Mat4();
    private _aspectRatio: number = 16 / 9;
    private _fov: number = 45;
    private _nearClip: number = 0.1;
    private _farClip: number = 1000;
    private _orthographic: boolean = false;
    private _orthoHeight: number = 10;
    private _clearColor: Color = new Color(0.1, 0.1, 0.1, 1);
    private _clearDepth: number = 1;
    private _clearStencil: number = 0;
    private _priority: number = 0;
    private _viewport: Vec4 = new Vec4(0, 0, 1, 1);
    private _scissor: Vec4 = new Vec4(0, 0, 1, 1);
    private _frustum: any = null;
    private _projMatDirty: boolean = true;
    private _viewMatDirty: boolean = true;

    constructor(entity: Entity) {
        super(entity);
    }

    get projectionMatrix(): Mat4 {
        if (this._projMatDirty) {
            this._updateProjectionMatrix();
        }
        return this._projectionMatrix;
    }

    get viewMatrix(): Mat4 {
        if (this._viewMatDirty) {
            this._updateViewMatrix();
        }
        return this._viewMatrix;
    }

    get aspectRatio(): number {
        return this._aspectRatio;
    }

    set aspectRatio(value: number) {
        if (this._aspectRatio !== value) {
            this._aspectRatio = value;
            this._projMatDirty = true;
        }
    }

    get fov(): number {
        return this._fov;
    }

    set fov(value: number) {
        if (this._fov !== value) {
            this._fov = value;
            this._projMatDirty = true;
        }
    }

    get nearClip(): number {
        return this._nearClip;
    }

    set nearClip(value: number) {
        if (this._nearClip !== value) {
            this._nearClip = value;
            this._projMatDirty = true;
        }
    }

    get farClip(): number {
        return this._farClip;
    }

    set farClip(value: number) {
        if (this._farClip !== value) {
            this._farClip = value;
            this._projMatDirty = true;
        }
    }

    get orthographic(): boolean {
        return this._orthographic;
    }

    set orthographic(value: boolean) {
        if (this._orthographic !== value) {
            this._orthographic = value;
            this._projMatDirty = true;
        }
    }

    get orthoHeight(): number {
        return this._orthoHeight;
    }

    set orthoHeight(value: number) {
        if (this._orthoHeight !== value) {
            this._orthoHeight = value;
            this._projMatDirty = true;
        }
    }

    get clearColor(): Color {
        return this._clearColor;
    }

    set clearColor(value: Color) {
        this._clearColor.copy(value);
    }

    get clearDepth(): number {
        return this._clearDepth;
    }

    set clearDepth(value: number) {
        this._clearDepth = value;
    }

    get clearStencil(): number {
        return this._clearStencil;
    }

    set clearStencil(value: number) {
        this._clearStencil = value;
    }

    get priority(): number {
        return this._priority;
    }

    set priority(value: number) {
        this._priority = value;
    }

    get viewport(): Vec4 {
        return this._viewport;
    }

    set viewport(value: Vec4) {
        this._viewport.copy(value);
    }

    get scissor(): Vec4 {
        return this._scissor;
    }

    set scissor(value: Vec4) {
        this._scissor.copy(value);
    }

    update(): void {
        this._viewMatDirty = true;
        this._projMatDirty = true;
    }

    private _updateProjectionMatrix(): void {
        if (this._orthographic) {
            const halfHeight = this._orthoHeight * 0.5;
            const halfWidth = halfHeight * this._aspectRatio;
            this._projectionMatrix.setOrtho(-halfWidth, halfWidth, -halfHeight, halfHeight, this._nearClip, this._farClip);
        } else {
            this._projectionMatrix.setPerspective(this._fov, this._aspectRatio, this._nearClip, this._farClip);
        }
        this._projMatDirty = false;
    }

    private _updateViewMatrix(): void {
        const node = this.entity.graphNode;
        if (node) {
            const pos = node.getPosition();
            const rot = node.getRotation();
            const target = new Vec3();
            const up = new Vec3(0, 1, 0);
            
            rot.transformVector(new Vec3(0, 0, -1), target);
            target.add(pos);
            
            this._viewMatrix.setLookAt(pos, target, up);
            this._viewMatrix.invert();
        }
        this._viewMatDirty = false;
    }

    screenToWorld(screenPos: Vec2, depth: number, target: Vec3): Vec3 {
        const viewport = this._viewport;
        const x = (screenPos.x - viewport.x) / viewport.z;
        const y = 1 - (screenPos.y - viewport.y) / viewport.w;
        
        const projMat = this.projectionMatrix;
        const viewMat = this.viewMatrix;
        
        const invProjView = new Mat4();
        invProjView.copy(projMat).mul(viewMat).invert();
        
        const clipPos = new Vec4(x * 2 - 1, y * 2 - 1, depth * 2 - 1, 1);
        const worldPos = new Vec4();
        invProjView.transformVec4(clipPos, worldPos);
        
        if (worldPos.w !== 0) {
            worldPos.x /= worldPos.w;
            worldPos.y /= worldPos.w;
            worldPos.z /= worldPos.w;
        }
        
        target.set(worldPos.x, worldPos.y, worldPos.z);
        return target;
    }

    worldToScreen(worldPos: Vec3, target: Vec2): Vec2 {
        const projMat = this.projectionMatrix;
        const viewMat = this.viewMatrix;
        
        const projView = new Mat4();
        projView.copy(projMat).mul(viewMat);
        
        const clipPos = new Vec4();
        projView.transformVec4(new Vec4(worldPos.x, worldPos.y, worldPos.z, 1), clipPos);
        
        if (clipPos.w !== 0) {
            clipPos.x /= clipPos.w;
            clipPos.y /= clipPos.w;
            clipPos.z /= clipPos.w;
        }
        
        const viewport = this._viewport;
        target.x = viewport.x + (clipPos.x * 0.5 + 0.5) * viewport.z;
        target.y = viewport.y + (1 - (clipPos.y * 0.5 + 0.5)) * viewport.w;
        
        return target;
    }

    getFrustum(): any {
        if (!this._frustum) {
            this._frustum = {};
        }
        return this._frustum;
    }

    setAspectRatio(width: number, height: number): void {
        this.aspectRatio = width / height;
    }

    setClearOptions(color?: Color, depth?: number, stencil?: number): void {
        if (color) this.clearColor = color;
        if (depth !== undefined) this.clearDepth = depth;
        if (stencil !== undefined) this.clearStencil = stencil;
    }

    getProjectionMatrix(): Mat4 {
        return this.projectionMatrix;
    }

    getViewMatrix(): Mat4 {
        return this.viewMatrix;
    }
}
