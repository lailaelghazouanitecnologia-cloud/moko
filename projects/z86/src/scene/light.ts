import { Component } from './component';
import { Vec3 } from '../math';
import { Color } from '../math';

export enum LightType {
  DIRECTIONAL = 'directional',
  POINT = 'point',
  SPOT = 'spot'
}

export class Light extends Component {
  private _type: LightType;
  private _color: Color;
  private _intensity: number;
  private _position: Vec3;
  private _direction: Vec3;
  private _innerConeAngle: number;
  private _outerConeAngle: number;
  private _range: number;
  private _castShadows: boolean;
  private _shadowBias: number;
  private _shadowResolution: number;

  constructor() {
    super();
    this._type = LightType.DIRECTIONAL;
    this._color = new Color(1, 1, 1, 1);
    this._intensity = 1;
    this._position = new Vec3(0, 0, 0);
    this._direction = new Vec3(0, -1, 0);
    this._innerConeAngle = 40;
    this._outerConeAngle = 45;
    this._range = 10;
    this._castShadows = false;
    this._shadowBias = 0.05;
    this._shadowResolution = 1024;
  }

  get type(): LightType {
    return this._type;
  }

  set type(value: LightType) {
    this._type = value;
  }

  get color(): Color {
    return this._color;
  }

  set color(value: Color) {
    this._color.copy(value);
  }

  get intensity(): number {
    return this._intensity;
  }

  set intensity(value: number) {
    this._intensity = value;
  }

  get position(): Vec3 {
    return this._position;
  }

  set position(value: Vec3) {
    this._position.copy(value);
  }

  get direction(): Vec3 {
    return this._direction;
  }

  set direction(value: Vec3) {
    this._direction.copy(value);
  }

  get innerConeAngle(): number {
    return this._innerConeAngle;
  }

  set innerConeAngle(value: number) {
    this._innerConeAngle = value;
  }

  get outerConeAngle(): number {
    return this._outerConeAngle;
  }

  set outerConeAngle(value: number) {
    this._outerConeAngle = value;
  }

  get range(): number {
    return this._range;
  }

  set range(value: number) {
    this._range = value;
  }

  get castShadows(): boolean {
    return this._castShadows;
  }

  set castShadows(value: boolean) {
    this._castShadows = value;
  }

  get shadowBias(): number {
    return this._shadowBias;
  }

  set shadowBias(value: number) {
    this._shadowBias = value;
  }

  get shadowResolution(): number {
    return this._shadowResolution;
  }

  set shadowResolution(value: number) {
    this._shadowResolution = value;
  }

  clone(): Light {
    const clone = new Light();
    clone._type = this._type;
    clone._color.copy(this._color);
    clone._intensity = this._intensity;
    clone._position.copy(this._position);
    clone._direction.copy(this._direction);
    clone._innerConeAngle = this._innerConeAngle;
    clone._outerConeAngle = this._outerConeAngle;
    clone._range = this._range;
    clone._castShadows = this._castShadows;
    clone._shadowBias = this._shadowBias;
    clone._shadowResolution = this._shadowResolution;
    return clone;
  }
}
