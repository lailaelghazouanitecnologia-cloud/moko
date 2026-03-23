import { Component } from '../gameobject/Component';
import { Vec3 } from '../math/Vec3';
import { Color } from '../math/Color';
import { Mat4 } from '../math/Mat4';
import { Texture } from '../graphics/Texture';
import { LightType } from './LightType';

export class Light extends Component {
    type: LightType;
    color: Color;
    intensity: number;
    range: number;
    spotAngle: number;
    castShadows: boolean;
    shadowResolution: number;
    shadowBias: number;
    shadowMap: Texture | null;

    constructor() {
        super();
        this.type = LightType.DIRECTIONAL;
        this.color = Color.WHITE.clone();
        this.intensity = 1;
        this.range = 10;
        this.spotAngle = 30;
        this.castShadows = false;
        this.shadowResolution = 1024;
        this.shadowBias = 0.005;
        this.shadowMap = null;
    }

    getDirection(): Vec3 {
        const transform = this.getGameObject().transform;
        return transform.forward.clone();
    }

    getAttenuation(distance: number): number {
        if (this.type === LightType.DIRECTIONAL) return 1.0;
        const att = Math.max(0, 1 - (distance / this.range));
        return att * att;
    }

    getSpotFactor(direction: Vec3): number {
        if (this.type !== LightType.SPOT) return 1.0;
        const lightDir = this.getDirection().mulScalar(-1);
        const cosAngle = lightDir.dot(direction.normalize());
        const halfAngle = (this.spotAngle * Math.PI / 180) / 2;
        const cosCutoff = Math.cos(halfAngle);
        if (cosAngle < cosCutoff) return 0.0;
        const innerCos = Math.cos(halfAngle * 0.8);
        return Math.min(1, (cosAngle - cosCutoff) / (innerCos - cosCutoff));
    }

    setType(type: LightType): void {
        this.type = type;
    }

    setColor(color: Color): void {
        this.color.copy(color);
    }

    setIntensity(intensity: number): void {
        this.intensity = intensity;
    }

    setRange(range: number): void {
        this.range = range;
    }

    setSpotAngle(angle: number): void {
        this.spotAngle = angle;
    }

    enableShadows(enable: boolean): void {
        this.castShadows = enable;
    }

    updateShadowMap(): void {
        if (!this.castShadows) return;
        if (!this.shadowMap) {
            this.shadowMap = new Texture();
            this.shadowMap.width = this.shadowResolution;
            this.shadowMap.height = this.shadowResolution;
            this.shadowMap.format = Texture.FORMAT_DEPTH;
        }
    }

    getShadowMatrix(): Mat4 {
        const view = new Mat4();
        const proj = new Mat4();
        const viewProj = new Mat4();
        const transform = this.getGameObject().transform;
        const pos = transform.position;
        const dir = this.getDirection().mulScalar(-1);
        view.lookAt(pos, pos.add(dir), Vec3.UP);
        if (this.type === LightType.DIRECTIONAL) {
            proj.ortho(-20, 20, -20, 20, 0.1, 100);
        } else {
            proj.perspective(this.spotAngle * 2, 1, 0.1, this.range);
        }
        viewProj.mul2(proj, view);
        return viewProj;
    }
}
