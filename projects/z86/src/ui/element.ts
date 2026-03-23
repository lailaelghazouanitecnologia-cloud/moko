import { EventEmitter } from '../core/event-emitter';
import { Vec2 } from '../math/vec2';
import { Vec3 } from '../math/vec3';
import { Vec4 } from '../math/vec4';
import { Mat4 } from '../math/mat4';
import { Quat } from '../math/quat';
import { Color } from '../math/color';
import { GraphicsDevice } from '../graphics/graphics-device';
import { Material } from '../graphics/material';
import { Mesh } from '../graphics/mesh';
import { MeshInstance } from '../graphics/mesh-instance';
import { VertexFormat } from '../graphics/vertex-format';
import { VertexBuffer } from '../graphics/vertex-buffer';
import { IndexBuffer } from '../graphics/index-buffer';
import { Shader } from '../graphics/shader';
import { Texture } from '../graphics/texture';
import { RenderTarget } from '../graphics/render-target';
import { ScopeSpace } from '../graphics/scope-space';

export class Element extends EventEmitter {
    private _enabled: boolean = true;
    private _visible: boolean = true;
    private _anchor: Vec4 = new Vec4(0.5, 0.5, 0.5, 0.5);
    private _pivot: Vec2 = new Vec2(0.5, 0.5);
    private _localPosition: Vec3 = new Vec3();
    private _localRotation: Quat = new Quat();
    private _localScale: Vec3 = new Vec3(1, 1, 1);
    private _worldPosition: Vec3 = new Vec3();
    private _worldRotation: Quat = new Quat();
    private _worldScale: Vec3 = new Vec3(1, 1, 1);
    private _localTransform: Mat4 = new Mat4();
    private _worldTransform: Mat4 = new Mat4();
    private _screen: any;
    private _children: Element[] = [];
    private _parent: Element | null = null;
    private _model: MeshInstance | null = null;
    private _material: Material | null = null;
    private _layer: number = 0;
    private _rect: Vec4 = new Vec4();
    private _calculatedWidth: number = 0;
    private _calculatedHeight: number = 0;
    private _margin: Vec4 = new Vec4();
    private _dirtyLocal: boolean = true;
    private _dirtyWorld: boolean = true;
    private _dirtyCalculated: boolean = true;
    private _device: GraphicsDevice | null = null;
    private _renderTarget: RenderTarget | null = null;
    private _vertexBuffer: VertexBuffer | null = null;
    private _indexBuffer: IndexBuffer | null = null;
    private _shader: Shader | null = null;

    constructor() {
        super();
        this._localTransform.setIdentity();
        this._worldTransform.setIdentity();
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        if (this._enabled !== value) {
            this._enabled = value;
            this.emit('enable');
        }
    }

    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        this._visible = value;
    }

    get anchor(): Vec4 {
        return this._anchor;
    }

    set anchor(value: Vec4) {
        this._anchor.copy(value);
        this._dirtyCalculated = true;
    }

    get pivot(): Vec2 {
        return this._pivot;
    }

    set pivot(value: Vec2) {
        this._pivot.copy(value);
        this._dirtyCalculated = true;
    }

    get localPosition(): Vec3 {
        return this._localPosition;
    }

    set localPosition(value: Vec3) {
        this._localPosition.copy(value);
        this._dirtyLocal = true;
    }

    get localRotation(): Quat {
        return this._localRotation;
    }

    set localRotation(value: Quat) {
        this._localRotation.copy(value);
        this._dirtyLocal = true;
    }

    get localScale(): Vec3 {
        return this._localScale;
    }

    set localScale(value: Vec3) {
        this._localScale.copy(value);
        this._dirtyLocal = true;
    }

    get worldPosition(): Vec3 {
        return this._worldPosition;
    }

    get worldRotation(): Quat {
        return this._worldRotation;
    }

    get worldScale(): Vec3 {
        return this._worldScale;
    }

    get screen(): any {
        return this._screen;
    }

    set screen(value: any) {
        this._screen = value;
    }

    get children(): Element[] {
        return this._children;
    }

    get parent(): Element | null {
        return this._parent;
    }

    get model(): MeshInstance | null {
        return this._model;
    }

    set model(value: MeshInstance | null) {
        this._model = value;
    }

    get material(): Material | null {
        return this._material;
    }

    set material(value: Material | null) {
        this._material = value;
    }

    get layer(): number {
        return this._layer;
    }

    set layer(value: number) {
        this._layer = value;
    }

    get rect(): Vec4 {
        return this._rect;
    }

    get calculatedWidth(): number {
        return this._calculatedWidth;
    }

    get calculatedHeight(): number {
        return this._calculatedHeight;
    }

    get margin(): Vec4 {
        return this._margin;
    }

    set margin(value: Vec4) {
        this._margin.copy(value);
        this._dirtyCalculated = true;
    }

    addChild(element: Element): void {
        if (element._parent) {
            element._parent.removeChild(element);
        }
        element._parent = this;
        this._children.push(element);
        element._screen = this._screen;
    }

    removeChild(element: Element): void {
        const index = this._children.indexOf(element);
        if (index !== -1) {
            this._children.splice(index, 1);
            element._parent = null;
            element._screen = null;
        }
    }

    findByName(name: string): Element | null {
        for (let i = 0; i < this._children.length; i++) {
            if (this._children[i].constructor.name === name) {
                return this._children[i];
            }
            const found = this._children[i].findByName(name);
            if (found) return found;
        }
        return null;
    }

    syncHierarchy(): void {
        this._sync();
        for (let i = 0; i < this._children.length; i++) {
            this._children[i].syncHierarchy();
        }
    }

    private _sync(): void {
        if (this._dirtyLocal) {
            this._localTransform.setTRS(this._localPosition, this._localRotation, this._localScale);
            this._dirtyLocal = false;
            this._dirtyWorld = true;
        }

        if (this._dirtyWorld) {
            if (this._parent) {
                this._worldTransform.mul2(this._parent._worldTransform, this._localTransform);
            } else {
                this._worldTransform.copy(this._localTransform);
            }
            this._worldTransform.getTranslation(this._worldPosition);
            this._worldTransform.getScale(this._worldScale);
            this._dirtyWorld = false;
        }

        if (this._dirtyCalculated) {
            this._calculateSize();
            this._dirtyCalculated = false;
        }
    }

    private _calculateSize(): void {
        if (!this._screen) return;

        const screenWidth = this._screen.width || 1920;
        const screenHeight = this._screen.height || 1080;

        const anchorWidth = (this._anchor.z - this._anchor.x) * screenWidth;
        const anchorHeight = (this._anchor.w - this._anchor.y) * screenHeight;

        this._calculatedWidth = anchorWidth - this._margin.x - this._margin.z;
        this._calculatedHeight = anchorHeight - this._margin.y - this._margin.w;

        const pivotOffsetX = this._pivot.x * this._calculatedWidth;
        const pivotOffsetY = this._pivot.y * this._calculatedHeight;

        this._rect.set(
            this._anchor.x * screenWidth + this._margin.x - pivotOffsetX,
            this._anchor.y * screenHeight + this._margin.y - pivotOffsetY,
            this._calculatedWidth,
            this._calculatedHeight
        );
    }

    render(device: GraphicsDevice, renderTarget?: RenderTarget): void {
        if (!this._enabled || !this._visible) return;

        this._device = device;
        this._renderTarget = renderTarget || null;

        if (this._model && this._material) {
            this._sync();

            if (!this._vertexBuffer || !this._indexBuffer) {
                this._createQuadMesh();
            }

            const scope = device.scope;
            scope.resolve('matrix_model').setValue(this._worldTransform.data);
            scope.resolve('matrix_viewProjection').setValue(device.scope.resolve('matrix_viewProjection').getValue());

            this._material.bind();
            this._material.setParameter('uColor', this._material.color.data);

            device.setVertexBuffer(this._vertexBuffer!);
            device.setIndexBuffer(this._indexBuffer!);
            device.draw();
        }

        for (let i = 0; i < this._children.length; i++) {
            this._children[i].render(device, renderTarget);
        }
    }

    private _createQuadMesh(): void {
        if (!this._device) return;

        const positions = new Float32Array([
            -0.5, -0.5, 0,
             0.5, -0.5, 0,
             0.5,  0.5, 0,
            -0.5,  0.5, 0
        ]);

        const uvs = new Float32Array([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]);

        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        const vertexFormat = new VertexFormat(this._device, [
            { semantic: 'POSITION', type: 'float32', components: 3 },
            { semantic: 'TEXCOORD0', type: 'float32', components: 2 }
        ]);

        this._vertexBuffer = new VertexBuffer(this._device, vertexFormat, 4);
        this._vertexBuffer.setData(positions, 0, 0, 12);
        this._vertexBuffer.setData(uvs, 12, 0, 8);

        this._indexBuffer = new IndexBuffer(this._device, 'uint16', 6);
        this._indexBuffer.setData(indices);
    }

    mount(): void {
        this.emit('mount');
        for (let i = 0; i < this._children.length; i++) {
            this._children[i].mount();
        }
    }

    unmount(): void {
        this.emit('unmount');
        for (let i = 0; i < this._children.length; i++) {
            this._children[i].unmount();
        }
    }

    destroy(): void {
        this.emit('destroy');
        while (this._children.length > 0) {
            this._children[0].destroy();
        }
        if (this._parent) {
            this._parent.removeChild(this);
        }
        if (this._vertexBuffer) {
            this._vertexBuffer.destroy();
            this._vertexBuffer = null;
        }
        if (this._indexBuffer) {
            this._indexBuffer.destroy();
            this._indexBuffer = null;
        }
    }
}
