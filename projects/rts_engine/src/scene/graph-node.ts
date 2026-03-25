import { Mat4 } from '../math/mat4';
import { Vec3 } from '../math/vec3';
import { Quat } from '../math/quat';

/**
 * Hierarchical scene graph node.
 * Manages parent-child relationships and local/world transformations.
 */
export class GraphNode {
    parent: GraphNode | null = null;
    children: GraphNode[] = [];
    localTransform: Mat4 = new Mat4();
    worldTransform: Mat4 = new Mat4();
    enabled: boolean = true;

    /**
     * Attach a child node to this node.
     * If the node already has a parent, it is first removed from that parent.
     * @param node - The node to attach as a child.
     * @throws {TypeError} If node is not an instance of GraphNode.
     */
    addChild(node: GraphNode): void {
        if (!(node instanceof GraphNode)) {
            throw new TypeError('Expected node to be an instance of GraphNode');
        }
        if (node.parent) {
            node.parent.removeChild(node);
        }
        node.parent = this;
        this.children.push(node);
        node.updateWorldTransform();
    }

    /**
     * Detach a child node from this node.
     * @param node - The node to detach.
     * @throws {TypeError} If node is not an instance of GraphNode.
     */
    removeChild(node: GraphNode): void {
        if (!(node instanceof GraphNode)) {
            throw new TypeError('Expected node to be an instance of GraphNode');
        }
        const index = this.children.indexOf(node);
        if (index !== -1) {
            this.children.splice(index, 1);
            node.parent = null;
        }
    }

    /**
     * Recompute the world transformation matrix for this node and all its descendants.
     */
    updateWorldTransform(): void {
        if (this.parent) {
            this.worldTransform.copy(this.parent.worldTransform).multiply(this.localTransform);
        } else {
            this.worldTransform.copy(this.localTransform);
        }
        for (const child of this.children) {
            child.updateWorldTransform();
        }
    }

    /**
     * Search immediate children for a node with the specified name.
     * @param name - The name to search for.
     * @returns The first child with the matching name, or null if not found.
     * @throws {TypeError} If name is not a string.
     */
    findChildByName(name: string): GraphNode | null {
        if (typeof name !== 'string') {
            throw new TypeError('Expected name to be a string');
        }
        for (const child of this.children) {
            if ((child as any).name === name) {
                return child;
            }
        }
        return null;
    }

    /**
     * Deep search descendants for a node with the specified name.
     * @param name - The name to search for.
     * @returns The first descendant with the matching name, or null if not found.
     * @throws {TypeError} If name is not a string.
     */
    findDescendantByName(name: string): GraphNode | null {
        if (typeof name !== 'string') {
            throw new TypeError('Expected name to be a string');
        }
        const stack = [...this.children];
        while (stack.length > 0) {
            const node = stack.pop()!;
            if ((node as any).name === name) {
                return node;
            }
            stack.push(...node.children);
        }
        return null;
    }

    /**
     * Set the local position of this node.
     * @param pos - The local position vector.
     * @throws {TypeError} If pos is not an instance of Vec3.
     */
    setLocalPosition(pos: Vec3): void {
        if (!(pos instanceof Vec3)) {
            throw new TypeError('Expected pos to be an instance of Vec3');
        }
        const translation = new Mat4();
        translation.translate(pos);
        this.localTransform.copy(translation);
        this.updateWorldTransform();
    }

    /**
     * Set the local rotation of this node using a quaternion.
     * @param rot - The local rotation quaternion.
     * @throws {TypeError} If rot is not an instance of Quat.
     */
    setLocalRotation(rot: Quat): void {
        if (!(rot instanceof Quat)) {
            throw new TypeError('Expected rot to be an instance of Quat');
        }
        const rotation = new Mat4();
        const x = rot.x, y = rot.y, z = rot.z, w = rot.w;
        const x2 = x + x, y2 = y + y, z2 = z + z;
        const xx = x * x2, xy = x * y2, xz = x * z2;
        const yy = y * y2, yz = y * z2, zz = z * z2;
        const wx = w * x2, wy = w * y2, wz = w * z2;
        
        rotation.data[0] = 1 - (yy + zz);
        rotation.data[1] = xy + wz;
        rotation.data[2] = xz - wy;
        rotation.data[3] = 0;
        rotation.data[4] = xy - wz;
        rotation.data[5] = 1 - (xx + zz);
        rotation.data[6] = yz + wx;
        rotation.data[7] = 0;
        rotation.data[8] = xz + wy;
        rotation.data[9] = yz - wx;
        rotation.data[10] = 1 - (xx + yy);
        rotation.data[11] = 0;
        rotation.data[12] = 0;
        rotation.data[13] = 0;
        rotation.data[14] = 0;
        rotation.data[15] = 1;
        
        this.localTransform.copy(rotation);
        this.updateWorldTransform();
    }

    /**
     * Set the local scale of this node.
     * @param scale - The local scale vector.
     * @throws {TypeError} If scale is not an instance of Vec3.
     */
    setLocalScale(scale: Vec3): void {
        if (!(scale instanceof Vec3)) {
            throw new TypeError('Expected scale to be an instance of Vec3');
        }
        const scaling = new Mat4();
        scaling.scale(scale);
        this.localTransform.copy(scaling);
        this.updateWorldTransform();
    }

    /**
     * Extract the world position of this node from its world transformation matrix.
     * @returns A new Vec3 representing the world position.
     */
    getWorldPosition(): Vec3 {
        return new Vec3(this.worldTransform.data[12], this.worldTransform.data[13], this.worldTransform.data[14]);
    }
}
