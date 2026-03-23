import { EventEmitter } from '../core';
import { Vec3, Mat4, Quat } from '../math';

export class GraphNode extends EventEmitter {
    private _name: string;
    private _parent: GraphNode | null = null;
    private _children: GraphNode[] = [];
    private _localPosition: Vec3;
    private _localRotation: Quat;
    private _localScale: Vec3;
    private _localTransform: Mat4;
    private _worldTransform: Mat4;
    private _dirty: boolean = true;

    constructor(name: string = 'Node') {
        super();
        this._name = name;
        this._localPosition = new Vec3();
        this._localRotation = new Quat();
        this._localScale = new Vec3(1, 1, 1);
        this._localTransform = new Mat4();
        this._worldTransform = new Mat4();
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

    get children(): ReadonlyArray<GraphNode> {
        return this._children;
    }

    get localPosition(): Vec3 {
        return this._localPosition;
    }

    set localPosition(value: Vec3) {
        this._localPosition.copy(value);
        this._dirty = true;
    }

    get localRotation(): Quat {
        return this._localRotation;
    }

    set localRotation(value: Quat) {
        this._localRotation.copy(value);
        this._dirty = true;
    }

    get localScale(): Vec3 {
        return this._localScale;
    }

    set localScale(value: Vec3) {
        this._localScale.copy(value);
        this._dirty = true;
    }

    getLocalTransform(): Mat4 {
        if (this._dirty) {
            this._localTransform.setTRS(this._localPosition, this._localRotation, this._localScale);
            this._dirty = false;
        }
        return this._localTransform;
    }

    getWorldTransform(): Mat4 {
        if (this._dirty) {
            this.getLocalTransform();
        }
        if (this._parent) {
            const parentWorld = this._parent.getWorldTransform();
            this._worldTransform.mul2(parentWorld, this._localTransform);
        } else {
            this._worldTransform.copy(this._localTransform);
        }
        return this._worldTransform;
    }

    addChild(node: GraphNode): void {
        if (node._parent) {
            node._parent.removeChild(node);
        }
        node._parent = this;
        this._children.push(node);
    }

    removeChild(node: GraphNode): boolean {
        const index = this._children.indexOf(node);
        if (index !== -1) {
            this._children.splice(index, 1);
            node._parent = null;
            return true;
        }
        return false;
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
        }
        return null;
    }

    findChildRecursive(name: string): GraphNode | null {
        for (const child of this._children) {
            if (child.name === name) {
                return child;
            }
            const found = child.findChildRecursive(name);
            if (found) {
                return found;
            }
        }
        return null;
    }

    update(): void {
        this.getWorldTransform();
        for (const child of this._children) {
            child.update();
        }
    }

    setPosition(x: number, y: number, z: number): void {
        this._localPosition.set(x, y, z);
        this._dirty = true;
    }

    setRotation(x: number, y: number, z: number, w: number): void {
        this._localRotation.set(x, y, z, w);
        this._dirty = true;
    }

    setScale(x: number, y: number, z: number): void {
        this._localScale.set(x, y, z);
        this._dirty = true;
    }

    getPosition(): Vec3 {
        return this._localPosition.clone();
    }

    getRotation(): Quat {
        return this._localRotation.clone();
    }

    getScale(): Vec3 {
        return this._localScale.clone();
    }

    getWorldPosition(): Vec3 {
        const world = this.getWorldTransform();
        return world.getTranslation();
    }

    getWorldRotation(): Quat {
        const world = this.getWorldTransform();
        const quat = new Quat();
        quat.setFromMat4(world);
        return quat;
    }

    getWorldScale(): Vec3 {
        const world = this.getWorldTransform();
        return world.getScale();
    }

    lookAt(target: Vec3, up: Vec3 = Vec3.UP): void {
        const m = new Mat4();
        m.setLookAt(this._localPosition, target, up);
        this._localRotation.setFromMat4(m);
        this._dirty = true;
    }

    translate(x: number, y: number, z: number): void {
        this._localPosition.add(new Vec3(x, y, z));
        this._dirty = true;
    }

    rotate(x: number, y: number, z: number): void {
        const qx = new Quat();
        const qy = new Quat();
        const qz = new Quat();
        qx.setFromEulerAngles(x, 0, 0);
        qy.setFromEulerAngles(0, y, 0);
        qz.setFromEulerAngles(0, 0, z);
        this._localRotation.mul(qx).mul(qy).mul(qz).normalize();
        this._dirty = true;
    }

    clone(): GraphNode {
        const clone = new GraphNode(this._name);
        clone._localPosition.copy(this._localPosition);
        clone._localRotation.copy(this._localRotation);
        clone._localScale.copy(this._localScale);
        for (const child of this._children) {
            clone.addChild(child.clone());
        }
        return clone;
    }

    destroy(): void {
        while (this._children.length > 0) {
            this._children[0].destroy();
        }
        this.removeFromParent();
        this.emit('destroy');
    }
}
