private _type: string;
    private _color: Vec3;
    private _intensity: number;
    private _range: number;
    private _innerConeAngle: number;
    private _outerConeAngle: number;
    private _shadowsEnabled: boolean;
    private _shadowMapResolution: number;

    constructor() {
        this._type = 'directional';
        this._color = new Vec3(1, 1, 1);
        this._intensity = 1;
        this._range = 10;
        this._innerConeAngle = 30;
        this._outerConeAngle = 45;
        this._shadowsEnabled = false;
        this._shadowMapResolution = 1024;
    }

    setType(type: string): void {
        this._type = type;
    }

    getType(): string {
        return this._type;
    }

    setColor(color: Vec3): void {
        this._color.copy(color);
    }

    getColor(): Vec3 {
        return this._color.clone();
    }

    setIntensity(intensity: number): void {
        this._intensity = intensity;
    }

    getIntensity(): number {
        return this._intensity;
    }

    setRange(range: number): void {
        this._range = range;
    }

    getRange(): number {
        return this._range;
    }

    setShadowsEnabled(enabled: boolean): void {
        this._shadowsEnabled = enabled;
    }

    getShadowsEnabled(): boolean {
        return this._shadowsEnabled;
    }
}
