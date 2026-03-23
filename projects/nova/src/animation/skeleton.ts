import { Mat4 } from '../math';
import { Bone } from './bone';

export class Skeleton {
    bones: Bone[] = [];
    hierarchy: number[] = [];
    inverseBindMatrices: Mat4[] = [];

    addBone(bone: Bone): number {
        this.bones.push(bone);
        this.hierarchy.push(-1);
        this.inverseBindMatrices.push(new Mat4());
        return this.bones.length - 1;
    }

    getBone(index: number): Bone {
        return this.bones[index];
    }

    getBoneByName(name: string): Bone | null {
        for (const bone of this.bones) {
            if (bone.name === name) {
                return bone;
            }
        }
        return null;
    }

    getBoneCount(): number {
        return this.bones.length;
    }

    setParent(child: number, parent: number): void {
        this.hierarchy[child] = parent;
    }

    getParent(index: number): number {
        return this.hierarchy[index];
    }

    getChildren(index: number): number[] {
        const children: number[] = [];
        for (let i = 0; i < this.hierarchy.length; i++) {
            if (this.hierarchy[i] === index) {
                children.push(i);
            }
        }
        return children;
    }

    computeWorldMatrices(out: Mat4[]): void {
        for (let i = 0; i < this.bones.length; i++) {
            const bone = this.bones[i];
            const parent = this.hierarchy[i];
            if (parent === -1) {
                out[i].copy(bone.localMatrix);
            } else {
                out[i].mul2(out[parent], bone.localMatrix);
            }
        }
    }

    computeSkinMatrices(out: Mat4[]): void {
        const worldMatrices: Mat4[] = [];
        for (let i = 0; i < this.bones.length; i++) {
            worldMatrices.push(new Mat4());
        }
        this.computeWorldMatrices(worldMatrices);
        for (let i = 0; i < this.bones.length; i++) {
            out[i].mul2(worldMatrices[i], this.inverseBindMatrices[i]);
        }
    }

    update(): void {
        for (const bone of this.bones) {
            bone.dirty = true;
        }
    }

    clone(): Skeleton {
        const clone = new Skeleton();
        for (const bone of this.bones) {
            clone.addBone(bone.clone());
        }
        clone.hierarchy = [...this.hierarchy];
        for (let i = 0; i < this.inverseBindMatrices.length; i++) {
            clone.inverseBindMatrices[i] = new Mat4().copy(this.inverseBindMatrices[i]);
        }
        return clone;
    }
}
