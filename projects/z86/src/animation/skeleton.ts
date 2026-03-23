import { EventEmitter } from '../core/event-emitter';
import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';
import { Mat4 } from '../math/mat4';
import { Bone } from './bone';

export class Skeleton extends EventEmitter {
    private _bones: Bone[] = [];
    private _parentIndex: Int32Array;
    private _localTransforms: Mat4[];
    private _worldTransforms: Mat4[];
    private _dirty: boolean = true;

    constructor(boneCount: number) {
        super();
        this._parentIndex = new Int32Array(boneCount);
        this._localTransforms = new Array(boneCount);
        this._worldTransforms = new Array(boneCount);
        for (let i = 0; i < boneCount; i++) {
            this._parentIndex[i] = -1;
            this._localTransforms[i] = new Mat4();
            this._worldTransforms[i] = new Mat4();
        }
    }

    addBone(bone: Bone, parentIndex: number = -1): number {
        const index = this._bones.length;
        this._bones.push(bone);
        if (index >= this._parentIndex.length) {
            const newParentIndex = new Int32Array(index + 1);
            newParentIndex.set(this._parentIndex);
            this._parentIndex = newParentIndex;
            this._localTransforms.push(new Mat4());
            this._worldTransforms.push(new Mat4());
        }
        this._parentIndex[index] = parentIndex;
        this._dirty = true;
        return index;
    }

    removeBone(index: number): void {
        if (index < 0 || index >= this._bones.length) return;
        this._bones.splice(index, 1);
        const newParentIndex = new Int32Array(this._parentIndex.length - 1);
        let write = 0;
        for (let read = 0; read < this._parentIndex.length; read++) {
            if (read === index) continue;
            let p = this._parentIndex[read];
            if (p > index) p--;
            else if (p === index) p = -1;
            newParentIndex[write++] = p;
        }
        this._parentIndex = newParentIndex;
        this._localTransforms.splice(index, 1);
        this._worldTransforms.splice(index, 1);
        this._dirty = true;
    }

    getBone(index: number): Bone | null {
        return this._bones[index] || null;
    }

    getBoneCount(): number {
        return this._bones.length;
    }

    getParentIndex(index: number): number {
        return this._parentIndex[index];
    }

    setParent(index: number, parentIndex: number): void {
        if (index < 0 || index >= this._parentIndex.length) return;
        this._parentIndex[index] = parentIndex;
        this._dirty = true;
    }

    getLocalTransform(index: number): Mat4 {
        return this._localTransforms[index];
    }

    setLocalTransform(index: number, transform: Mat4): void {
        if (index < 0 || index >= this._localTransforms.length) return;
        this._localTransforms[index].copy(transform);
        this._dirty = true;
    }

    getWorldTransform(index: number): Mat4 {
        this.updateTransforms();
        return this._worldTransforms[index];
    }

    updateTransforms(): void {
        if (!this._dirty) return;
        for (let i = 0; i < this._bones.length; i++) {
            const parent = this._parentIndex[i];
            if (parent >= 0) {
                this._worldTransforms[parent].mul(this._localTransforms[i], this._worldTransforms[i]);
            } else {
                this._worldTransforms[i].copy(this._localTransforms[i]);
            }
        }
        this._dirty = false;
    }

    applyPose(localRotations: Quat[], localPositions: Vec3[]): void {
        const count = Math.min(localRotations.length, localPositions.length, this._bones.length);
        for (let i = 0; i < count; i++) {
            const rot = localRotations[i];
            const pos = localPositions[i];
            const mat = this._localTransforms[i];
            mat.setTRS(pos, rot, Vec3.ONE);
        }
        this._dirty = true;
    }

    getBoneNames(): string[] {
        return this._bones.map(b => b.name);
    }

    findBoneIndex(name: string): number {
        return this._bones.findIndex(b => b.name === name);
    }

    clone(): Skeleton {
        const clone = new Skeleton(this._bones.length);
        for (let i = 0; i < this._bones.length; i++) {
            clone.addBone(this._bones[i].clone(), this._parentIndex[i]);
            clone._localTransforms[i].copy(this._localTransforms[i]);
        }
        clone._dirty = true;
        return clone;
    }

    destroy(): void {
        this._bones.length = 0;
        this._parentIndex = new Int32Array(0);
        this._localTransforms.length = 0;
        this._worldTransforms.length = 0;
        this.emit('destroy');
        this.off();
    }
}
