import { Component } from './Component';
import { Geometry } from './Geometry';
import { Material } from './Material';
import { BoundingBox } from './BoundingBox';
import { ForwardRenderer } from './renderer/ForwardRenderer';
import { Node } from './Node';

export class Mesh extends Component {
    geometry: Geometry;
    material: Material;
    castShadows: boolean;
    receiveShadows: boolean;
    layer: number;
    visible: boolean;
    worldBounds: BoundingBox;

    constructor() {
        super();
        this.geometry = null;
        this.material = null;
        this.castShadows = true;
        this.receiveShadows = true;
        this.layer = 0;
        this.visible = true;
        this.worldBounds = null;
    }

    setMaterial(material: Material): void {
        this.material = material;
    }

    getMaterial(): Material {
        return this.material;
    }

    computeWorldBounds(): BoundingBox {
        if (!this.geometry || !this.node) {
            return null;
        }

        const localBounds = this.geometry.getBounds();
        if (!localBounds) {
            return null;
        }

        const worldMatrix = this.node.getWorldMatrix();
        this.worldBounds = localBounds.transform(worldMatrix);
        return this.worldBounds;
    }

    isVisible(): boolean {
        if (!this.visible) {
            return false;
        }

        let current: Node = this.node;
        while (current) {
            const mesh = current.getComponent(Mesh);
            if (mesh && !mesh.visible) {
                return false;
            }
            current = current.getParent();
        }

        return true;
    }

    render(renderer: ForwardRenderer): void {
        if (!this.isVisible() || !this.geometry || !this.material) {
            return;
        }

        renderer.drawInstance(this);
    }

    setLayer(layer: number): void {
        this.layer = layer;
    }

    getLayer(): number {
        return this.layer;
    }

    setCastShadows(cast: boolean): void {
        this.castShadows = cast;
    }

    setReceiveShadows(receive: boolean): void {
        this.receiveShadows = receive;
    }

    updateBounds(): void {
        this.worldBounds = null;
    }
}
