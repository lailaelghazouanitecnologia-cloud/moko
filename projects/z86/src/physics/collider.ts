import { EventEmitter } from '../core';
import { Vec3, Quat, BoundingBox, BoundingSphere } from '../math';
import { RigidBody } from './rigid-body';
import { ContactResult } from './contact-result';

export class Collider extends EventEmitter {
    shape: 'box' | 'sphere' | 'capsule' | 'mesh' = 'box';
    position: Vec3 = new Vec3();
    rotation: Quat = new Quat();
    private _bounds: BoundingBox | BoundingSphere | null = null;
    private _body: RigidBody | null = null;
    private _enabled: boolean = true;
    private _layer: number = 1;

    constructor(shape: 'box' | 'sphere' | 'capsule' | 'mesh' = 'box') {
        super();
        this.shape = shape;
        this._updateBounds();
    }

    get body(): RigidBody | null {
        return this._body;
    }

    set body(value: RigidBody | null) {
        this._body = value;
        if (this._body) {
            this._body.collider = this;
        }
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        if (this._enabled !== value) {
            this._enabled = value;
            this.emit('enabled', this._enabled);
        }
    }

    get layer(): number {
        return this._layer;
    }

    set layer(value: number) {
        this._layer = value;
    }

    get bounds(): BoundingBox | BoundingSphere | null {
        return this._bounds;
    }

    setPosition(x: number | Vec3, y?: number, z?: number): this {
        if (typeof x === 'number') {
            this.position.set(x, y!, z!);
        } else {
            this.position.copy(x);
        }
        this._updateBounds();
        return this;
    }

    setRotation(x: number | Quat, y?: number, z?: number, w?: number): this {
        if (typeof x === 'number') {
            this.rotation.set(x, y!, z!, w!);
        } else {
            this.rotation.copy(x);
        }
        this._updateBounds();
        return this;
    }

    intersects(other: Collider): boolean {
        if (!this._bounds || !other._bounds) return false;
        
        if (this._bounds instanceof BoundingBox && other._bounds instanceof BoundingBox) {
            return this._bounds.intersectsBoundingBox(other._bounds);
        }
        if (this._bounds instanceof BoundingSphere && other._bounds instanceof BoundingSphere) {
            return this._bounds.intersectsBoundingSphere(other._bounds);
        }
        if (this._bounds instanceof BoundingBox && other._bounds instanceof BoundingSphere) {
            return other._bounds.intersectsBoundingBox(this._bounds);
        }
        if (this._bounds instanceof BoundingSphere && other._bounds instanceof BoundingBox) {
            return this._bounds.intersectsBoundingBox(other._bounds);
        }
        return false;
    }

    raycast(ray: import('../math').Ray, result: import('./raycast-result').RaycastResult): boolean {
        if (!this._bounds) return false;
        
        if (this._bounds instanceof BoundingBox) {
            return this._bounds.intersectsRay(ray, result.point) !== null;
        }
        if (this._bounds instanceof BoundingSphere) {
            return this._bounds.intersectsRay(ray, result.point) !== null;
        }
        return false;
    }

    getContacts(other: Collider): ContactResult[] {
        const contacts: ContactResult[] = [];
        if (!this.intersects(other)) return contacts;
        
        const result = new ContactResult();
        result.a = this;
        result.b = other;
        result.pointA = this.position.clone();
        result.pointB = other.position.clone();
        result.normal = other.position.clone().sub(this.position).normalize();
        result.distance = Vec3.distance(this.position, other.position);
        contacts.push(result);
        
        return contacts;
    }

    private _updateBounds(): void {
        switch (this.shape) {
            case 'box':
                this._bounds = new BoundingBox(this.position, new Vec3(1, 1, 1));
                break;
            case 'sphere':
                this._bounds = new BoundingSphere(this.position, 0.5);
                break;
            case 'capsule':
                this._bounds = new BoundingCapsule(this.position, 0.5, 1);
                break;
            case 'mesh':
                this._bounds = new BoundingBox(this.position, new Vec3(1, 1, 1));
                break;
        }
    }

    clone(): Collider {
        const clone = new Collider(this.shape);
        clone.position.copy(this.position);
        clone.rotation.copy(this.rotation);
        clone._enabled = this._enabled;
        clone._layer = this._layer;
        clone._updateBounds();
        return clone;
    }

    destroy(): void {
        this.emit('destroy');
        this.removeAllListeners();
        this._body = null;
        this._bounds = null;
    }
}

class BoundingCapsule {
    constructor(public center: Vec3, public radius: number, public height: number) {}
}
