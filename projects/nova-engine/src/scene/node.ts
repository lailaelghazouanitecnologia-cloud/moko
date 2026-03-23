import { Transform } from './Transform';
import { Component } from './Component';
import { Vec3 } from '../math/Vec3';
import { Quat } from '../math/Quat';
import { Space } from './Space';

export class Node {
    name: string;
    parent: Node | null;
    children: Node[];
    transform: Transform;
    components: Component[];
    tags: Set<string>;
    active: boolean;
    dirty: boolean;

    constructor(name: string = '') {
        this.name = name;
        this.parent = null;
        this.children = [];
        this.transform = new Transform();
        this.components = [];
        this.tags = new Set();
        this.active = true;
        this.dirty = true;
    }

    addChild(child: Node): void {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
        this.dirty = true;
    }

    removeChild(child: Node): void {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
            this.dirty = true;
        }
    }

    setParent(parent: Node | null): void {
        if (this.parent) {
            this.parent.removeChild(this);
        }
        if (parent) {
            parent.addChild(this);
        }
    }

    addComponent<T extends Component>(type: new () => T): T {
        const component = new type();
        component.node = this;
        this.components.push(component);
        return component;
    }

    getComponent<T extends Component>(type: new () => T): T | null {
        for (const component of this.components) {
            if (component instanceof type) {
                return component as T;
            }
        }
        return null;
    }

    getComponentsInChildren<T extends Component>(type: new () => T): T[] {
        const results: T[] = [];
        this._getComponentsInChildrenRecursive(type, results);
        return results;
    }

    private _getComponentsInChildrenRecursive<T extends Component>(type: new () => T, results: T[]): void {
        for (const component of this.components) {
            if (component instanceof type) {
                results.push(component as T);
            }
        }
        for (const child of this.children) {
            child._getComponentsInChildrenRecursive(type, results);
        }
    }

    addTag(tag: string): void {
        this.tags.add(tag);
    }

    removeTag(tag: string): void {
        this.tags.delete(tag);
    }

    hasTag(tag: string): boolean {
        return this.tags.has(tag);
    }

    update(deltaTime: number): void {
        if (!this.active) return;
        
        for (const component of this.components) {
            if (component.enabled) {
                component.update(deltaTime);
            }
        }
        
        for (const child of this.children) {
            child.update(deltaTime);
        }
    }

    getWorldPosition(): Vec3 {
        const worldMatrix = this.getWorldMatrix();
        return new Vec3(worldMatrix[12], worldMatrix[13], worldMatrix[14]);
    }

    getWorldRotation(): Quat {
        const worldMatrix = this.getWorldMatrix();
        const rotationMatrix = worldMatrix.slice(0, 16);
        const quat = new Quat();
        quat.setFromRotationMatrix(rotationMatrix);
        return quat;
    }

    private getWorldMatrix(): number[] {
        if (this.parent) {
            const parentMatrix = this.parent.getWorldMatrix();
            const localMatrix = this.transform.getMatrix();
            const result = new Array(16);
            for (let i = 0; i < 16; i++) {
                result[i] = 0;
                for (let j = 0; j < 4; j++) {
                    result[i] += parentMatrix[Math.floor(i / 4) * 4 + j] * localMatrix[j * 4 + (i % 4)];
                }
            }
            return result;
        } else {
            return this.transform.getMatrix();
        }
    }

    lookAt(target: Vec3, up: Vec3 = new Vec3(0, 1, 0)): void {
        const position = this.transform.position;
        const forward = new Vec3().sub2(target, position).normalize();
        const right = new Vec3().cross(up, forward).normalize();
        const upAdjusted = new Vec3().cross(forward, right).normalize();
        
        const rotation = new Quat().setFromAxes(right, upAdjusted, forward);
        this.transform.rotation.copy(rotation);
        this.dirty = true;
    }

    translate(translation: Vec3, space: Space = Space.Local): void {
        if (space === Space.Local) {
            const rotatedTranslation = new Vec3();
            this.transform.rotation.transformVector(translation, rotatedTranslation);
            this.transform.position.add(rotatedTranslation);
        } else {
            this.transform.position.add(translation);
        }
        this.dirty = true;
    }

    rotate(rotation: Quat, space: Space = Space.Local): void {
        if (space === Space.Local) {
            this.transform.rotation.mul2(rotation, this.transform.rotation);
        } else {
            this.transform.rotation.mul2(this.transform.rotation, rotation);
        }
        this.dirty = true;
    }

    destroy(): void {
        for (const child of [...this.children]) {
            child.destroy();
        }
        for (const component of this.components) {
            component.destroy();
        }
        if (this.parent) {
            this.parent.removeChild(this);
        }
    }
}
