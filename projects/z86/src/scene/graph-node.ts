import { EventEmitter } from '../core';
import { Vec3, Mat4, Quat } from '../math';

export class GraphNode extends EventEmitter {
    private _parent: GraphNode | null = null;
    private _children: GraphNode[] = [];
    private _localPosition: Vec3 = new Vec3();
    private _localRotation: Quat = new Quat();
    private _localScale: Vec3 = new Vec3(1, 1, 1);
    private _worldPosition: Vec3 = new Vec3();
    private _worldRotation: Quat = new Quat();
    private _worldScale: Vec3 = new Vec3(1, 1, 1);
    private _localTransform: Mat4 = new Mat4();
    private _worldTransform: Mat4 = new Mat4();
    private _dirty: boolean = true;
    private _enabled: boolean = true;
    private _name: string = '';

    constructor(name?: string) {
        super();
        if (name) {
            this._name = name;
        }
    }

    get parent(): GraphNode | null {
        return this._parent;
    }

    get children(): GraphNode[] {
        return [...this._children];
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        if (this._enabled !== value) {
            this._enabled = value;
            this._dirty = true;
        }
    }

    get localPosition(): Vec3 {
        return this._localPosition.clone();
    }

    set localPosition(value: Vec3) {
        this._localPosition.copy(value);
        this._dirty = true;
    }

    get localRotation(): Quat {
        return this._localRotation.clone();
    }

    set localRotation(value: Quat) {
        this._localRotation.copy(value);
        this._dirty = true;
    }

    get localScale(): Vec3 {
        return this._localScale.clone();
    }

    set localScale(value: Vec3) {
        this._localScale.copy(value);
        this._dirty = true;
    }

    get worldPosition(): Vec3 {
        if (this._dirty) {
            this._updateTransforms();
        }
        return this._worldPosition.clone();
    }

    get worldRotation(): Quat {
        if (this._dirty) {
            this._updateTransforms();
        }
        return this._worldRotation.clone();
    }

    get worldScale(): Vec3 {
        if (this._dirty) {
            this._updateTransforms();
        }
        return this._worldScale.clone();
    }

    getLocalTransform(): Mat4 {
        if (this._dirty) {
            this._updateLocalTransform();
        }
        return this._localTransform.clone();
    }

    getWorldTransform(): Mat4 {
        if (this._dirty) {
            this._updateTransforms();
        }
        return this._worldTransform.clone();
    }

    setLocalTransform(position?: Vec3, rotation?: Quat, scale?: Vec3): void {
        if (position) {
            this._localPosition.copy(position);
        }
        if (rotation) {
            this._localRotation.copy(rotation);
        }
        if (scale) {
            this._localScale.copy(scale);
        }
        this._dirty = true;
    }

    setWorldTransform(position?: Vec3, rotation?: Quat, scale?: Vec3): void {
        if (!this._parent) {
            if (position) {
                this._localPosition.copy(position);
            }
            if (rotation) {
                this._localRotation.copy(rotation);
            }
            if (scale) {
                this._localScale.copy(scale);
            }
        } else {
            if (position) {
                const invParentWorld = this._parent.getWorldTransform().invert();
                const localPos = new Vec3();
                invParentWorld.transformPoint(position, localPos);
                this._localPosition.copy(localPos);
            }
            if (rotation) {
                const parentRotInv = this._parent.worldRotation.invert();
                this._localRotation.copy(parentRotInv.mul(rotation));
            }
            if (scale) {
                const parentScale = this._parent.worldScale;
                this._localScale.set(
                    scale.x / parentScale.x,
                    scale.y / parentScale.y,
                    scale.z / parentScale.z
                );
            }
        }
        this._dirty = true;
    }

    addChild(child: GraphNode): void {
        if (child._parent === this) {
            return;
        }
        if (child._parent) {
            child._parent.removeChild(child);
        }
        child._parent = this;
        this._children.push(child);
        child._dirty = true;
    }

    removeChild(child: GraphNode): void {
        const index = this._children.indexOf(child);
        if (index !== -1) {
            this._children.splice(index, 1);
            child._parent = null;
            child._dirty = true;
        }
    }

    removeFromParent(): void {
        if (this._parent) {
            this._parent.removeChild(this);
        }
    }

    findChild(name: string): GraphNode | null {
        for (const child of this._children) {
            if (child.name === name) {
                return child;
            }
            const found = child.findChild(name);
            if (found) {
                return found;
            }
        }
        return null;
    }

    findChildren(name: string): GraphNode[] {
        const results: GraphNode[] = [];
        for (const child of this._children) {
            if (child.name === name) {
                results.push(child);
            }
            results.push(...child.findChildren(name));
        }
        return results;
    }

    update(): void {
        if (this._dirty) {
            this._updateTransforms();
        }
        for (const child of this._children) {
            child.update();
        }
    }

    private _updateLocalTransform(): void {
        this._localTransform.setTRS(this._localPosition, this._localRotation, this._localScale);
    }

    private _updateTransforms(): void {
        this._updateLocalTransform();
        
        if (this._parent) {
            this._worldTransform.copy(this._parent.getWorldTransform()).mul(this._localTransform);
        } else {
            this._worldTransform.copy(this._localTransform);
        }

        this._worldTransform.getTranslation(this._worldPosition);
        this._worldTransform.getScale(this._worldScale);
        this._worldRotation.setFromMat4(this._worldTransform);

        this._dirty = false;
    }

    lookAt(target: Vec3, up?: Vec3): void {
        const lookAtMat = new Mat4();
        const forward = new Vec3().sub2(target, this.worldPosition).normalize();
        const right = new Vec3().cross(up || new Vec3(0, 1, 0), forward).normalize();
        const actualUp = new Vec3().cross(forward, right).normalize();
        
        lookAtMat.setFromAxes(right, actualUp, forward.neg());
        lookAtMat.setTranslate(this.worldPosition);
        
        this.setWorldTransform(undefined, Quat.IDENTITY.setFromMat4(lookAtMat));
    }

    translateLocal(translation: Vec3): void {
        const rotatedTranslation = this._localRotation.transformVector(translation);
        this._localPosition.add(rotatedTranslation);
        this._dirty = true;
    }

    translateWorld(translation: Vec3): void {
        if (this._parent) {
            const invParentRot = this._parent.worldRotation.invert();
            const localTranslation = invParentRot.transformVector(translation);
            this._localPosition.add(localTranslation);
        } else {
            this._localPosition.add(translation);
        }
        this._dirty = true;
    }

    rotateLocal(rotation: Quat): void {
        this._localRotation.mul(rotation).normalize();
        this._dirty = true;
    }

    rotateWorld(rotation: Quat): void {
        if (this._parent) {
            const parentRot = this._parent.worldRotation;
            const invParentRot = parentRot.invert();
            const worldRot = parentRot.mul(this._localRotation);
            const newWorldRot = rotation.mul(worldRot);
            this._localRotation.copy(invParentRot.mul(newWorldRot));
        } else {
            this._localRotation.mul(rotation).normalize();
        }
        this._dirty = true;
    }

    getForward(): Vec3 {
        return this.worldRotation.transformVector(new Vec3(0, 0, -1));
    }

    getRight(): Vec3 {
        return this.worldRotation.transformVector(new Vec3(1, 0, 0));
    }

    getUp(): Vec3 {
        return this.worldRotation.transformVector(new Vec3(0, 1, 0));
    }
}
