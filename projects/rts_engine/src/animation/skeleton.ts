import { Mat4 } from '../math/mat4';
import { Bone } from './bone';

/**
 * A hierarchical skeleton composed of bones used for skinning.
 * Manages local transforms, world transforms, and skinning matrices.
 */
export class Skeleton {
    private bones: Bone[] = [];
    private bindPoses: Mat4[] = [];
    private boneMap: Map<string, number> = new Map();

    constructor() {
        this.bones = [];
        this.bindPoses = [];
        this.bindPoses.push(new Mat4());
        this.boneMap = new Map();
    }

    /**
     * Adds a new bone to the skeleton.
     * @param bone The bone to add.
     * @returns The index of the newly added bone.
     * @throws {TypeError} If `bone` is null or undefined.
     * @throws {Error} If a bone with the same name already exists.
     */
    public addBone(bone: Bone): number {
        if (!bone) {
            throw new TypeError('Bone must be defined');
        }
        if (this.boneMap.has(bone.name)) {
            throw new Error(`Bone with name "${bone.name}" already exists`);
        }
        const index = this.bones.length;
        this.bones.push(bone);
        this.bindPoses.push(new Mat4());
        this.boneMap.set(bone.name, index);
        return index;
    }

    /**
     * Finds a bone by name.
     * @param name The name of the bone to find.
     * @returns The requested bone, or null if not found.
     * @throws {TypeError} If `name` is not a non-empty string.
     */
    public findBone(name: string): Bone | null {
        if (typeof name !== 'string' || name.length === 0) {
            throw new TypeError('Bone name must be a non-empty string');
        }
        const index = this.boneMap.get(name);
        if (index === undefined) {
            return null;
        }
        return this.bones[index];
    }

    /**
     * Computes the skinning pose matrices for the current skeleton configuration.
     * @param weights Optional per-bone weights (currently unused).
     * @returns An array of Mat4, one per bone, suitable for passing to the GPU.
     * @throws {Error} If any bone has an invalid parent index.
     */
    public computePose(weights?: number[]): Mat4[] {
        if (weights && !Array.isArray(weights)) {
            throw new TypeError('Weights must be an array of numbers');
        }
        if (weights && weights.length !== this.bones.length) {
            throw new Error(`Weights length (${weights.length}) must match number of bones (${this.bones.length})`);
        }

        const pose: Mat4[] = [];
        const worldTransforms: Mat4[] = [];

        for (let i = 0; i < this.bones.length; i++) {
            const bone = this.bones[i];
            if (!bone) {
                throw new Error(`Bone at index ${i} is undefined`);
            }
            const localTransform = bone.getLocalTransform();
            const worldTransform = new Mat4();

            if (bone.parent >= 0) {
                if (bone.parent >= this.bones.length) {
                    throw new Error(`Invalid parent index ${bone.parent} for bone "${bone.name}"`);
                }
                worldTransform.mul2(worldTransforms[bone.parent], localTransform);
            } else {
                worldTransform.copy(localTransform);
            }

            worldTransforms.push(worldTransform);

            const skinningMatrix = new Mat4();
            const bindPose = this.bindPoses[i];
            const inverseBindPose = new Mat4();
            inverseBindPose.invert(bindPose);
            skinningMatrix.mul2(worldTransform, inverseBindPose);
            pose.push(skinningMatrix);
        }

        return pose;
    }

    /**
     * Retrieves the inverse bind pose matrix for a bone.
     * @param index Index of the bone.
     * @returns The inverse bind pose matrix.
     * @throws {TypeError} If `index` is not an integer.
     * @throws {RangeError} If `index` is out of range.
     */
    public getBindPose(index: number): Mat4 {
        if (!Number.isInteger(index)) {
            throw new TypeError('Bone index must be an integer');
        }
        if (index < 0 || index >= this.bindPoses.length) {
            throw new RangeError(`Bone index ${index} out of range (0..${this.bindPoses.length - 1})`);
        }
        return this.bindPoses[index];
    }

    /**
     * Sets the inverse bind pose matrix for a bone.
     * @param index Index of the bone.
     * @param matrix The new inverse bind pose matrix.
     * @throws {TypeError} If `index` is not an integer or `matrix` is not a Mat4.
     * @throws {RangeError} If `index` is out of range.
     */
    public setBindPose(index: number, matrix: Mat4): void {
        if (!Number.isInteger(index)) {
            throw new TypeError('Bone index must be an integer');
        }
        if (!(matrix instanceof Mat4)) {
            throw new TypeError('Matrix must be an instance of Mat4');
        }
        if (index < 0 || index >= this.bindPoses.length) {
            throw new RangeError(`Bone index ${index} out of range (0..${this.bindPoses.length - 1})`);
        }
        this.bindPoses[index].copy(matrix);
    }

    /**
     * Returns the number of bones in the skeleton.
     */
    public get count(): number {
        return this.bones.length;
    }

    /**
     * Retrieves a bone by index.
     * @param index Index of the bone.
     * @returns The requested bone.
     * @throws {TypeError} If `index` is not an integer.
     * @throws {RangeError} If `index` is out of range.
     */
    public getBone(index: number): Bone {
        if (!Number.isInteger(index)) {
            throw new TypeError('Index must be an integer');
        }
        if (index < 0 || index >= this.bones.length) {
            throw new RangeError(`Index ${index} out of range (0..${this.bones.length - 1})`);
        }
        return this.bones[index];
    }

    /**
     * Removes all bones and resets the skeleton to an empty state.
     */
    public reset(): void {
        this.bones = [];
        this.bindPoses = [];
        this.boneMap.clear();
    }
}
