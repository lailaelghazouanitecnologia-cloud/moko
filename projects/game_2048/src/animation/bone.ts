import { Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';

/**
 * Represents a single skeletal bone for skeletal animation.
 * Bones form a hierarchical skeleton structure where each bone's transform
 * is relative to its parent bone.
 */
export class Bone {
    name: string;
    parent: Bone | null;
    children: Bone[];
    localTransform: Mat4;
    worldTransform: Mat4;
    invBindTransform: Mat4;

    /**
     * Creates a new Bone instance.
     * @param name - The name of the bone (default: empty string)
     * @param parent - The parent bone (default: null)
     */
    constructor(name: string = '', parent: Bone | null = null) {
        this.name = name;
        this.parent = parent;
        this.children = [];
        this.localTransform = new Mat4();
        this.worldTransform = new Mat4();
        this.invBindTransform = new Mat4();
    }

    /**
     * Updates the world transform of this bone and all its descendants.
     * @param parentWorld - Optional parent world transform to use instead of parent's worldTransform
     */
    updateWorld(parentWorld?: Mat4): void {
        if (parentWorld) {
            if (!this.isValidMat4(parentWorld)) {
                throw new Error('Invalid parentWorld matrix provided');
            }
            this.worldTransform.copy(parentWorld).mul(this.localTransform);
        } else if (this.parent) {
            this.worldTransform.copy(this.parent.worldTransform).mul(this.localTransform);
        } else {
            this.worldTransform.copy(this.localTransform);
        }

        for (let i = 0; i < this.children.length; i++) {
            this.children[i].updateWorld(this.worldTransform);
        }
    }

    /**
     * Sets the local transform from translation, rotation, and scale components.
     * @param t - Translation vector
     * @param r - Rotation quaternion
     * @param s - Scale vector
     */
    setLocal(t: Vec3, r: Quat, s: Vec3): void {
        if (!this.isValidVec3(t)) {
            throw new Error('Invalid translation vector');
        }
        if (!this.isValidQuat(r)) {
            throw new Error('Invalid rotation quaternion');
        }
        if (!this.isValidVec3(s)) {
            throw new Error('Invalid scale vector');
        }
        this.localTransform.setTRS(t, r, s);
    }

    /**
     * Gets the local transform components (translation, rotation, scale).
     * @returns Object containing translation, rotation, and scale
     */
    getLocal(): {t: Vec3, r: Quat, s: Vec3} {
        const t = new Vec3();
        const r = new Quat();
        const s = new Vec3();
        this.localTransform.decompose(t, r, s);
        return {t, r, s};
    }

    /**
     * Orients the bone to look at a target position.
     * @param target - Target position to look at
     * @param up - Up direction vector
     */
    lookAt(target: Vec3, up: Vec3): void {
        if (!this.isValidVec3(target)) {
            throw new Error('Invalid target vector');
        }
        if (!this.isValidVec3(up)) {
            throw new Error('Invalid up vector');
        }
        const m = new Mat4();
        m.setLookAt(this.getWorldPosition(), target, up);
        this.localTransform.copy(m);
    }

    /**
     * Attaches a child bone to this bone.
     * @param child - The bone to attach as a child
     */
    attach(child: Bone): void {
        if (!child) {
            throw new Error('Cannot attach null child bone');
        }
        if (!(child instanceof Bone)) {
            throw new Error('Child must be a Bone instance');
        }
        if (child === this) {
            throw new Error('Cannot attach bone to itself');
        }
        if (this.isAncestorOf(child)) {
            throw new Error('Cannot create circular bone hierarchy');
        }
        if (child.parent) {
            child.detach();
        }
        child.parent = this;
        this.children.push(child);
    }

    /**
     * Detaches this bone from its parent.
     */
    detach(): void {
        if (this.parent) {
            const index = this.parent.children.indexOf(this);
            if (index !== -1) {
                this.parent.children.splice(index, 1);
            }
            this.parent = null;
        }
    }

    /**
     * Creates a deep copy of this bone and all its descendants.
     * @returns A new Bone instance with copied transforms and hierarchy
     */
    clone(): Bone {
        const clone = new Bone(this.name);
        clone.localTransform.copy(this.localTransform);
        clone.worldTransform.copy(this.worldTransform);
        clone.invBindTransform.copy(this.invBindTransform);
        
        for (let i = 0; i < this.children.length; i++) {
            const childClone = this.children[i].clone();
            clone.attach(childClone);
        }
        
        return clone;
    }

    /**
     * Computes the average length to child bones.
     * @returns The average distance to child bones, or 0 if no children
     */
    computeLength(): number {
        if (this.children.length === 0) {
            return 0;
        }
        
        let totalLength = 0;
        const thisPos = this.getWorldPosition();
        
        for (let i = 0; i < this.children.length; i++) {
            const childPos = this.children[i].getWorldPosition();
            totalLength += thisPos.distance(childPos);
        }
        
        return totalLength / this.children.length;
    }

    /**
     * Gets the world position of this bone.
     * @returns The world position as a Vec3
     */
    private getWorldPosition(): Vec3 {
        const pos = new Vec3();
        this.worldTransform.getTranslation(pos);
        return pos;
    }

    /**
     * Checks if this bone is an ancestor of another bone.
     * @param bone - The bone to check
     * @returns True if this bone is an ancestor
     */
    private isAncestorOf(bone: Bone): boolean {
        let current = bone.parent;
        while (current) {
            if (current === this) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    /**
     * Validates if a Vec3 is valid (not null/undefined and has numeric components).
     * @param v - The vector to validate
     * @returns True if valid
     */
    private isValidVec3(v: Vec3): boolean {
        return v !== null && v !== undefined &&
               typeof v.x === 'number' && isFinite(v.x) &&
               typeof v.y === 'number' && isFinite(v.y) &&
               typeof v.z === 'number' && isFinite(v.z);
    }

    /**
     * Validates if a Quat is valid (not null/undefined and has numeric components).
     * @param q - The quaternion to validate
     * @returns True if valid
     */
    private isValidQuat(q: Quat): boolean {
        return q !== null && q !== undefined &&
               typeof q.x === 'number' && isFinite(q.x) &&
               typeof q.y === 'number' && isFinite(q.y) &&
               typeof q.z === 'number' && isFinite(q.z) &&
               typeof q.w === 'number' && isFinite(q.w);
    }

    /**
     * Validates if a Mat4 is valid (not null/undefined).
     * @param m - The matrix to validate
     * @returns True if valid
     */
    private isValidMat4(m: Mat4): boolean {
        return m !== null && m !== undefined;
    }
}
