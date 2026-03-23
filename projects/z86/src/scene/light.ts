import { Vec3 } from '../math/Vec3';
import { Color } from '../math/Color';
import { Component } from './Component';

export enum LightType {
    DIRECTIONAL = 'directional',
    POINT = 'point',
    SPOT = 'spot'
}

export class Light extends Component {
    private _position: Vec3;
    private _color: Color;
    private _intensity: number;
    private _type: LightType;

    constructor(position: Vec3 = new Vec3(0, 0, 0), color: Color = new Color(1, 1, 1), intensity: number = 1, type: LightType = LightType.POINT) {
        super();
        this._position = position.clone();
        this._color = color.clone();
        this._intensity = intensity;
        this._type = type;
    }

    get position(): Vec3 {
        return this._position;
    }

    set position(value: Vec3) {
        this._position = value.clone();
    }

    get color(): Color {
        return this._color;
    }

    set color(value: Color) {
        this._color = value.clone();
    }

    get intensity(): number {
        return this._intensity;
    }

    set intensity(value: number) {
        this._intensity = value;
    }

    get type(): LightType {
        return this._type;
    }

    set type(value: LightType) {
        this._type = value;
    }
}
