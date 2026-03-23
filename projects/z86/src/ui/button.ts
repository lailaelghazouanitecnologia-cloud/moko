import { EventEmitter } from '../core';
import { Vec2, Vec4 } from '../math';
import { Element } from './element';

export interface ButtonOptions {
    label?: string;
    icon?: string;
    iconWidth?: number;
    iconHeight?: number;
    labelColor?: Vec4;
    backgroundColor?: Vec4;
    hoverColor?: Vec4;
    activeColor?: Vec4;
    disabledColor?: Vec4;
    fontSize?: number;
    fontFamily?: string;
    padding?: Vec2;
    borderRadius?: number;
    enabled?: boolean;
    visible?: boolean;
}

export type ButtonEventType = 'click' | 'hover' | 'leave' | 'down' | 'up' | 'disable' | 'enable';

export class Button extends Element {
    private _label: string;
    private _icon: string;
    private _iconWidth: number;
    private _iconHeight: number;
    private _labelColor: Vec4;
    private _backgroundColor: Vec4;
    private _hoverColor: Vec4;
    private _activeColor: Vec4;
    private _disabledColor: Vec4;
    private _fontSize: number;
    private _fontFamily: string;
    private _padding: Vec2;
    private _borderRadius: number;
    private _enabled: boolean;
    private _visible: boolean;
    private _hovered: boolean;
    private _pressed: boolean;
    private _domElement: HTMLElement | null;
    private _eventEmitter: EventEmitter;

    constructor(options: ButtonOptions = {}) {
        super();
        this._label = options.label || '';
        this._icon = options.icon || '';
        this._iconWidth = options.iconWidth || 16;
        this._iconHeight = options.iconHeight || 16;
        this._labelColor = options.labelColor || new Vec4(1, 1, 1, 1);
        this._backgroundColor = options.backgroundColor || new Vec4(0.2, 0.2, 0.2, 1);
        this._hoverColor = options.hoverColor || new Vec4(0.3, 0.3, 0.3, 1);
        this._activeColor = options.activeColor || new Vec4(0.1, 0.1, 0.1, 1);
        this._disabledColor = options.disabledColor || new Vec4(0.5, 0.5, 0.5, 0.5);
        this._fontSize = options.fontSize || 14;
        this._fontFamily = options.fontFamily || 'Arial, sans-serif';
        this._padding = options.padding || new Vec2(8, 4);
        this._borderRadius = options.borderRadius || 4;
        this._enabled = options.enabled !== false;
        this._visible = options.visible !== false;
        this._hovered = false;
        this._pressed = false;
        this._domElement = null;
        this._eventEmitter = new EventEmitter();
        this._createDomElement();
        this._attachEventListeners();
    }

    private _createDomElement(): void {
        this._domElement = document.createElement('button');
        this._domElement.style.position = 'absolute';
        this._domElement.style.border = 'none';
        this._domElement.style.outline = 'none';
        this._domElement.style.cursor = 'pointer';
        this._domElement.style.fontFamily = this._fontFamily;
        this._domElement.style.fontSize = `${this._fontSize}px`;
        this._domElement.style.padding = `${this._padding.y}px ${this._padding.x}px`;
        this._domElement.style.borderRadius = `${this._borderRadius}px`;
        this._domElement.style.color = `rgba(${Math.round(this._labelColor.x * 255)}, ${Math.round(this._labelColor.y * 255)}, ${Math.round(this._labelColor.z * 255)}, ${this._labelColor.w})`;
        this._domElement.style.backgroundColor = `rgba(${Math.round(this._backgroundColor.x * 255)}, ${Math.round(this._backgroundColor.y * 255)}, ${Math.round(this._backgroundColor.z * 255)}, ${this._backgroundColor.w})`;
        this._updateContent();
        this._updateState();
    }

    private _updateContent(): void {
        if (!this._domElement) return;
        if (this._icon) {
            const img = document.createElement('img');
            img.src = this._icon;
            img.width = this._iconWidth;
            img.height = this._iconHeight;
            img.style.verticalAlign = 'middle';
            img.style.marginRight = this._label ? '4px' : '0';
            this._domElement.innerHTML = '';
            this._domElement.appendChild(img);
            if (this._label) {
                const span = document.createElement('span');
                span.textContent = this._label;
                span.style.verticalAlign = 'middle';
                this._domElement.appendChild(span);
            }
        } else {
            this._domElement.textContent = this._label;
        }
    }

    private _updateState(): void {
        if (!this._domElement) return;
        if (!this._enabled) {
            this._domElement.style.backgroundColor = `rgba(${Math.round(this._disabledColor.x * 255)}, ${Math.round(this._disabledColor.y * 255)}, ${Math.round(this._disabledColor.z * 255)}, ${this._disabledColor.w})`;
            this._domElement.style.pointerEvents = 'none';
        } else {
            this._domElement.style.pointerEvents = 'auto';
            if (this._pressed) {
                this._domElement.style.backgroundColor = `rgba(${Math.round(this._activeColor.x * 255)}, ${Math.round(this._activeColor.y * 255)}, ${Math.round(this._activeColor.z * 255)}, ${this._activeColor.w})`;
            } else if (this._hovered) {
                this._domElement.style.backgroundColor = `rgba(${Math.round(this._hoverColor.x * 255)}, ${Math.round(this._hoverColor.y * 255)}, ${Math.round(this._hoverColor.z * 255)}, ${this._hoverColor.w})`;
            } else {
                this._domElement.style.backgroundColor = `rgba(${Math.round(this._backgroundColor.x * 255)}, ${Math.round(this._backgroundColor.y * 255)}, ${Math.round(this._backgroundColor.z * 255)}, ${this._backgroundColor.w})`;
            }
        }
        this._domElement.style.display = this._visible ? 'block' : 'none';
    }

    private _attachEventListeners(): void {
        if (!this._domElement) return;
        this._domElement.addEventListener('mouseenter', this._onMouseEnter.bind(this));
        this._domElement.addEventListener('mouseleave', this._onMouseLeave.bind(this));
        this._domElement.addEventListener('mousedown', this._onMouseDown.bind(this));
        this._domElement.addEventListener('mouseup', this._onMouseUp.bind(this));
        this._domElement.addEventListener('click', this._onClick.bind(this));
    }

    private _onMouseEnter(): void {
        if (!this._enabled) return;
        this._hovered = true;
        this._updateState();
        this._eventEmitter.emit('hover');
    }

    private _onMouseLeave(): void {
        if (!this._enabled) return;
        this._hovered = false;
        this._pressed = false;
        this._updateState();
        this._eventEmitter.emit('leave');
    }

    private _onMouseDown(): void {
        if (!this._enabled) return;
        this._pressed = true;
        this._updateState();
        this._eventEmitter.emit('down');
    }

    private _onMouseUp(): void {
        if (!this._enabled) return;
        this._pressed = false;
        this._updateState();
        this._eventEmitter.emit('up');
    }

    private _onClick(): void {
        if (!this._enabled) return;
        this._eventEmitter.emit('click');
    }

    get label(): string {
        return this._label;
    }

    set label(value: string) {
        this._label = value;
        this._updateContent();
    }

    get icon(): string {
        return this._icon;
    }

    set icon(value: string) {
        this._icon = value;
        this._updateContent();
    }

    get iconWidth(): number {
        return this._iconWidth;
    }

    set iconWidth(value: number) {
        this._iconWidth = value;
        this._updateContent();
    }

    get iconHeight(): number {
        return this._iconHeight;
    }

    set iconHeight(value: number) {
        this._iconHeight = value;
        this._updateContent();
    }

    get labelColor(): Vec4 {
        return this._labelColor;
    }

    set labelColor(value: Vec4) {
        this._labelColor = value;
        if (this._domElement) {
            this._domElement.style.color = `rgba(${Math.round(value.x * 255)}, ${Math.round(value.y * 255)}, ${Math.round(value.z * 255)}, ${value.w})`;
        }
    }

    get backgroundColor(): Vec4 {
        return this._backgroundColor;
    }

    set backgroundColor(value: Vec4) {
        this._backgroundColor = value;
        this._updateState();
    }

    get hoverColor(): Vec4 {
        return this._hoverColor;
    }

    set hoverColor(value: Vec4) {
        this._hoverColor = value;
        this._updateState();
    }

    get activeColor(): Vec4 {
        return this._activeColor;
    }

    set activeColor(value: Vec4) {
        this._activeColor = value;
        this._updateState();
    }

    get disabledColor(): Vec4 {
        return this._disabledColor;
    }

    set disabledColor(value: Vec4) {
        this._disabledColor = value;
        this._updateState();
    }

    get fontSize(): number {
        return this._fontSize;
    }

    set fontSize(value: number) {
        this._fontSize = value;
        if (this._domElement) {
            this._domElement.style.fontSize = `${value}px`;
        }
    }

    get fontFamily(): string {
        return this._fontFamily;
    }

    set fontFamily(value: string) {
        this._fontFamily = value;
        if (this._domElement) {
            this._domElement.style.fontFamily = value;
        }
    }

    get padding(): Vec2 {
        return this._padding;
    }

    set padding(value: Vec2) {
        this._padding = value;
        if (this._domElement) {
            this._domElement.style.padding = `${value.y}px ${value.x}px`;
        }
    }

    get borderRadius(): number {
        return this._borderRadius;
    }

    set borderRadius(value: number) {
        this._borderRadius = value;
        if (this._domElement) {
            this._domElement.style.borderRadius = `${value}px`;
        }
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(value: boolean) {
        this._enabled = value;
        this._updateState();
        this._eventEmitter.emit(value ? 'enable' : 'disable');
    }

    get visible(): boolean {
        return this._visible;
    }

    set visible(value: boolean) {
        this._visible = value;
        this._updateState();
    }

    get domElement(): HTMLElement | null {
        return this._domElement;
    }

    on(event: ButtonEventType, callback: (...args: any[]) => void): void {
        this._eventEmitter.on(event, callback);
    }

    off(event: ButtonEventType, callback: (...args: any[]) => void): void {
        this._eventEmitter.off(event, callback);
    }

    destroy(): void {
        if (this._domElement) {
            this._domElement.remove();
            this._domElement = null;
        }
        this._eventEmitter.removeAllListeners();
    }
}
