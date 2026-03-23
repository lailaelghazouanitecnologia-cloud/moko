import { Component } from './component';
import { Vec3 } from '../math';
import { Color } from '../math';

export enum LightType {
    DIRECTIONAL = 0,
    POINT = 1,
    SPOT = 2
}

export class Light extends Component {
    private _position: Vec3;
    private _color: Color;
    private _intensity: number;
    private _type: LightType;

    constructor(entity: import('./entity').Entity) {
        super(entity);
        this._position = new Vec3(0, 0, 0);
        this._color = new Color(1, 1, 1, 1);
        this._intensity = 1;
        this._type = LightType.POINT;
    }

    get position(): Vec3 {
        return this._position;
    }

    set position(value: Vec3) {
        this._position.set(value.x, value.y, value.z);
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        this._color.set(value.r, value.g, value.b, value.a);
    }

    get intensity(): number {
        return this._intensity;
    }

    set intensity(value: number) {
        this._intensity = Math.max(0, value);
    }

    get type(): LightType {
        return this._type;
    }

    set type(value: LightType) {
        this._type = value;
    }
}
