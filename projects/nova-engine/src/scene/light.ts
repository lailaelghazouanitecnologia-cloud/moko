import { Component } from './Component';
import { Vec3 } from '../math/Vec3';
import { Mat4 } from '../math/Mat4';
import { Color } from '../graphics/Color';
import { Texture } from '../graphics/Texture';
import { ForwardRenderer } from './renderer/ForwardRenderer';

export enum LightType {
    directional = 'directional',
    point = 'point',
    spot = 'spot'
}

export class Light extends Component {
    type: LightType = LightType.directional;
    color: Color = new Color(1, 1, 1);
    intensity: number = 1;
    range: number = 10;
    innerCone: number = 30;
    outerCone: number = 45;
    castShadows: boolean = false;
    shadowBias: number = 0.05;
    shadowMap: Texture | null = null;
    shadowMatrix: Mat4 = new Mat4();

    getDirection(): Vec3 {
        const worldRot = this.node.getWorldRotation();
        const forward = new Vec3(0, 0, -1);
        worldRot.transformVector(forward, forward);
        return forward;
    }

    getPosition(): Vec3 {
        const worldMatrix = this.node.getWorldMatrix();
        return new Vec3(worldMatrix.data[12], worldMatrix.data[13], worldMatrix.data[14]);
    }

    setDirection(dir: Vec3): void {
        const target = this.node.getPosition().clone().add(dir);
        this.node.lookAt(target, Vec3.UP);
    }

    computeShadowMatrix(): Mat4 {
        const pos = this.getPosition();
        const dir = this.getDirection();
        
        const up = Math.abs(dir.y) > 0.999 ? new Vec3(0, 0, 1) : Vec3.UP;
        const view = Mat4.createLookAt(pos, pos.clone().add(dir), up);
        
        const range = this.range * 2;
        const proj = Mat4.createOrthographic(-range, range, -range, range, 0.1, range);
        
        return proj.clone().mul(view);
    }

    isDirectional(): boolean {
        return this.type === LightType.directional;
    }

    isPoint(): boolean {
        return this.type === LightType.point;
    }

    isSpot(): boolean {
        return this.type === LightType.spot;
    }

    getAttenuation(distance: number): number {
        if (this.isDirectional()) return 1.0;
        
        const att = 1.0 / (1.0 + distance * distance / (this.range * this.range));
        return Math.max(0.0, Math.min(1.0, att));
    }

    getShadowMap(): Texture {
        if (!this.shadowMap) {
            this.shadowMap = new Texture(1024, 1024, {
                format: 'depth',
                wrap: 'clamp',
                filter: 'linear'
            });
        }
        return this.shadowMap;
    }

    updateShadow(renderer: ForwardRenderer): void {
        if (!this.castShadows) return;
        
        const shadowMap = this.getShadowMap();
        this.shadowMatrix = this.computeShadowMatrix();
        
        renderer.renderShadowMap(this, shadowMap);
    }
}
