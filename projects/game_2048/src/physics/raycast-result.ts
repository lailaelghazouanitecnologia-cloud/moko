import { Vec3 } from '../math/vec3';
import { Collider } from './collider';

/**
 * Result of a raycast query.
 * Contains information about the intersection point, normal, distance, and the collider that was hit.
 */
export class RaycastResult {
    hit: boolean;
    point: Vec3;
    normal: Vec3;
    distance: number;
    collider: Collider | null;

    /**
     * Creates a new RaycastResult instance.
     * @param hit - Whether the raycast hit anything.
     * @param point - The point in world space where the raycast hit.
     * @param normal - The normal vector at the point of impact.
     * @param distance - The distance from the ray origin to the hit point.
     * @param collider - The collider that was hit, if any.
     */
    constructor(hit: boolean = false, point: Vec3 = new Vec3(), normal: Vec3 = new Vec3(), distance: number = 0, collider: Collider | null = null) {
        this.hit = hit;
        this.point = point;
        this.normal = normal;
        this.distance = distance;
        this.collider = collider;
    }

    /**
     * Check if the raycast hit anything.
     * @returns True if the raycast hit a collider, false otherwise.
     */
    isHit(): boolean {
        return this.hit;
    }

    /**
     * Get the hit point in world space.
     * @returns The point where the raycast hit.
     * @throws {Error} If the raycast did not hit anything.
     */
    getPoint(): Vec3 {
        if (!this.hit) {
            throw new Error('Cannot get point: raycast did not hit anything');
        }
        return this.point.clone();
    }

    /**
     * Get the normal vector at the point of impact.
     * @returns The normal vector.
     * @throws {Error} If the raycast did not hit anything.
     */
    getNormal(): Vec3 {
        if (!this.hit) {
            throw new Error('Cannot get normal: raycast did not hit anything');
        }
        return this.normal.clone();
    }

    /**
     * Get the distance from the ray origin to the hit point.
     * @returns The distance.
     * @throws {Error} If the raycast did not hit anything.
     */
    getDistance(): number {
        if (!this.hit) {
            throw new Error('Cannot get distance: raycast did not hit anything');
        }
        return this.distance;
    }

    /**
     * Get the collider that was hit.
     * @returns The collider that was hit.
     * @throws {Error} If the raycast did not hit anything.
     */
    getCollider(): Collider {
        if (!this.hit) {
            throw new Error('Cannot get collider: raycast did not hit anything');
        }
        if (!this.collider) {
            throw new Error('Cannot get collider: collider is null despite hit being true');
        }
        return this.collider;
    }

    /**
     * Create a RaycastResult representing a miss.
     * @returns A new RaycastResult with hit set to false.
     */
    static miss(): RaycastResult {
        return new RaycastResult(false);
    }

    /**
     * Create a RaycastResult representing a hit.
     * @param point - The point in world space where the raycast hit.
     * @param normal - The normal vector at the point of impact.
     * @param distance - The distance from the ray origin to the hit point.
     * @param collider - The collider that was hit.
     * @returns A new RaycastResult with hit set to true.
     * @throws {Error} If point, normal, or collider are invalid.
     */
    static hit(point: Vec3, normal: Vec3, distance: number, collider: Collider): RaycastResult {
        if (!point) {
            throw new Error('Point must be provided for a hit result');
        }
        if (!normal) {
            throw new Error('Normal must be provided for a hit result');
        }
        if (!collider) {
            throw new Error('Collider must be provided for a hit result');
        }
        if (distance < 0) {
            throw new Error('Distance must be non-negative');
        }
        return new RaycastResult(true, point, normal, distance, collider);
    }

    /**
     * Clone this RaycastResult.
     * @returns A new RaycastResult with the same values.
     */
    clone(): RaycastResult {
        return new RaycastResult(
            this.hit,
            this.point.clone(),
            this.normal.clone(),
            this.distance,
            this.collider
        );
    }

    /**
     * Check if this RaycastResult is equal to another.
     * @param other - The other RaycastResult to compare with.
     * @returns True if all fields are equal, false otherwise.
     */
    equals(other: RaycastResult): boolean {
        if (!other) return false;
        return this.hit === other.hit &&
               this.point.equals(other.point) &&
               this.normal.equals(other.normal) &&
               this.distance === other.distance &&
               this.collider === other.collider;
    }

    /**
     * Get a string representation of this RaycastResult.
     * @returns A string describing the raycast result.
     */
    toString(): string {
        if (!this.hit) {
            return 'RaycastResult[miss]';
        }
        return `RaycastResult[hit: point=${this.point}, normal=${this.normal}, distance=${this.distance.toFixed(3)}, collider=${this.collider}]`;
    }
}
