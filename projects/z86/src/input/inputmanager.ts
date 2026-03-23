import { EventEmitter } from 'events';
import { Keyboard } from './keyboard';
import { Mouse } from './mouse';
import { Gamepad } from './gamepad';

export class InputManager {
  private keyboard: Keyboard;
  private mouse: Mouse;
  private gamepad: Gamepad;
  private eventEmitter: EventEmitter;
  private isActive: boolean;

  constructor() {
    this.keyboard = new Keyboard();
    this.mouse = new Mouse();
    this.gamepad = new Gamepad();
    this.eventEmitter = new EventEmitter();
    this.isActive = false;
  }

  registerEvent(eventName: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.on(eventName, callback);
  }

  unregisterEvent(eventName: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.off(eventName, callback);
  }

  registerOnce(eventName: string, callback: (...args: any[]) => void): void {
    this.eventEmitter.once(eventName, callback);
  }

  emitEvent(eventName: string, ...args: any[]): void {
    this.eventEmitter.emit(eventName, ...args);
  }

  isKeyPressed(keyCode: string): boolean {
    return this.keyboard.isPressed(keyCode);
  }

  isKeyJustPressed(keyCode: string): boolean {
    return this.keyboard.isJustPressed(keyCode);
  }

  isKeyJustReleased(keyCode: string): boolean {
    return this.keyboard.isJustReleased(keyCode);
  }

  getMousePosition(): { x: number; y: number } {
    return this.mouse.getPosition();
  }

  isMouseButtonPressed(button: number): boolean {
    return this.mouse.isButtonPressed(button);
  }

  isMouseButtonJustPressed(button: number): boolean {
    return this.mouse.isButtonJustPressed(button);
 }

  isMouseButtonJustReleased(button: number): boolean {
    return this.mouse.isButtonJustReleased(button);
  }

  getMouseWheelDelta(): number {
    return this.mouse.getWheelDelta();
  }

  isGamepadConnected(index: number): boolean {
    return this.gamepad.isConnected(index);
  }

  getGamepadButtonState(index: number, button: number): boolean {
    return this.gamepad.getButtonState(index, button);
  }

  getGamepadAxisValue(index: number, axis: number): number {
    return this.gamepad.getAxisValue(index, axis);
  }

  getGamepadName(index: number): string {
    return this.gamepad.getName(index);
  }

  update(): void {
    if (!this.isActive) return;

    this.keyboard.update();
    this.mouse.update();
    this.gamepad.update();
  }

  cleanup(): void {
    this.keyboard.cleanup();
    this.mouse.cleanup();
    this.gamepad.cleanup();
    this.eventEmitter.removeAllListeners();
  }

  start(): void {
    this.isActive = true;
  }

  stop(): void {
    this.isActive = false;
  }

  isRunning(): boolean {
    return this.isActive;
  }
}
