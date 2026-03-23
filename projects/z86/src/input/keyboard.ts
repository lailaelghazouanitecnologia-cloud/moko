import { EventEmitter } from '../core/event-emitter';
import { Platform } from '../core/platform';

export interface KeyboardEvent {
    key: string;
    code: string;
    altKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
    shiftKey: boolean;
    repeat: boolean;
    timestamp: number;
}

export class Keyboard extends EventEmitter {
    private _keysPressed: Set<string> = new Set();
    private _keyCodes: Map<string, string> = new Map();
    private _element: HTMLElement | Window;
    private _enabled: boolean = true;

    constructor(element?: HTMLElement | Window) {
        super();
        this._element = element || (typeof window !== 'undefined' ? window : (globalThis as any));
        this._initializeKeyCodes();
        this._attachEventListeners();
    }

    private _initializeKeyCodes(): void {
        const codeMap: { [key: string]: string } = {
            'Space': ' ',
            'Enter': 'Enter',
            'Tab': 'Tab',
            'Escape': 'Escape',
            'Backspace': 'Backspace',
            'Delete': 'Delete',
            'ArrowUp': 'ArrowUp',
            'ArrowDown': 'ArrowDown',
            'ArrowLeft': 'ArrowLeft',
            'ArrowRight': 'ArrowRight',
            'ShiftLeft': 'Shift',
            'ShiftRight': 'Shift',
            'ControlLeft': 'Control',
            'ControlRight': 'Control',
            'AltLeft': 'Alt',
            'AltRight': 'Alt',
            'MetaLeft': 'Meta',
            'MetaRight': 'Meta',
            'Digit0': '0',
            'Digit1': '1',
            'Digit2': '2',
            'Digit3': '3',
            'Digit4': '4',
            'Digit5': '5',
            'Digit6': '6',
            'Digit7': '7',
            'Digit8': '8',
            'Digit9': '9',
            'KeyA': 'a',
            'KeyB': 'b',
            'KeyC': 'c',
            'KeyD': 'd',
            'KeyE': 'e',
            'KeyF': 'f',
            'KeyG': 'g',
            'KeyH': 'h',
            'KeyI': 'i',
            'KeyJ': 'j',
            'KeyK': 'k',
            'KeyL': 'l',
            'KeyM': 'm',
            'KeyN': 'n',
            'KeyO': 'o',
            'KeyP': 'p',
            'KeyQ': 'q',
            'KeyR': 'r',
            'KeyS': 's',
            'KeyT': 't',
            'KeyU': 'u',
            'KeyV': 'v',
            'KeyW': 'w',
            'KeyX': 'x',
            'KeyY': 'y',
            'KeyZ': 'z'
        };

        for (const [code, key] of Object.entries(codeMap)) {
            this._keyCodes.set(code, key);
        }
    }

    private _attachEventListeners(): void {
        if (!this._enabled || !this._element) return;

        const target = this._element as any;
        
        target.addEventListener('keydown', this._onKeyDown.bind(this));
        target.addEventListener('keyup', this._onKeyUp.bind(this));
        
        if (typeof window !== 'undefined') {
            window.addEventListener('blur', this._onBlur.bind(this));
        }
    }

    private _detachEventListeners(): void {
        const target = this._element as any;
        
        if (target.removeEventListener) {
            target.removeEventListener('keydown', this._onKeyDown.bind(this));
            target.removeEventListener('keyup', this._onKeyUp.bind(this));
        }
        
        if (typeof window !== 'undefined') {
            window.removeEventListener('blur', this._onBlur.bind(this));
        }
    }

    private _onKeyDown(event: any): void {
        if (!this._enabled) return;

        const key = this._getKeyFromCode(event.code) || event.key;
        
        if (!this._keysPressed.has(key)) {
            this._keysPressed.add(key);
            
            const keyboardEvent: KeyboardEvent = {
                key: key,
                code: event.code,
                altKey: event.altKey,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
                repeat: event.repeat,
                timestamp: Date.now()
            };
            
            this.emit('keydown', keyboardEvent);
        }
    }

    private _onKeyUp(event: any): void {
        if (!this._enabled) return;

        const key = this._getKeyFromCode(event.code) || event.key;
        
        this._keysPressed.delete(key);
        
        const keyboardEvent: KeyboardEvent = {
            key: key,
            code: event.code,
            altKey: event.altKey,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            repeat: event.repeat,
            timestamp: Date.now()
        };
        
        this.emit('keyup', keyboardEvent);
    }

    private _onBlur(): void {
        this._keysPressed.clear();
    }

    private _getKeyFromCode(code: string): string | undefined {
        return this._keyCodes.get(code);
    }

    public isKeyPressed(key: string): boolean {
        return this._keysPressed.has(key);
    }

    public isAnyKeyPressed(keys: string[]): boolean {
        return keys.some(key => this._keysPressed.has(key));
    }

    public getKeysPressed(): string[] {
        return Array.from(this._keysPressed);
    }

    public enable(): void {
        if (!this._enabled) {
            this._enabled = true;
            this._attachEventListeners();
        }
    }

    public disable(): void {
        if (this._enabled) {
            this._enabled = false;
            this._detachEventListeners();
            this._keysPressed.clear();
        }
    }

    public destroy(): void {
        this.disable();
        this.removeAllListeners();
    }

    get enabled(): boolean {
        return this._enabled;
    }
}
