import { Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';

/**
 * Hierarchical scene graph node.
 */
export class GraphNode {
    parent: GraphNode | null = null;
    children: GraphNode[] = [];
    localTransform: Mat4 = new Mat4();
    worldTransform: Mat4 = new Mat4();
    enabled: boolean = true;

    /**
     * Attach a child node to this node.
     * @param node - The node to be added as a child.
     * @throws {TypeError} If `node` is not an instance of GraphNode.
     * @throws {Error} If `node` is already a descendant of this node to prevent cycles.
     */
    addChild(node: GraphNode): void {
        if (!(node instanceof GraphNode)) {
            throw new TypeError('Expected node to be an instance of GraphNode');
        }
        if (node === this || this.isDescendantOf(node)) {
            throw new Error('Cannot add node as a child of itself or its own descendant');
        }
        if (node.parent) {
            node.parent.removeChild(node);
        }
        node.parent = this;
        this.children.push(node);
    }

    /**
     * Detach a child node from this node.
     * @param node - The node to be removed.
     * @returns `true` if the node was removed, `false` if it was not a child.
     * @throws {TypeError} If `node` is not an instance of GraphNode.
     */
    removeChild(node: GraphNode): boolean {
        if (!(node instanceof GraphNode)) {
            throw new TypeError('Expected node to be an instance of GraphNode');
        }
        const index = this.children.indexOf(node);
        if (index !== -1) {
            this.children.splice(index, 1);
            node.parent = null;
            return true;
        }
        return false;
    }

    /**
     * Recompute the world transform matrix for this node and all its descendants.
     * Must be called after any local transform changes to propagate updates.
     */
    updateWorldTransform(): void {
        if (this.parent) {
            this.worldTransform.copy(this.parent.worldTransform).mul(this.localTransform);
        } else {
            this.worldTransform.copy(this.localTransform);
        }
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].updateWorldTransform();
        }
    }

    /**
     * Search for a descendant node by name (case-sensitive).
     * @param name - The name to search for.
     * @returns The first matching node or `null` if none found.
     * @throws {TypeError} If `name` is not a string.
     */
    findByName(name: string): GraphNode | null {
        if (typeof name !== 'string') {
            throw new TypeError('Expected name to be a string');
        }
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i];
            if ((child as any).name === name) {
                return child;
            }
            const result = child.findByName(name);
            if (result) {
                return result;
            }
        }
        return null;
    }

    /**
     * Traverse this node and all of its descendants depth-first.
     * @param callback - Function to call for each visited node.
     * @throws {TypeError} If `callback` is not a function.
     */
    forEach(callback: (node: GraphNode) => void): void {
        if (typeof callback !== 'function') {
            throw new TypeError('Expected callback to be a function');
        }
        callback(this);
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].forEach(callback);
        }
    }

    /**
     * Set the local-space position of this node.
     * @param pos - The new local position.
     * @throws {TypeError} If `pos` is not an instance of Vec3.
     */
    setLocalPosition(pos: Vec3): void {
        if (!(pos instanceof Vec3)) {
            throw new TypeError('Expected pos to be an instance of Vec3');
        }
        const translation = new Vec3();
        const rotation = new Quat();
        const scale = new Vec3();
        this.localTransform.decompose(translation, rotation, scale);
        translation.copy(pos);
        this.localTransform.setTRS(translation, rotation, scale);
    }

    /**
     * Get the world-space position of this node.
     * @returns A new Vec3 with the world position.
     */
    getWorldPosition(): Vec3 {
        const translation = new Vec3();
        const rotation = new Quat();
        const scale = new Vec3();
        this.worldTransform.decompose(translation, rotation, scale);
        return translation;
    }

    /**
     * Set the local-space rotation of this node.
     * @param rot - The new local rotation.
     * @throws {TypeError} If `rot` is not an instance of Quat.
     */
    setLocalRotation(rot: Quat): void {
        if (!(rot instanceof Quat)) {
            throw new TypeError('Expected rot to be an instance of Quat');
        }
        const translation = new Vec3();
        const rotation = new Quat();
        const scale = new Vec3();
        this.localTransform.decompose(translation, rotation, scale);
        rotation.copy(rot);
        this.localTransform.setTRS(translation, rotation, scale);
    }

    /**
     * Orient this node to look at a target position in local space.
     * @param target - The point to look at in local space.
     * @param up - The local up direction.
     * @throws {TypeError} If `target` or `up` is not an instance of Vec3.
     */
    lookAt(target: Vec3, up: Vec3): void {
        if (!(target instanceof Vec3)) {
            throw new TypeError('Expected target to be an instance of Vec3');
        }
        if (!(up instanceof Vec3)) {
            throw new TypeError('Expected up to be an instance of Vec3');
        }
        const position = new Vec3();
        const rotation = new Quat();
        const scale = new Vec3();
        this.localTransform.decompose(position, rotation, scale);
        
        const m = new Mat4();
        m.lookAt(position, target, up);
        m.getEulerAngles(rotation);
        
        this.localTransform.setTRS(position, rotation, scale);
    }

    /**
     * Check if this node is a descendant of another node.
     * @param ancestor - The potential ancestor node.
     * @returns `true` if this node is a descendant of `ancestor`, `false` otherwise.
     * @throws {TypeError} If `ancestor` is not an instance of GraphNode.
     */
    private isDescendantOf(ancestor: GraphNode): boolean {
        if (!(ancestor instanceof GraphNode)) {
            throw new TypeError('Expected ancestor to be an instance of GraphNode');
        }
        let node: GraphNode | null = this.parent;
        while (node) {
            if (node === ancestor) return true;
            node = node.parent;
        }
        return false;
    }
}
