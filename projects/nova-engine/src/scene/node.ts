import { Transform } from './Transform';
import { Component } from './Component';
import { Scene } from './Scene';
import { Vec3 } from '../math/Vec3';
import { Quat } from '../math/Quat';
import { Mat4 } from '../math/Mat4';

export class Node {
    name: string = 'Node';
    parent: Node | null = null;
    children: Node[] = [];
    transform: Transform;
    components: Component[] = [];
    scene: Scene | null = null;
    active: boolean = true;

    constructor() {
        this.transform = new Transform();
        this.transform.node = this;
    }

    addChild(child: Node): void {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
        child.scene = this.scene;
    }

    removeChild(child: Node): void {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
            child.scene = null;
        }
    }

    getChild(index: number): Node {
        return this.children[index];
    }

    getChildCount(): number {
        return this.children.length;
    }

    findChildByName(name: string): Node | null {
        for (const child of this.children) {
            if (child.name === name) {
                return child;
            }
            const found = child.findChildByName(name);
            if (found) {
                return found;
            }
        }
        return null;
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
        this.getComponentsInChildrenRecursive(type, results);
        return results;
    }

    private getComponentsInChildrenRecursive<T extends Component>(type: new () => T, results: T[]): void {
        for (const component of this.components) {
            if (component instanceof type) {
                results.push(component as T);
            }
        }
        for (const child of this.children) {
            child.getComponentsInChildrenRecursive(type, results);
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

    getWorldPosition(): Vec3 {
        const worldMatrix = this.getWorldMatrix();
        return new Vec3(worldMatrix.data[12], worldMatrix.data[13], worldMatrix.data[14]);
    }

    getWorldRotation(): Quat {
        const worldMatrix = this.getWorldMatrix();
        const scale = this.getWorldScale();
        const rotMatrix = new Mat4();
        
        rotMatrix.data[0] = worldMatrix.data[0] / scale.x;
        rotMatrix.data[1] = worldMatrix.data[1] / scale.x;
        rotMatrix.data[2] = worldMatrix.data[2] / scale.x;
        rotMatrix.data[4] = worldMatrix.data[4] / scale.y;
        rotMatrix.data[5] = worldMatrix.data[5] / scale.y;
        rotMatrix.data[6] = worldMatrix.data[6] / scale.y;
        rotMatrix.data[8] = worldMatrix.data[8] / scale.z;
        rotMatrix.data[9] = worldMatrix.data[9] / scale.z;
        rotMatrix.data[10] = worldMatrix.data[10] / scale.z;
        
        return Quat.fromMat4(rotMatrix);
    }

    private getWorldMatrix(): Mat4 {
        if (this.parent) {
            const parentMatrix = this.parent.getWorldMatrix();
            const localMatrix = this.transform.getMatrix();
            return Mat4.multiply(parentMatrix, localMatrix);
        } else {
            return this.transform.getMatrix();
        }
    }

    private getWorldScale(): Vec3 {
        const worldMatrix = this.getWorldMatrix();
        return new Vec3(
            Math.sqrt(worldMatrix.data[0] * worldMatrix.data[0] + worldMatrix.data[1] * worldMatrix.data[1] + worldMatrix.data[2] * worldMatrix.data[2]),
            Math.sqrt(worldMatrix.data[4] * worldMatrix.data[4] + worldMatrix.data[5] * worldMatrix.data[5] + worldMatrix.data[6] * worldMatrix.data[6]),
            Math.sqrt(worldMatrix.data[8] * worldMatrix.data[8] + worldMatrix.data[9] * worldMatrix.data[9] + worldMatrix.data[10] * worldMatrix.data[10])
        );
    }

    lookAt(target: Vec3, up: Vec3 = Vec3.UP): void {
        const position = this.transform.position;
        const forward = Vec3.sub(target, position).normalize();
        const right = Vec3.cross(forward, up).normalize();
        const newUp = Vec3.cross(right, forward).normalize();
        
        const rotationMatrix = new Mat4();
        rotationMatrix.data[0] = right.x;
        rotationMatrix.data[1] = right.y;
        rotationMatrix.data[2] = right.z;
        rotationMatrix.data[4] = newUp.x;
        rotationMatrix.data[5] = newUp.y;
        rotationMatrix.data[6] = newUp.z;
        rotationMatrix.data[8] = -forward.x;
        rotationMatrix.data[9] = -forward.y;
        rotationMatrix.data[10] = -forward.z;
        
        this.transform.rotation = Quat.fromMat4(rotationMatrix);
    }

    destroy(): void {
        while (this.children.length > 0) {
            this.children[0].destroy();
        }
        if (this.parent) {
            this.parent.removeChild(this);
        }
        if (this.scene) {
            this.scene.deleteObject(this);
        }
        this.components.forEach(component => component.destroy());
        this.components = [];
    }
}
