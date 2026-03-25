import { Bone } from './bone';
import { Mat4 } from '../math/mat4';

/**
 * Hierarchical bone structure for skeletal animation.
 * Manages a collection of bones, their relationships, and skinning data.
 */
export class Skeleton {
    bones: Bone[] = [];
    rootBone: Bone | null = null;
    bindPose: Float32Array;
    inverseBindMatrices: Float32Array;

    constructor() {
        this.bindPose = new Float32Array(0);
        this.inverseBindMatrices = new Float32Array(0);
    }

    /**
     * Adds a bone to the skeleton if it is not already present.
     * Automatically sets the root bone if none exists and the added bone has no parent.
     * @param bone - The bone to add.
     * @throws {TypeError} If bone is not a valid Bone instance.
     */
    addBone(bone: Bone): void {
        if (!(bone instanceof Bone)) {
            throw new TypeError('Expected bone to be an instance of Bone');
        }
        if (!this.bones.includes(bone)) {
            this.bones.push(bone);
            if (!this.rootBone && !bone.parent) {
                this.rootBone = bone;
            }
        }
    }

    /**
     * Removes a bone from the skeleton.
     * If the removed bone was the root, a new root is selected from bones without parents.
     * @param bone - The bone to remove.
     * @throws {TypeError} If bone is not a valid Bone instance.
     */
    removeBone(bone: Bone): void {
        if (!(bone instanceof Bone)) {
            throw new TypeError('Expected bone to be an instance of Bone');
        }
        const index = this.bones.indexOf(bone);
        if (index !== -1) {
            this.bones.splice(index, 1);
            if (this.rootBone === bone) {
                this.rootBone = this.bones.find(b => !b.parent) || null;
            }
        }
    }

    /**
     * Retrieves a bone by its name.
     * @param name - The name of the bone to find.
     * @returns The bone with the specified name, or null if not found.
     * @throws {TypeError} If name is not a non-empty string.
     */
    getBone(name: string): Bone | null {
        if (typeof name !== 'string' || name.length === 0) {
            throw new TypeError('Expected name to be a non-empty string');
        }
        return this.bones.find(bone => bone.name === name) || null;
    }

    /**
     * Updates the world transforms for the entire bone hierarchy.
     * Starts from the root bone and processes all top-level bones.
     */
    updateHierarchy(): void {
        if (this.rootBone) {
            this.rootBone.updateWorld();
        }
        for (const bone of this.bones) {
            if (bone.parent === null && bone !== this.rootBone) {
                bone.updateWorld();
            }
        }
    }

    /**
     * Computes the skinning matrices for all bones.
     * Each matrix is the product of the bone's world transform and its inverse bind transform.
     * @returns A flat Float32Array of 4x4 matrices in column-major order.
     * @throws {Error} If no bones are present.
     */
    computeSkinningMatrices(): Float32Array {
        if (this.bones.length === 0) {
            throw new Error('Cannot compute skinning matrices for an empty skeleton');
        }
        const numBones = this.bones.length;
        const matrices = new Float32Array(numBones * 16);
        
        for (let i = 0; i < numBones; i++) {
            const bone = this.bones[i];
            const offset = i * 16;
            const skinMatrix = new Mat4();
            
            skinMatrix.multiply2(bone.worldTransform, bone.invBindTransform);
            
            for (let j = 0; j < 16; j++) {
                matrices[offset + j] = skinMatrix.data[j];
            }
        }
        
        return matrices;
    }

    /**
     * Validates the integrity of the skeleton.
     * Checks for non-empty bones, unique names, and required transforms.
     * @returns True if the skeleton is valid, false otherwise.
     */
    validate(): boolean {
        if (this.bones.length === 0) return false;
        
        for (const bone of this.bones) {
            if (!bone.name) return false;
            if (!bone.localTransform || !bone.worldTransform || !bone.invBindTransform) return false;
        }
        
        const boneNames = new Set(this.bones.map(b => b.name));
        if (boneNames.size !== this.bones.length) return false;
        
        return true;
    }

    /**
     * Clears all bones and resets the skeleton to its initial state.
     */
    clear(): void {
        this.bones.length = 0;
        this.rootBone = null;
        this.bindPose = new Float32Array(0);
        this.inverseBindMatrices = new Float32Array(0);
    }

    /**
     * Returns the number of bones in the skeleton.
     */
    get boneCount(): number {
        return this.bones.length;
    }

    /**
     * Returns an immutable copy of the bones array.
     */
    getBones(): readonly Bone[] {
        return this.bones.slice();
    }

    /**
     * Sets the bind pose and inverse bind matrices from provided data.
     * @param bindPose - Flat array of 4x4 matrices in column-major order.
     * @param inverseBindMatrices - Flat array of 4x4 inverse bind matrices.
     * @throws {TypeError} If arrays are not Float32Array or lengths do not match 16 * bone count.
     */
    setBindData(bindPose: Float32Array, inverseBindMatrices: Float32Array): void {
        if (!(bindPose instanceof Float32Array) || !(inverseBindMatrices instanceof Float32Array)) {
            throw new TypeError('Expected bindPose and inverseBindMatrices to be Float32Array instances');
        }
        const expectedLength = this.bones.length * 16;
        if (bindPose.length !== expectedLength || inverseBindMatrices.length !== expectedLength) {
            throw new RangeError('Array lengths must equal 16 * bone count');
        }
        this.bindPose = bindPose.slice();
        this.inverseBindMatrices = inverseBindMatrices.slice();
    }
}
