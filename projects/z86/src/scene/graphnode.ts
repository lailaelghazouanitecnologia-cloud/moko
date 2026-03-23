import { EventEmitter } from '../../core/eventemitter';
import { Vec3 } from '../../math/vec3';
import { Vec4 } from '../../math/vec4';
import { Mat4 } from '../../math/mat4';
import { Quat } from '../../math/quat';

export class GraphNode extends EventEmitter {
    private _parent: GraphNode | null = null;
    private _children: GraphNode[] = [];
    private _localTransform: Mat4 = new Mat4();
    private _worldTransform: Mat4 = new Mat4();
    private _position: Vec3 = new Vec3();
    private _rotation: Quat = new Quat();
    private _scale: Vec3 = new Vec3(1, 1, 1);
    private _dirty: boolean = true;
    private _name: string;

    constructor(name: string = 'Node') {
        super();
        this._name = name;
    }

    get name(): string {
        return this._name;
    }

    set name(value: string) {
        this._name = value;
    }

    get parent(): GraphNode | null {
        return this._parent;
    }

    set parent(value: GraphNode | null) {
        if (this._parent === value) return;
        if (this._parent) {
            const idx = this._parent._children.indexOf(this);
            if (idx !== -1) {
                this._parent._children.splice(idx, 1);
            }
        }
        this._parent = value;
        if (this._parent) {
            this._parent._children.push(this);
        }
        this._setDirty();
    }

    get children(): GraphNode[] {
        return this._children.slice();
    }

    addChild(child: GraphNode): void {
        child.parent = this;
    }

    removeChild(child: GraphNode): void {
        if (child.parent === this) {
            child.parent = null;
        }
    }

    findChild(name: string): GraphNode | null {
        for (let i = 0; i < this._children.length; i++) {
            if (this._children[i].name === name) {
                return this._children[i];
            }
        }
        return null;
    }

    findChildRecursive(name: string): GraphNode | null {
        let node = this.findChild(name);
        if (node) return node;
        for (let i = 0; i < this._children.length; i++) {
            node = this._children[i].findChildRecursive(name);
            if (node) return node;
        }
        return null;
    }

    reparent(newParent: GraphNode | null): void {
        this.parent = newParent;
    }

    get localTransform(): Mat4 {
        return this._localTransform.clone();
    }

    set localTransform(value: Mat4) {
        this._localTransform.copy(value);
        this._updateFromLocalTransform();
        this._setDirty();
    }

    get worldTransform(): Mat4 {
        if (this._dirty) {
            this._updateWorldTransform();
        }
        return this._worldTransform.clone();
    }

    set worldTransform(value: Mat4) {
        if (this._parent) {
            const invParent = this._parent.worldTransform.clone().invert();
            this.localTransform = invParent.mul(value);
        } else {
            this.localTransform = value;
        }
    }

    get localPosition(): Vec3 {
        return this._position.clone();
    }

    set localPosition(value: Vec3) {
        this._position.copy(value);
        this._updateLocalTransform();
        this._setDirty();
    }

    get localRotation(): Quat {
        return this._rotation.clone();
    }

    set localRotation(value: Quat) {
        this._rotation.copy(value);
        this._updateLocalTransform();
        this._setDirty();
    }

    get localScale(): Vec3 {
        return this._scale.clone();
    }

    set localScale(value: Vec3) {
        this._scale.copy(value);
        this._updateLocalTransform();
        this._setDirty();
    }

    get worldPosition(): Vec3 {
        if (this._dirty) {
            this._updateWorldTransform();
        }
        return this._worldTransform.getTranslation();
    }

    set worldPosition(value: Vec3) {
        if (this._parent) {
            const invParent = this._parent.worldTransform.clone().invert();
            const local = invParent.transformPoint(value);
            this.localPosition = local;
        } else {
            this.localPosition = value;
        }
    }

    getWorldRotation(): Quat {
        if (this._dirty) {
            this._updateWorldTransform();
        }
        const rot = new Quat();
        const scale = new Vec3();
        this._worldTransform.getRotation(rot);
        this._worldTransform.getScale(scale);
        return rot;
    }

    setWorldRotation(rotation: Quat): void {
        if (this._parent) {
            const invParentRot = this._parent.getWorldRotation().clone().invert();
            const localRot = invParentRot.mul(rotation);
            this.localRotation = localRot;
        } else {
            this.localRotation = rotation;
        }
    }

    translate(x: number, y: number, z: number, space: 'local' | 'world' = 'local'): void {
        if (space === 'local') {
            this.localPosition = this.localPosition.add(new Vec3(x, y, z));
        } else {
            const worldPos = this.worldPosition;
            const newWorldPos = worldPos.add(new Vec3(x, y, z));
            this.worldPosition = newWorldPos;
        }
    }

    translateLocal(x: number, y: number, z: number): void {
        const forward = new Vec3();
        const right = new Vec3();
        const up = new Vec3();
        this.getWorldRotation().transformVector(new Vec3(0, 0, -1), forward);
        this.getWorldRotation().transformVector(new Vec3(1, 0, 0), right);
        this.getWorldRotation().transformVector(new Vec3(0, 1, 0), up);
        const offset = forward.mulScalar(z).add(right.mulScalar(x)).add(up.mulScalar(y));
        this.worldPosition = this.worldPosition.add(offset);
    }

    rotate(x: number, y: number, z: number, space: 'local' | 'world' = 'local'): void {
        const euler = new Vec3(x, y, z);
        const rot = new Quat();
        rot.setFromEulerAngles(euler.x, euler.y, euler.z);
        if (space === 'local') {
            this.localRotation = this.localRotation.mul(rot);
        } else {
            const worldRot = this.getWorldRotation().mul(rot);
            this.setWorldRotation(worldRot);
        }
    }

    lookAt(target: Vec3, up: Vec3 = Vec3.UP): void {
        const m = new Mat4();
        m.setLookAt(this.worldPosition, target, up);
        const rot = new Quat();
        rot.setFromMat4(m);
        this.setWorldRotation(rot);
    }

    getForward(): Vec3 {
        const forward = new Vec3(0, 0, -1);
        this.getWorldRotation().transformVector(forward, forward);
        return forward;
    }

    getUp(): Vec3 {
        const up = new Vec3(0, 1, 0);
        this.getWorldRotation().transformVector(up, up);
        return up;
    }

    getRight(): Vec3 {
        const right = new Vec3(1, 0, 0);
        this.getWorldRotation().transformVector(right, right);
        return right;
    }

    private _updateLocalTransform(): void {
        this._localTransform.setTRS(this._position, this._rotation, this._scale);
    }

    private _updateFromLocalTransform(): void {
        this._localTransform.getTranslation(this._position);
        this._localTransform.getRotation(this._rotation);
        this._localTransform.getScale(this._scale);
    }

    private _updateWorldTransform(): void {
        if (this._parent) {
            this._worldTransform.copy(this._parent.worldTransform).mul(this._localTransform);
        } else {
            this._worldTransform.copy(this._localTransform);
        }
        this._dirty = false;
    }

    private _setDirty(): void {
        this._dirty = true;
        for (let i = 0; i < this._children.length; i++) {
            this._children[i]._setDirty();
        }
    }
}
