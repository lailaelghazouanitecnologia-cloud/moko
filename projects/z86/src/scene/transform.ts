import { Component } from './Component';
import { Vec3 } from '../core/math/vec3';
import { Quat } from '../core/math/quat';
import { Mat4 } from '../core/math/mat4';

export class Transform extends Component {
    position: Vec3;
    rotation: Quat;
    scale: Vec3;
    right: Vec3;
    up: Vec3;
    forward: Vec3;
    matrix: Mat4;
    translationMatrix: Mat4;
    rotationMatrix: Mat4;
    scaleMatrix: Mat4;
    dirty: boolean;

    constructor() {
        super();
        this.initMatrix();
        this.position = new Vec3(0, 0, 0);
        this.rotation = new Quat(0, 0, 0, 1);
        this.scale = new Vec3(1, 1, 1);
        this.right = new Vec3(1, 0, 0);
        this.up = new Vec3(0, 1, 0);
        this.forward = new Vec3(0, 0, -1);
        this.dirty = true;
    }

    generateLocalSpaceMatrix(): void {
        this.translationMatrix.setIdentity();
        this.translationMatrix.translate(this.position);

        this.rotationMatrix.setIdentity();
        const rotMat = new Mat4();
        rotMat.setTRS(new Vec3(0, 0, 0), this.rotation, new Vec3(1, 1, 1));
        this.rotationMatrix.mul(rotMat);

        this.scaleMatrix.setIdentity();
        this.scaleMatrix.scale(this.scale);

        this.matrix.setIdentity();
        this.matrix.mul(this.translationMatrix);
        this.matrix.mul(this.rotationMatrix);
        this.matrix.mul(this.scaleMatrix);
    }

    generateMatrix(): void {
        if (this.dirty) {
            this.generateLocalSpaceMatrix();
            this.dirty = false;
        }
    }

    initMatrix(): void {
        this.matrix = new Mat4();
        this.translationMatrix = new Mat4();
        this.rotationMatrix = new Mat4();
        this.scaleMatrix = new Mat4();
        this.matrix.setIdentity();
        this.translationMatrix.setIdentity();
        this.rotationMatrix.setIdentity();
        this.scaleMatrix.setIdentity();
    }

    setPosition(x: number | Vec3, y?: number, z?: number): void {
        if (x instanceof Vec3) {
            this.position.copy(x);
        } else {
            this.position.set(x, y!, z!);
        }
        this.dirty = true;
    }

    setRotation(x: number | Quat, y?: number, z?: number, w?: number): void {
        if (x instanceof Quat) {
            this.rotation.copy(x);
        } else {
            this.rotation.set(x, y!, z!, w!);
        }
        this.dirty = true;
    }

    setScale(x: number | Vec3, y?: number, z?: number): void {
        if (x instanceof Vec3) {
            this.scale.copy(x);
        } else {
            this.scale.set(x, y!, z!);
        }
        this.dirty = true;
    }

    translate(delta: Vec3): void {
        this.position.add(delta);
        this.dirty = true;
    }

    rotate(angle: number, axis: Vec3): void {
        const rot = new Quat();
        rot.setFromAxisAngle(axis, angle);
        this.rotation.mul(rot);
        this.dirty = true;
    }

    lookAt(target: Vec3, up?: Vec3): void {
        const lookAtMat = new Mat4();
        const upVec = up || new Vec3(0, 1, 0);
        lookAtMat.lookAt(this.position, target, upVec);
        this.rotation.setFromMat4(lookAtMat);
        this.dirty = true;
    }
}
