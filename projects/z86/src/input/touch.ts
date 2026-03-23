import { EventEmitter } from '../core/EventEmitter';
import { Vec2 } from '../math/Vec2';

export class Touch extends EventEmitter {
    private _touches: TouchData[] = [];
    private _maxTouches: number = 10;
    private _enabled: boolean = true;

    constructor() {
        super();
        this._initializeEventListeners();
    }

    private _initializeEventListeners(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
        window.addEventListener('touchcancel', this._onTouchCancel.bind(this), { passive: false });
    }

    private _onTouchStart(event: TouchEvent): void {
        if (!this._enabled) return;
        event.preventDefault();

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchData = new TouchData(
                touch.identifier,
                new Vec2(touch.clientX, touch.clientY),
                new Vec2(touch.pageX, touch.pageY),
                new Vec2(touch.screenX, touch.screenY),
                touch.target
            );

            const existingIndex = this._touches.findIndex(t => t.identifier === touch.identifier);
            if (existingIndex === -1 && this._touches.length < this._maxTouches) {
                this._touches.push(touchData);
                this.emit('touchstart', touchData);
            }
        }
    }

    private _onTouchMove(event: TouchEvent): void {
        if (!this._enabled) return;
        event.preventDefault();

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchIndex = this._touches.findIndex(t => t.identifier === touch.identifier);
            
            if (touchIndex !== -1) {
                const touchData = this._touches[touchIndex];
                touchData.client.set(touch.clientX, touch.clientY);
                touchData.page.set(touch.pageX, touch.pageY);
                touchData.screen.set(touch.screenX, touch.screenY);
                touchData.timestamp = Date.now();
                
                this.emit('touchmove', touchData);
            }
        }
    }

    private _onTouchEnd(event: TouchEvent): void {
        if (!this._enabled) return;
        event.preventDefault();

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchIndex = this._touches.findIndex(t => t.identifier === touch.identifier);
            
            if (touchIndex !== -1) {
                const touchData = this._touches.splice(touchIndex, 1)[0];
                this.emit('touchend', touchData);
            }
        }
    }

    private _onTouchCancel(event: TouchEvent): void {
        if (!this._enabled) return;
        event.preventDefault();

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchIndex = this._touches.findIndex(t => t.identifier === touch.identifier);
            
            if (touchIndex !== -1) {
                const touchData = this._touches.splice(touchIndex, 1)[0];
                this.emit('touchcancel', touchData);
            }
        }
    }

    getTouches(): TouchData[] {
        return [...this._touches];
    }

    getTouch(identifier: number): TouchData | null {
        return this._touches.find(t => t.identifier === identifier) || null;
    }

    getTouchCount(): number {
        return this._touches.length;
    }

    isTouched(identifier: number): boolean {
        return this._touches.some(t => t.identifier === identifier);
    }

    set enabled(value: boolean) {
        this._enabled = value;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set maxTouches(value: number) {
        this._maxTouches = Math.max(1, Math.floor(value));
    }

    get maxTouches(): number {
        return this._maxTouches;
    }

    destroy(): void {
        if (typeof window === 'undefined') return;

        window.removeEventListener('touchstart', this._onTouchStart.bind(this));
        window.removeEventListener('touchmove', this._onTouchMove.bind(this));
        window.removeEventListener('touchend', this._onTouchEnd.bind(this));
        window.removeEventListener('touchcancel', this._onTouchCancel.bind(this));
        
        this._touches.length = 0;
        this.removeAllListeners();
    }
}

export class TouchData {
    public identifier: number;
    public client: Vec2;
    public page: Vec2;
    public screen: Vec2;
    public target: EventTarget | null;
    public timestamp: number;

    constructor(
        identifier: number,
        client: Vec2,
        page: Vec2,
        screen: Vec2,
        target: EventTarget | null
    ) {
        this.identifier = identifier;
        this.client = client;
        this.page = page;
        this.screen = screen;
        this.target = target;
        this.timestamp = Date.now();
    }

    clone(): TouchData {
        return new TouchData(
            this.identifier,
            this.client.clone(),
            this.page.clone(),
            this.screen.clone(),
            this.target
        );
    }
}
