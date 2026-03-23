import { EventEmitter } from '../core/eventemitter';
import { Vec3 } from '../math/vec3';
import { Mat4 } from '../math/mat4';
import { GraphicsDevice } from './graphicsdevice';
import { Mesh } from './mesh';
import { Material } from './material';
import { MeshInstance } from './meshinstance';

export class ScopeSpace {
    private _device: GraphicsDevice;
    private _root: MeshInstance | null;
    private _entities: MeshInstance[];
    private _cameraMatrix: Mat4;
    private _viewMatrix: Mat4;
    private _projectionMatrix: Mat4;
    private _viewProjectionMatrix: Mat4;
    private _dirty: boolean;

    constructor(device: GraphicsDevice) {
        this._device = device;
        this._root = null;
        this._entities = [];
        this._cameraMatrix = new Mat4();
        this._viewMatrix = new Mat4();
        this._projectionMatrix = new Mat4();
        this._viewProjectionMatrix = new Mat4();
        this._dirty = true;
    }

    get device(): GraphicsDevice {
        return this._device;
    }

    get root(): MeshInstance | null {
        return this._root;
    }

    set root(value: MeshInstance | null) {
        this._root = value;
        this._dirty = true;
    }

    get entities(): MeshInstance[] {
        return this._entities;
    }

    addEntity(entity: MeshInstance): void {
        if (!this._entities.includes(entity)) {
            this._entities.push(entity);
            this._dirty = true;
        }
    }

    removeEntity(entity: MeshInstance): void {
        const index = this._entities.indexOf(entity);
        if (index !== -1) {
            this._entities.splice(index, 1);
            this._dirty = true;
        }
    }

    clearEntities(): void {
        this._entities.length = 0;
        this._dirty = true;
    }

    setCamera(position: Vec3, target: Vec3, up: Vec3): void {
        this._cameraMatrix.setLookAt(position, target, up);
        this._viewMatrix.copy(this._cameraMatrix).invert();
        this._dirty = true;
    }

    setPerspective(fov: number, aspect: number, near: number, far: number): void {
        this._projectionMatrix.setPerspective(fov, aspect, near, far);
        this._dirty = true;
    }

    setOrthographic(left: number, right: number, bottom: number, top: number, near: number, far: number): void {
        this._projectionMatrix.setOrthographic(left, right, bottom, top, near, far);
        this._dirty = true;
    }

    update(): void {
        if (this._dirty) {
            this._viewProjectionMatrix.mul2(this._projectionMatrix, this._viewMatrix);
            this._dirty = false;
        }

        if (this._root) {
            this._root.update();
        }

        for (let i = 0; i < this._entities.length; i++) {
            this._entities[i].update();
        }
    }

    render(): void {
        this._device.clear();

        if (this._root) {
            this._root.render(this._device, this._viewProjectionMatrix);
        }

        for (let i = 0; i < this._entities.length; i++) {
            this._entities[i].render(this._device, this._viewProjectionMatrix);
        }
    }

    destroy(): void {
        this._root = null;
        this._entities.length = 0;
    }
}
