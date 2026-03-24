import { Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';

/**
 * A node in the scene graph that maintains a transform hierarchy.
 * Each node has a local and world transform, and can have any number of children.
 */
export class GraphNode {
    private parent: GraphNode | null = null;
    private children: GraphNode[] = [];
    private localTransform: Mat4 = new Mat4();
    private worldTransform: Mat4 = new Mat4();
    private enabled: boolean = true;
    private dirty: boolean = true;

    /**
     * Adds a child node to this node.
     * If the child already has a parent, it is first removed from that parent.
     * @param child - The node to add as a child.
     * @throws {TypeError} If child is not an instance of GraphNode.
     */
    addChild(child: GraphNode): void {
        if (!(child instanceof GraphNode)) {
            throw new TypeError('Child must be an instance of GraphNode');
        }
        if (child === this) {
            throw new Error('Cannot add a node as a child of itself');
        }
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
        child.markDirty();
    }

    /**
     * Removes a child node from this node.
     * @param child - The node to remove.
     * @throws {TypeError} If child is not an instance of GraphNode.
     */
    removeChild(child: GraphNode): void {
        if (!(child instanceof GraphNode)) {
            throw new TypeError('Child must be an instance of GraphNode');
        }
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
            child.markDirty();
        }
    }

    /**
     * Updates the world transform for this node and all its descendants.
     * If the node is marked dirty, recalculates the world transform from the local transform
     * and the parent's world transform.
     */
    updateWorldTransform(): void {
        if (this.dirty) {
            if (this.parent) {
                this.worldTransform.copy(this.parent.worldTransform).mul(this.localTransform);
            } else {
                this.worldTransform.copy(this.localTransform);
            }
            this.dirty = false;
        }
        for (const child of this.children) {
            child.updateWorldTransform();
        }
    }

    /**
     * Marks this node and all its descendants as dirty, indicating that their world transforms
     * need to be recalculated.
     */
    markDirty(): void {
        this.dirty = true;
        for (const child of this.children) {
            child.markDirty();
        }
    }

    /**
     * Performs a depth-first search to find a child node with the given constructor name.
     * @param name - The constructor name to search for.
     * @returns The first matching child node, or null if none found.
     */
    findChild(name: string): GraphNode | null {
        if (typeof name !== 'string' || name.length === 0) {
            return null;
        }
        for (const child of this.children) {
            if (child.constructor.name === name) {
                return child;
            }
            const found = child.findChild(name);
            if (found) return found;
        }
        return null;
    }

    /**
     * Gets the world-space position of this node.
     * @returns A new Vec3 containing the world position.
     */
    getWorldPosition(): Vec3 {
        const pos = new Vec3();
        this.worldTransform.getTranslation(pos);
        return pos;
    }

    /**
     * Sets the local-space position of this node.
     * @param pos - The new position.
     * @throws {TypeError} If pos is not a valid Vec3.
     */
    setPosition(pos: Vec3): void {
        if (!(pos instanceof Vec3)) {
            throw new TypeError('Position must be an instance of Vec3');
        }
        this.localTransform.setTranslation(pos);
        this.markDirty();
    }

    /**
     * Sets the local-space rotation of this node.
     * @param rot - The new rotation quaternion.
     * @throws {TypeError} If rot is not a valid Quat.
     */
    setRotation(rot: Quat): void {
        if (!(rot instanceof Quat)) {
            throw new TypeError('Rotation must be an instance of Quat');
        }
        const scale = new Vec3();
        const translation = new Vec3();
        this.localTransform.decompose(translation, undefined, scale);
        this.localTransform.compose(translation, rot, scale);
        this.markDirty();
    }

    /**
     * Sets the local-space scale of this node.
     * @param scale - The new scale vector.
     * @throws {TypeError} If scale is not a valid Vec3.
     */
    setScale(scale: Vec3): void {
        if (!(scale instanceof Vec3)) {
            throw new TypeError('Scale must be an instance of Vec3');
        }
        const translation = new Vec3();
        const rotation = new Quat();
        this.localTransform.decompose(translation, rotation, undefined);
        this.localTransform.compose(translation, rotation, scale);
        this.markDirty();
    }

    /**
     * Gets the parent of this node.
     * @returns The parent node or null if this is a root node.
     */
    getParent(): GraphNode | null {
        return this.parent;
    }

    /**
     * Gets a shallow copy of the children array.
     * @returns An array of child nodes.
     */
    getChildren(): GraphNode[] {
        return this.children.slice();
    }

    /**
     * Gets the local transform matrix.
     * @returns The local transform.
     */
    getLocalTransform(): Mat4 {
        return this.localTransform.clone();
    }

    /**
     * Gets the world transform matrix.
     * @returns The world transform.
     */
    getWorldTransform(): Mat4 {
        return this.worldTransform.clone();
    }

    /**
     * Sets whether this node is enabled.
     * @param enabled - True to enable, false to disable.
     */
    setEnabled(enabled: boolean): void {
        if (typeof enabled !== 'boolean') {
            throw new TypeError('Enabled must be a boolean');
        }
        this.enabled = enabled;
    }

    /**
     * Checks if this node is enabled.
     * @returns True if enabled, false otherwise.
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Checks if this node is marked as dirty.
     * @returns True if dirty, false otherwise.
     */
    isDirty(): boolean {
        return this.dirty;
    }

    /**
     * Removes all children from this node.
     */
    clearChildren(): void {
        for (const child of this.children) {
            child.parent = null;
            child.markDirty();
        }
        this.children.length = 0;
    }

    /**
     * Gets the number of direct children.
     * @returns The child count.
     */
    getChildCount(): number {
        return this.children.length;
    }

    /**
     * Checks if this node has any children.
     * @returns True if children exist, false otherwise.
     */
    hasChildren(): boolean {
        return this.children.length > 0;
    }

    /**
     * Checks if this node is a root node (no parent).
     * @returns True if root, false otherwise.
     */
    isRoot(): boolean {
        return this.parent === null;
    }

    /**
     * Gets the root node of the hierarchy by traversing up the parent chain.
     * @returns The root node, which may be this node itself.
     */
    getRoot(): GraphNode {
        let node: GraphNode = this;
        while (node.parent) {
            node = node.parent;
        }
        return node;
    }

    /**
     * Clones this node and its entire subtree, creating deep copies of all transforms.
     * @returns A new GraphNode that is a deep copy of this node and its children.
     */
    clone(): GraphNode {
        const clone = new GraphNode();
        clone.localTransform.copy(this.localTransform);
        clone.worldTransform.copy(this.worldTransform);
        clone.enabled = this.enabled;
        clone.dirty = this.dirty;
        for (const child of this.children) {
            const childClone = child.clone();
            clone.addChild(childClone);
        }
        return clone;
    }
}
