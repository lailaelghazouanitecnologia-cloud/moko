import { Vec3 } from '../math/vec3';
import { CollisionMesh } from './collision-mesh';
import { ContactResult } from './contact-result';
import { RaycastResult } from './raycast-result';

/**
 * Represents a physics collider used for collision detection and response.
 * Supports various shapes and can act as a trigger volume.
 */
export class Collider {
    shape: CollisionMesh;
    isTrigger: boolean;
    offset: Vec3;
    material: any; // PhysicsMaterial not yet defined

    constructor() {
        this.shape = new CollisionMesh();
        this.isTrigger = false;
        this.offset = new Vec3();
        this.material = null;
    }

    /**
     * Tests if this collider overlaps with another collider.
     * @param other - The other collider to test against
     * @returns True if the colliders overlap, false otherwise
     */
    testOverlap(other: Collider): boolean {
        if (!other) {
            console.warn('Collider.testOverlap: other parameter is null or undefined');
            return false;
        }

        if (!this.shape || !other.shape) {
            console.warn('Collider.testOverlap: one or both shapes are null');
            return false;
        }
        
        const thisAABB = this.shape.buildAABB ? this.shape.buildAABB() : null;
        const otherAABB = other.shape.buildAABB ? other.shape.buildAABB() : null;
        
        if (thisAABB && otherAABB) {
            return thisAABB.intersectsBox(otherAABB);
        }
        
        if (this.shape.intersectSphere && other.shape.intersectSphere) {
            const sphere1 = { center: this.offset, radius: 1 };
            const sphere2 = { center: other.offset, radius: 1 };
            return this.shape.intersectSphere(sphere2) || other.shape.intersectSphere(sphere1);
        }
        
        return false;
    }

    /**
     * Computes contact points between this collider and another collider.
     * @param other - The other collider to test against
     * @returns Array of contact results
     */
    computeContacts(other: Collider): ContactResult[] {
        const contacts: ContactResult[] = [];
        
        if (!other) {
            console.warn('Collider.computeContacts: other parameter is null or undefined');
            return contacts;
        }
        
        if (!this.testOverlap(other)) {
            return contacts;
        }
        
        const thisAABB = this.shape.buildAABB ? this.shape.buildAABB() : null;
        const otherAABB = other.shape.buildAABB ? other.shape.buildAABB() : null;
        
        if (thisAABB && otherAABB) {
            const center1 = thisAABB.center();
            const center2 = otherAABB.center();
            
            const contact = new ContactResult();
            contact.point = new Vec3().add2(center1, center2).scale(0.5);
            contact.normal = new Vec3().sub2(center2, center1).normalize();
            contact.penetration = 0.1;
            
            contacts.push(contact);
        }
        
        return contacts;
    }

    /**
     * Sets the offset position of this collider relative to its parent entity.
     * @param offset - The new offset vector
     */
    setOffset(offset: Vec3): void {
        if (!offset) {
            console.warn('Collider.setOffset: offset parameter is null or undefined');
            return;
        }
        this.offset.copy(offset);
    }

    /**
     * Sets whether this collider acts as a trigger volume.
     * @param value - True to enable trigger mode, false to disable
     */
    setTrigger(value: boolean): void {
        this.isTrigger = Boolean(value);
    }

    /**
     * Gets the axis-aligned bounding box for this collider.
     * @returns The AABB or null if not available
     */
    getAABB(): any {
        if (this.shape && this.shape.buildAABB) {
            const aabb = this.shape.buildAABB();
            if (this.offset.length() > 0) {
                aabb.min.add(this.offset);
                aabb.max.add(this.offset);
            }
            return aabb;
        }
        return null;
    }

    /**
     * Performs a raycast test against this collider.
     * @param ray - The ray to test against
     * @returns Raycast result containing hit information
     */
    raycast(ray: any): RaycastResult {
        const result = new RaycastResult();
        
        if (!ray) {
            console.warn('Collider.raycast: ray parameter is null or undefined');
            result.hit = false;
            return result;
        }
        
        if (!this.shape) {
            result.hit = false;
            return result;
        }
        
        if (this.shape.intersectRay) {
            const localRay = {
                origin: new Vec3().sub2(ray.origin, this.offset),
                direction: ray.direction.clone()
            };
            const shapeResult = this.shape.intersectRay(localRay);
            
            if (shapeResult.hit) {
                result.hit = true;
                result.point = new Vec3().add2(shapeResult.point, this.offset);
                result.normal = shapeResult.normal;
                result.distance = shapeResult.distance;
                result.collider = this;
            }
        }
        
        return result;
    }

    /**
     * Creates a deep copy of this collider.
     * @returns A new collider instance with copied properties
     */
    clone(): Collider {
        const cloned = new Collider();
        cloned.shape = this.shape; // Assuming shape is immutable or shared
        cloned.isTrigger = this.isTrigger;
        cloned.offset = this.offset.clone();
        cloned.material = this.material;
        return cloned;
    }

    /**
     * Sets the physics material for this collider.
     * @param material - The physics material to apply
     */
    setMaterial(material: any): void {
        this.material = material;
    }

    /**
     * Gets the physics material assigned to this collider.
     * @returns The physics material or null if not set
     */
    getMaterial(): any {
        return this.material;
    }

    /**
     * Gets the shape type of this collider.
     * @returns The shape type identifier
     */
    getShapeType(): string {
        return this.shape ? this.shape.type : 'unknown';
    }

    /**
     * Validates that this collider has all required components.
     * @returns True if the collider is valid, false otherwise
     */
    isValid(): boolean {
        return this.shape !== null && this.shape !== undefined;
    }

    /**
     * Resets this collider to its default state.
     */
    reset(): void {
        this.shape = new CollisionMesh();
        this.isTrigger = false;
        this.offset.set(0, 0, 0);
        this.material = null;
    }
}
