import { EventEmitter } from '../core/event-emitter';
import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';
import { Mat4 } from '../math/mat4';

export class Bone {
    name: string;
    parent: Bone | null;
    children: Bone[];
    transform: Mat4;
    position: Vec3;
    rotation: Quat;
    scale: Vec3;
    worldTransform: Mat4;
    worldPosition: Vec3;
    worldRotation: Quat;
    worldScale: Vec3;
    dirty: boolean;

    constructor(name: string = '') {
        this.name = name;
        this.parent = null;
        this.children = [];
        this.transform = new Mat4();
        this.position = new Vec3();
        this.rotation = new Quat();
        this.scale = new Vec3(1, 1, 1);
        this.worldTransform = new Mat4();
        this.worldPosition = new Vec3();
        this.worldRotation = new Quat();
        this.worldScale = new Vec3(1, 1, 1);
        this.dirty = true;
    }

    setPosition(x: number | Vec3, y?: number, z?: number): void {
        if (typeof x === 'number') {
            this.position.set(x, y!, z!);
        } else {
            this.position.copy(x);
        }
        this.dirty = true;
    }

    setRotation(x: number | Quat, y?: number, z?: number, w?: number): void {
        if (typeof x === 'number') {
            this.rotation.set(x, y!, z!, w!);
        } else {
            this.rotation.copy(x);
        }
        this.dirty = true;
    }

    setScale(x: number | Vec3, y?: number, z?: number): void {
        if (typeof x === 'number') {
            this.scale.set(x, y!, z!);
        } else {
            this.scale.copy(x);
        }
        this.dirty = true;
    }

    setTRS(position: Vec3, rotation: Quat, scale: Vec3): void {
        this.position.copy(position);
        this.rotation.copy(rotation);
        this.scale.copy(scale);
        this.dirty = true;
    }

    updateFromTransform(): void {
        this.transform.setTRS(this.position, this.rotation, this.scale);
    }

    updateWorldTransform(): void {
        if (!this.dirty && this.parent && !this.parent.dirty) {
            return;
        }

        this.updateFromTransform();

        if (this.parent) {
            this.worldTransform.mul2(this.parent.worldTransform, this.transform);
        } else {
            this.worldTransform.copy(this.transform);
        }

        this.worldTransform.getTranslation(this.worldPosition);
        this.worldTransform.getScale(this.worldScale);
        this.worldRotation.setFromMat4(this.worldTransform);

        this.dirty = false;

        for (let i = 0; i < this.children.length; i++) {
            this.children[i].dirty = true;
            this.children[i].updateWorldTransform();
        }
    }

    addChild(child: Bone): void {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
        child.dirty = true;
    }

    removeChild(child: Bone): void {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
            child.dirty = true;
        }
    }

    findByName(name: string): Bone | null {
        if (this.name === name) {
            return this;
        }
        for (let i = 0; i < this.children.length; i++) {
            const result = this.children[i].findByName(name);
            if (result) {
                return result;
            }
        }
        return null;
    }

    getPath(): string {
        const path: string[] = [];
        let current: Bone | null = this;
        while (current) {
            path.unshift(current.name);
            current = current.parent;
        }
        return path.join('/');
    }

    clone(): Bone {
        const clone = new Bone(this.name);
        clone.position.copy(this.position);
        clone.rotation.copy(this.rotation);
        clone.scale.copy(this.scale);
        return clone;
    }

    destroy(): void {
        while (this.children.length > 0) {
            this.removeChild(this.children[0]);
        }
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
