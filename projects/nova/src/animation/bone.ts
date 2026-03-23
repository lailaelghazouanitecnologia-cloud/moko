import { Vec3, Quat, Mat4 } from '../math';

export class Bone {
    name: string;
    position: Vec3;
    rotation: Quat;
    scale: Vec3;
    worldPosition: Vec3;
    worldRotation: Quat;
    worldScale: Vec3;
    worldMatrix: Mat4;

    constructor(name: string = '') {
        this.name = name;
        this.position = new Vec3();
        this.rotation = new Quat();
        this.scale = new Vec3(1, 1, 1);
        this.worldPosition = new Vec3();
        this.worldRotation = new Quat();
        this.worldScale = new Vec3(1, 1, 1);
        this.worldMatrix = new Mat4();
    }

    setPosition(x: number, y: number, z: number): void {
        this.position.set(x, y, z);
    }

    setRotation(x: number, y: number, z: number, w: number): void {
        this.rotation.set(x, y, z, w);
    }

    setEulerAngles(x: number, y: number, z: number): void {
        this.rotation.setFromEulerAngles(x, y, z);
    }

    setScale(x: number, y: number, z: number): void {
        this.scale.set(x, y, z);
    }

    translate(x: number, y: number, z: number): void {
        this.position.add(new Vec3(x, y, z));
    }

    rotate(x: number, y: number, z: number): void {
        const q = new Quat();
        q.setFromEulerAngles(x, y, z);
        this.rotation.mul(q);
    }

    lookAt(target: Vec3, up: Vec3): void {
        const m = new Mat4();
        m.setLookAt(this.worldPosition, target, up);
        this.worldRotation.setFromMat4(m);
    }

    getWorldPosition(): Vec3 {
        return this.worldPosition.clone();
    }

    getWorldRotation(): Quat {
        return this.worldRotation.clone();
    }

    getWorldMatrix(): Mat4 {
        return this.worldMatrix.clone();
    }

    updateWorldMatrix(parentMat?: Mat4): void {
        const localMatrix = new Mat4();
        localMatrix.setTRS(this.position, this.rotation, this.scale);
        
        if (parentMat) {
            this.worldMatrix.mul2(parentMat, localMatrix);
        } else {
            this.worldMatrix.copy(localMatrix);
        }
        
        this.worldMatrix.getTranslation(this.worldPosition);
        this.worldMatrix.getScale(this.worldScale);
        
        const rotMatrix = new Mat4();
        rotMatrix.copy(this.worldMatrix);
        const scale = this.worldScale;
        const invScale = new Vec3(1 / scale.x, 1 / scale.y, 1 / scale.z);
        rotMatrix.scale(invScale);
        this.worldRotation.setFromMat4(rotMatrix);
    }

    clone(): Bone {
        const bone = new Bone(this.name);
        bone.position.copy(this.position);
        bone.rotation.copy(this.rotation);
        bone.scale.copy(this.scale);
        bone.worldPosition.copy(this.worldPosition);
        bone.worldRotation.copy(this.worldRotation);
        bone.worldScale.copy(this.worldScale);
        bone.worldMatrix.copy(this.worldMatrix);
        return bone;
    }
}
