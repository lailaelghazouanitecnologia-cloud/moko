import { EventEmitter } from '../core/event-emitter';
import { Vec2 } from '../math/vec2';
import { Vec3 } from '../math/vec3';
import { Vec4 } from '../math/vec4';
import { Mat4 } from '../math/mat4';
import { Quat } from '../math/quat';
import { Color } from '../math/color';
import { GraphicsDevice } from '../graphics/graphics-device';
import { Texture } from '../graphics/texture';
import { Material } from '../graphics/material';
import { Mesh } from '../graphics/mesh';
import { MeshInstance } from '../graphics/mesh-instance';
import { Entity } from '../scene/entity';
import { Element } from './element';

export class Image extends Element {
    private _src: string = '';
    private _texture: Texture | null = null;
    private _material: Material | null = null;
    private _meshInstance: MeshInstance | null = null;
    private _entity: Entity | null = null;
    private _width: number = 0;
    private _height: number = 0;
    private _opacity: number = 1;
    private _color: Color = new Color(1, 1, 1, 1);

    constructor(entity: Entity) {
        super(entity);
        this._entity = entity;
        this._initialize();
    }

    private _initialize(): void {
        if (!this._entity) return;

        const device = GraphicsDevice.getCurrentDevice();
        if (!device) return;

        // Create quad mesh
        const positions = new Float32Array([
            -0.5, -0.5, 0,
             0.5, -0.5, 0,
             0.5,  0.5, 0,
            -0.5,  0.5, 0
        ]);

        const uvs = new Float32Array([
            0, 1,
            1, 1,
            1, 0,
            0, 0
        ]);

        const indices = new Uint16Array([
            0, 1, 2,
            0, 2, 3
        ]);

        const mesh = new Mesh(device);
        mesh.setPositions(positions);
        mesh.setUvs(uvs);
        mesh.setIndices(indices);
        mesh.update();

        // Create material
        this._material = new Material();
        this._material.color = this._color;

        // Create mesh instance
        this._meshInstance = new MeshInstance(mesh, this._material);
        this._meshInstance.node = this._entity;

        // Add mesh renderer component
        const meshRenderer = this._entity.addComponent('meshRenderer') as any;
        if (meshRenderer && meshRenderer.meshInstances) {
            meshRenderer.meshInstances.push(this._meshInstance);
        }
    }

    set src(value: string) {
        if (this._src === value) return;
        this._src = value;
        this._loadTexture();
    }

    get src(): string {
        return this._src;
    }

    private _loadTexture(): void {
        if (!this._src) {
            this._texture = null;
            this._updateMaterial();
            return;
        }

        const loader = ResourceLoader.getInstance();
        loader.load(this._src, (err: any, asset: any) => {
            if (err) {
                console.error(`Failed to load image: ${this._src}`, err);
                return;
            }

            if (asset && asset.resource) {
                this._texture = asset.resource;
                this._updateMaterial();
                this._updateDimensions();
            }
        });
    }

    private _updateMaterial(): void {
        if (!this._material) return;
        this._material.setTexture(this._texture);
    }

    private _updateDimensions(): void {
        if (!this._texture) return;

        this._width = this._texture.width;
        this._height = this._texture.height;

        if (this._entity) {
            this._entity.setLocalScale(new Vec3(this._width / 100, this._height / 100, 1));
        }
    }

    render(): void {
        if (!this._meshInstance || !this._material) return;

        // Update material properties
        this._material.color = this._color;
        this._material.opacity = this._opacity;

        // Mark mesh instance for rendering
        this._meshInstance.visible = true;
    }

    set width(value: number) {
        this._width = value;
        if (this._entity) {
            this._entity.setLocalScale(new Vec3(this._width / 100, this._height / 100, 1));
        }
    }

    get width(): number {
        return this._width;
    }

    set height(value: number) {
        this._height = value;
        if (this._entity) {
            this._entity.setLocalScale(new Vec3(this._width / 100, this._height / 100, 1));
        }
    }

    get height(): number {
        return this._height;
    }

    set opacity(value: number) {
        this._opacity = Math.max(0, Math.min(1, value));
        this._color.a = this._opacity;
        this._updateMaterial();
    }

    get opacity(): number {
        return this._opacity;
    }

    set color(value: Color) {
        this._color = value.clone();
        this._color.a = this._opacity;
        this._updateMaterial();
    }

    get color(): Color {
        return this._color.clone();
    }

    destroy(): void {
        if (this._meshInstance) {
            this._meshInstance.visible = false;
        }

        if (this._entity && this._entity.meshRenderer) {
            const meshRenderer = this._entity.meshRenderer as any;
            if (meshRenderer.meshInstances && this._meshInstance) {
                const index = meshRenderer.meshInstances.indexOf(this._meshInstance);
                if (index !== -1) {
                    meshRenderer.meshInstances.splice(index, 1);
                }
            }
        }

        this._texture = null;
        this._material = null;
        this._meshInstance = null;
        this._entity = null;

        super.destroy();
    }
}
