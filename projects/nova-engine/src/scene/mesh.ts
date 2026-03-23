import { Component } from '../gameobject/Component';
import { Geometry } from '../geometry/Geometry';
import { Material } from './Material';
import { BoundingBox } from '../math/BoundingBox';
import { BoundingSphere } from '../math/BoundingSphere';
import { ForwardRenderer } from './renderer/ForwardRenderer';

export class Mesh extends Component {
    private _geometry: Geometry | null = null;
    private _material: Material | null = null;
    private _castShadows: boolean = true;
    private _receiveShadows: boolean = true;
    private _boundingBox: BoundingBox | null = null;
    private _boundingSphere: BoundingSphere | null = null;
    private _visible: boolean = true;
    private _layer: number = 0;

    constructor() {
        super();
    }

    setGeometry(geometry: Geometry): void {
        this._geometry = geometry;
        this.updateBounds();
    }

    setMaterial(material: Material): void {
        this._material = material;
    }

    getBounds(): BoundingBox {
        if (!this._boundingBox) {
            this.updateBounds();
        }
        return this._boundingBox!;
    }

    updateBounds(): void {
        if (!this._geometry) {
            this._boundingBox = new BoundingBox();
            this._boundingSphere = new BoundingSphere();
            return;
        }

        const positions = this._geometry.getPositions();
        if (!positions || positions.length === 0) {
            this._boundingBox = new BoundingBox();
            this._boundingSphere = new BoundingSphere();
            return;
        }

        let minX = positions[0];
        let minY = positions[1];
        let minZ = positions[2];
        let maxX = positions[0];
        let maxY = positions[1];
        let maxZ = positions[2];

        for (let i = 3; i < positions.length; i += 3) {
            const x = positions[i];
            const y = positions[i + 1];
            const z = positions[i + 2];

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            minZ = Math.min(minZ, z);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            maxZ = Math.max(maxZ, z);
        }

        this._boundingBox = new BoundingBox();
        this._boundingBox.setMinMax(
            { x: minX, y: minY, z: minZ },
            { x: maxX, y: maxY, z: maxZ }
        );

        this._boundingSphere = this.computeBoundingSphere();
    }

    isVisible(): boolean {
        return this._visible;
    }

    setVisible(visible: boolean): void {
        this._visible = visible;
    }

    setLayer(layer: number): void {
        this._layer = layer;
    }

    setCastShadows(cast: boolean): void {
        this._castShadows = cast;
    }

    setReceiveShadows(receive: boolean): void {
        this._receiveShadows = receive;
    }

    render(renderer: ForwardRenderer): void {
        if (!this._visible || !this._geometry || !this._material) {
            return;
        }

        renderer.drawInstance({
            mesh: this,
            geometry: this._geometry,
            material: this._material,
            layer: this._layer,
            castShadows: this._castShadows,
            receiveShadows: this._receiveShadows
        });
    }

    getMaterial(): Material {
        return this._material!;
    }

    computeBoundingSphere(): BoundingSphere {
        if (!this._boundingBox) {
            this.updateBounds();
        }

        const center = this._boundingBox!.getCenter();
        const size = this._boundingBox!.getSize();
        const radius = Math.max(size.x, Math.max(size.y, size.z)) * 0.5;

        const sphere = new BoundingSphere();
        sphere.setCenterRadius(center, radius);
        return sphere;
    }

    get geometry(): Geometry | null {
        return this._geometry;
    }

    get material(): Material | null {
        return this._material;
    }

    get castShadows(): boolean {
        return this._castShadows;
    }

    get receiveShadows(): boolean {
        return this._receiveShadows;
    }

    get boundingBox(): BoundingBox | null {
        return this._boundingBox;
    }

    get boundingSphere(): BoundingSphere | null {
        return this._boundingSphere;
    }

    get visible(): boolean {
        return this._visible;
    }

    get layer(): number {
        return this._layer;
    }
}
