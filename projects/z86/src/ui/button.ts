import { EventEmitter } from '../core/event-emitter';
import { Platform } from '../core/platform';
import { ElementInput } from '../input/element-input';

export interface ButtonOptions {
  text?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export class Button extends EventEmitter {
  private _element: HTMLButtonElement;
  private _options: Required<ButtonOptions>;
  private _input: ElementInput;

  constructor(options: ButtonOptions = {}) {
    super();
    
    this._options = {
      text: options.text ?? '',
      disabled: options.disabled ?? false,
      variant: options.variant ?? 'primary',
      size: options.size ?? 'medium',
      onClick: options.onClick ?? (() => {}),
      onFocus: options.onFocus ?? (() => {}),
      onBlur: options.onBlur ?? (() => {})
    };

    this._element = document.createElement('button');
    this._element.type = 'button';
    this._element.className = this._buildClassName();
    this._element.textContent = this._options.text;
    this._element.disabled = this._options.disabled;

    this._input = new ElementInput(this._element);
    this._attachEventListeners();
  }

  private _buildClassName(): string {
    const base = 'roska-button';
    const variant = `${base}--${this._options.variant}`;
    const size = `${base}--${this._options.size}`;
    return `${base} ${variant} ${size}`;
  }

  private _attachEventListeners(): void {
    this._element.addEventListener('click', (e) => {
      e.preventDefault();
      if (!this._options.disabled) {
        this._options.onClick();
        this.emit('click');
      }
    });

    this._element.addEventListener('focus', () => {
      this._options.onFocus();
      this.emit('focus');
    });

    this._element.addEventListener('blur', () => {
      this._options.onBlur();
      this.emit('blur');
    });
  }

  get element(): HTMLButtonElement {
    return this._element;
  }

  get text(): string {
    return this._options.text;
  }

  set text(value: string) {
    this._options.text = value;
    this._element.textContent = value;
  }

  get disabled(): boolean {
    return this._options.disabled;
  }

  set disabled(value: boolean) {
    this._options.disabled = value;
    this._element.disabled = value;
    this._element.classList.toggle('roska-button--disabled', value);
  }

  get variant(): string {
    return this._options.variant;
  }

  set variant(value: 'primary' | 'secondary' | 'danger') {
    this._element.classList.remove(`roska-button--${this._options.variant}`);
    this._options.variant = value;
    this._element.classList.add(`roska-button--${value}`);
  }

  get size(): string {
    return this._options.size;
  }

  set size(value: 'small' | 'medium' | 'large') {
    this._element.classList.remove(`roska-button--${this._options.size}`);
    this._options.size = value;
    this._element.classList.add(`roska-button--${value}`);
  }

  focus(): void {
    this._element.focus();
  }

  blur(): void {
    this._element.blur();
  }

  click(): void {
    this._element.click();
  }

  destroy(): void {
    this._input.destroy();
    this._element.remove();
    this.removeAllListeners();
  }
}
