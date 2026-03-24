import { Vec3 } from '../math/vec3';
import { BoundingBox } from '../math/bounding-box';

/**
 * Represents a single triangle in 3D space with its vertices and surface normal.
 */
export class Triangle {
    a: Vec3;
    b: Vec3;
    c: Vec3;
    normal: Vec3;

    /**
     * Creates a new Triangle instance.
     * @param a - First vertex of the triangle
     * @param b - Second vertex of the triangle
     * @param c - Third vertex of the triangle
     * @param normal - Surface normal vector for the triangle
     * @throws {Error} If any vertex or normal is null/undefined
     */
    constructor(a: Vec3, b: Vec3, c: Vec3, normal: Vec3) {
        if (!a || !b || !c || !normal) {
            throw new Error('All triangle vertices and normal must be defined');
        }
        this.a = a;
        this.b = b;
        this.c = c;
        this.normal = normal;
    }

    /**
     * Calculates the area of this triangle.
     * @returns The area of the triangle
     */
    getArea(): number {
        const ab = this.b.subtract(this.a);
        const ac = this.c.subtract(this.a);
        const cross = ab.cross(ac);
        return cross.length() * 0.5;
    }

    /**
     * Checks if a point is inside this triangle.
     * @param point - The point to test
     * @returns True if the point is inside the triangle
     */
    containsPoint(point: Vec3): boolean {
        const v0 = this.c.subtract(this.a);
        const v1 = this.b.subtract(this.a);
        const v2 = point.subtract(this.a);

        const dot00 = v0.dot(v0);
        const dot01 = v0.dot(v1);
        const dot02 = v0.dot(v2);
        const dot11 = v1.dot(v1);
        const dot12 = v1.dot(v2);

        const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
        const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

        return (u >= 0) && (v >= 0) && (u + v < 1);
    }
}

/**
 * A triangle mesh optimized for collision detection with spatial indexing support.
 */
export class CollisionMesh {
    private vertices: Float32Array;
    private indices: Uint16Array;
    private normals: Float32Array;
    private bvh: any = null;
    private bounds: BoundingBox | null = null;

    /**
     * Creates a new CollisionMesh instance.
     * @param vertices - Array of vertex positions (x,y,z triplets)
     * @param indices - Array of vertex indices defining triangles
     * @param normals - Array of vertex normals (x,y,z triplets)
     * @throws {Error} If arrays have invalid lengths or mismatched sizes
     */
    constructor(vertices?: Float32Array, indices?: Uint16Array, normals?: Float32Array) {
        this.vertices = vertices || new Float32Array(0);
        this.indices = indices || new Uint16Array(0);
        this.normals = normals || new Float32Array(0);

        this.validateArrays();
    }

    /**
     * Validates the input arrays for consistency.
     * @throws {Error} If arrays have invalid lengths or mismatched sizes
     */
    private validateArrays(): void {
        if (this.vertices.length % 3 !== 0) {
            throw new Error('Vertices array length must be a multiple of 3');
        }
        if (this.normals.length !== this.vertices.length) {
            throw new Error('Normals array must have same length as vertices array');
        }
        if (this.indices.length % 3 !== 0) {
            throw new Error('Indices array length must be a multiple of 3');
        }
        
        // Check for out-of-bounds indices
        const maxVertexIndex = (this.vertices.length / 3) - 1;
        for (let i = 0; i < this.indices.length; i++) {
            if (this.indices[i] > maxVertexIndex) {
                throw new Error(`Index ${this.indices[i]} at position ${i} exceeds vertex count`);
            }
        }
    }

    /**
     * Builds a Bounding Volume Hierarchy for spatial indexing to accelerate collision queries.
     * @throws {Error} If mesh data is invalid
     */
    buildBVH(): void {
        if (this.indices.length === 0) return;

        try {
            const triangles: Triangle[] = [];
            for (let i = 0; i < this.indices.length; i += 3) {
                const i0 = this.indices[i] * 3;
                const i1 = this.indices[i + 1] * 3;
                const i2 = this.indices[i + 2] * 3;

                const a = new Vec3(this.vertices[i0], this.vertices[i0 + 1], this.vertices[i0 + 2]);
                const b = new Vec3(this.vertices[i1], this.vertices[i1 + 1], this.vertices[i1 + 2]);
                const c = new Vec3(this.vertices[i2], this.vertices[i2 + 1], this.vertices[i2 + 2]);

                const normal = new Vec3(
                    this.normals[i0],
                    this.normals[i0 + 1],
                    this.normals[i0 + 2]
                );

                triangles.push(new Triangle(a, b, c, normal));
            }

            this.bvh = {
                triangles: triangles,
                bounds: this.calculateBounds(triangles)
            };
        } catch (error) {
            throw new Error(`Failed to build BVH: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Retrieves a triangle by its index.
     * @param index - The triangle index (0-based)
     * @returns The requested Triangle
     * @throws {Error} If index is out of range
     */
    getTriangle(index: number): Triangle {
        if (!Number.isInteger(index) || index < 0 || index >= this.indices.length / 3) {
            throw new Error(`Triangle index ${index} out of range [0, ${Math.floor(this.indices.length / 3) - 1}]`);
        }

        const i = index * 3;
        const i0 = this.indices[i] * 3;
        const i1 = this.indices[i + 1] * 3;
        const i2 = this.indices[i + 2] * 3;

        const a = new Vec3(this.vertices[i0], this.vertices[i0 + 1], this.vertices[i0 + 2]);
        const b = new Vec3(this.vertices[i1], this.vertices[i1 + 1], this.vertices[i1 + 2]);
        const c = new Vec3(this.vertices[i2], this.vertices[i2 + 1], this.vertices[i2 + 2]);

        const normal = new Vec3(
            this.normals[i0],
            this.normals[i0 + 1],
            this.normals[i0 + 2]
        );

        return new Triangle(a, b, c, normal);
    }

    /**
     * Returns the total number of triangles in this mesh.
     * @returns The triangle count
     */
    getTriangleCount(): number {
        return Math.floor(this.indices.length / 3);
    }

    /**
     * Returns the total number of vertices in this mesh.
     * @returns The vertex count
     */
    getVertexCount(): number {
        return Math.floor(this.vertices.length / 3);
    }

    /**
     * Calculates and returns the axis-aligned bounding box of this mesh.
     * @returns The bounding box
     */
    getBounds(): BoundingBox {
        if (this.bounds) return this.bounds;

        if (this.vertices.length === 0) {
            this.bounds = new BoundingBox(new Vec3(0, 0, 0), new Vec3(0, 0, 0));
            return this.bounds;
        }

        let minX = this.vertices[0];
        let minY = this.vertices[1];
        let minZ = this.vertices[2];
        let maxX = this.vertices[0];
        let maxY = this.vertices[1];
        let maxZ = this.vertices[2];

        for (let i = 3; i < this.vertices.length; i += 3) {
            const x = this.vertices[i];
            const y = this.vertices[i + 1];
            const z = this.vertices[i + 2];

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
        }

        this.bounds = new BoundingBox(
            new Vec3(minX, minY, minZ),
            new Vec3(maxX, maxY, maxZ)
        );

        return this.bounds;
    }

    /**
     * Optimizes the mesh by removing duplicate vertices and updating indices accordingly.
     * This reduces memory usage and can improve performance.
     * @throws {Error} If optimization fails due to invalid data
     */
    optimize(): void {
        if (this.indices.length === 0) return;

        try {
            const vertexMap = new Map<string, number>();
            const optimizedVertices: number[] = [];
            const optimizedIndices: number[] = [];
            const optimizedNormals: number[] = [];

            for (let i = 0; i < this.indices.length; i++) {
                const vertexIndex = this.indices[i];
                const vertexOffset = vertexIndex * 3;
                const normalOffset = vertexIndex * 3;

                const vertexKey = [
                    this.vertices[vertexOffset],
                    this.vertices[vertexOffset + 1],
                    this.vertices[vertexOffset + 2],
                    this.normals[normalOffset],
                    this.normals[normalOffset + 1],
                    this.normals[normalOffset + 2]
                ].join(',');

                let newIndex = vertexMap.get(vertexKey);
                if (newIndex === undefined) {
                    newIndex = optimizedVertices.length / 3;
                    vertexMap.set(vertexKey, newIndex);

                    optimizedVertices.push(
                        this.vertices[vertexOffset],
                        this.vertices[vertexOffset + 1],
                        this.vertices[vertexOffset + 2]
                    );

                    optimizedNormals.push(
                        this.normals[normalOffset],
                        this.normals[normalOffset + 1],
                        this.normals[normalOffset + 2]
                    );
                }

                optimizedIndices.push(newIndex);
            }

            this.vertices = new Float32Array(optimizedVertices);
            this.indices = new Uint16Array(optimizedIndices);
            this.normals = new Float32Array(optimizedNormals);

            this.bounds = null;
            this.bvh = null;
        } catch (error) {
            throw new Error(`Failed to optimize mesh: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Calculates the bounding box for a collection of triangles.
     * @param triangles - Array of triangles
     * @returns The bounding box encompassing all triangles
     */
    private calculateBounds(triangles: Triangle[]): BoundingBox {
        if (!triangles || triangles.length === 0) {
            return new BoundingBox(new Vec3(0, 0, 0), new Vec3(0, 0, 0));
        }

        let minX = triangles[0].a.x;
        let minY = triangles[0].a.y;
        let minZ = triangles[0].a.z;
        let maxX = triangles[0].a.x;
        let maxY = triangles[0].a.y;
        let maxZ = triangles[0].a.z;

        for (const triangle of triangles) {
            if (!triangle || !triangle.a || !triangle.b || !triangle.c) {
                continue;
            }
            for (const point of [triangle.a, triangle.b, triangle.c]) {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                minZ = Math.min(minZ, point.z);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
                maxZ = Math.max(maxZ, point.z);
            }
        }

        return new BoundingBox(
            new Vec3(minX, minY, minZ),
            new Vec3(maxX, maxY, maxZ)
        );
    }

    /**
     * Checks if this mesh is empty (has no triangles).
     * @returns True if the mesh has no triangles
     */
    isEmpty(): boolean {
        return this.indices.length === 0;
    }

    /**
     * Clears all mesh data and resets the mesh to an empty state.
     */
    clear(): void {
        this.vertices = new Float32Array(0);
        this.indices = new Uint16Array(0);
        this.normals = new Float32Array(0);
        this.bounds = null;
        this.bvh = null;
    }

    /**
     * Returns a deep copy of this mesh.
     * @returns A new CollisionMesh instance with copied data
     */
    clone(): CollisionMesh {
        return new CollisionMesh(
            new Float32Array(this.vertices),
            new Uint16Array(this.indices),
            new Float32Array(this.normals)
        );
    }
}
