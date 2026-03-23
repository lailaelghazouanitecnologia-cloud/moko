import { EventEmitter } from '../core';
import { Vec3, Quat, Mat4 } from '../math';
import { Bone } from './bone';

export class Skeleton extends EventEmitter {
    private bones: Bone[] = [];
    private boneMap: Map<string, number> = new Map();
    private bindPose: Mat4[] = [];
    private currentPose: Mat4[] = [];
    private worldMatrices: Mat4[] = [];
    private dirty: boolean = true;

    constructor() {
        super();
    }

    addBone(name: string, parentIndex: number = -1): number {
        const bone = new Bone(name, parentIndex);
        const index = this.bones.length;
        this.bones.push(bone);
        this.bindPose.push(new Mat4());
        this.currentPose.push(new Mat4());
        this.worldMatrices.push(new Mat4());
        this.boneMap.set(name, index);
        this.dirty = true;
        return index;
    }

    removeBone(index: number): void {
        if (index < 0 || index >= this.bones.length) return;
        
        const name = this.bones[index].name;
        this.bones.splice(index, 1);
        this.bindPose.splice(index, 1);
        this.currentPose.splice(index, 1);
        this.worldMatrices.splice(index, 1);
        this.boneMap.delete(name);
        
        // Update parent indices for remaining bones
        for (let i = 0; i < this.bones.length; i++) {
            if (this.bones[i].parentIndex >= index) {
                this.bones[i].parentIndex--;
            }
        }
        
        this.dirty = true;
    }

    getBone(index: number): Bone | null {
        return this.bones[index] || null;
    }

    getBoneByName(name: string): Bone | null {
        const index = this.boneMap.get(name);
        return index !== undefined ? this.bones[index] : null;
    }

    getBoneIndex(name: string): number {
        return this.boneMap.get(name) ?? -1;
    }

    getNumBones(): number {
        return this.bones.length;
    }

    setBindPose(index: number, matrix: Mat4): void {
        if (index < 0 || index >= this.bindPose.length) return;
        this.bindPose[index].copy(matrix);
        this.dirty = true;
    }

    getBindPose(index: number): Mat4 | null {
        return this.bindPose[index] || null;
    }

    setCurrentPose(index: number, matrix: Mat4): void {
        if (index < 0 || index >= this.currentPose.length) return;
        this.currentPose[index].copy(matrix);
        this.dirty = true;
    }

    getCurrentPose(index: number): Mat4 | null {
        return this.currentPose[index] || null;
    }

    update(): void {
        if (!this.dirty) return;
        
        for (let i = 0; i < this.bones.length; i++) {
            const bone = this.bones[i];
            const localMatrix = this.currentPose[i];
            
            if (bone.parentIndex >= 0) {
                // Multiply by parent world matrix
                const parentWorld = this.worldMatrices[bone.parentIndex];
                this.worldMatrices[i].mul2(parentWorld, localMatrix);
            } else {
                // Root bone
                this.worldMatrices[i].copy(localMatrix);
            }
        }
        
        this.dirty = false;
    }

    draw(): void {
        // Drawing logic would be implemented here based on graphics device
        // This is a placeholder for rendering skeleton visualization
    }

    bindPose(): void {
        for (let i = 0; i < this.currentPose.length; i++) {
            this.currentPose[i].copy(this.bindPose[i]);
        }
        this.dirty = true;
    }

    getJointWorldMatrix(index: number): Mat4 | null {
        if (index < 0 || index >= this.worldMatrices.length) return null;
        return this.worldMatrices[index];
    }

    getJointLocalMatrix(index: number): Mat4 | null {
        if (index < 0 || index >= this.currentPose.length) return null;
        return this.currentPose[index];
    }

    getJointPosition(index: number): Vec3 | null {
        const matrix = this.getJointWorldMatrix(index);
        if (!matrix) return null;
        return matrix.getTranslation();
    }

    getJointRotation(index: number): Quat | null {
        const matrix = this.getJointWorldMatrix(index);
        if (!matrix) return null;
        const quat = new Quat();
        quat.setFromMat4(matrix);
        return quat;
    }

    getJointScale(index: number): Vec3 | null {
        const matrix = this.getJointWorldMatrix(index);
        if (!matrix) return null;
        return matrix.getScale();
    }

    setJointPosition(index: number, position: Vec3): void {
        if (index < 0 || index >= this.currentPose.length) return;
        const matrix = this.currentPose[index];
        matrix.setTranslation(position);
        this.dirty = true;
    }

    setJointRotation(index: number, rotation: Quat): void {
        if (index < 0 || index >= this.currentPose.length) return;
        const matrix = this.currentPose[index];
        const scale = matrix.getScale();
        const pos = matrix.getTranslation();
        matrix.setTRS(pos, rotation, scale);
        this.dirty = true;
    }

    setJointScale(index: number, scale: Vec3): void {
        if (index < 0 || index >= this.currentPose.length) return;
        const matrix = this.currentPose[index];
        const pos = matrix.getTranslation();
        const rot = new Quat();
        rot.setFromMat4(matrix);
        matrix.setTRS(pos, rot, scale);
        this.dirty = true;
    }

    clear(): void {
        this.bones.length = 0;
        this.bindPose.length = 0;
        this.currentPose.length = 0;
        this.worldMatrices.length = 0;
        this.boneMap.clear();
        this.dirty = true;
    }

    clone(): Skeleton {
        const skeleton = new Skeleton();
        
        for (const bone of this.bones) {
            skeleton.addBone(bone.name, bone.parentIndex);
        }
        
        for (let i = 0; i < this.bindPose.length; i++) {
            skeleton.setBindPose(i, this.bindPose[i]);
            skeleton.setCurrentPose(i, this.currentPose[i]);
        }
        
        return skeleton;
    }
}
