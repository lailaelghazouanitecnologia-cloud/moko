import { Button } from './button';
import { InputState } from './input-state';

export class Joypad {
  private currentState: InputState = new InputState();
  private previousState: InputState = new InputState();
  private shiftRegister: number = 0;
  private strobe: boolean = false;

  press(button: Button): void {
    this.currentState.setButton(button, true);
  }

  release(button: Button): void {
    this.currentState.setButton(button, false);
  }

  update(): void {
    this.previousState.copy(this.currentState);
  }

  read(): number {
    let result = 0;
    if (this.shiftRegister & 0x01) {
      result = 1;
    }
    this.shiftRegister >>= 1;
    return result;
  }

  write(value: number): void {
    this.strobe = (value & 0x01) === 1;
    if (this.strobe) {
      this.shiftRegister = this.currentState.toByte();
    }
  }

  isPressed(button: Button): boolean {
    return this.currentState.getButton(button);
  }

  isJustPressed(button: Button): boolean {
    return this.currentState.getButton(button) && !this.previousState.getButton(button);
  }

  isJustReleased(button: Button): boolean {
    return !this.currentState.getButton(button) && this.previousState.getButton(button);
  }

  getAllPressed(): Button[] {
    const pressed: Button[] = [];
    const buttons = [Button.A, Button.B, Button.Select, Button.Start, Button.Up, Button.Down, Button.Left, Button.Right];
    for (const button of buttons) {
      if (this.currentState.getButton(button)) {
        pressed.push(button);
      }
    }
    return pressed;
  }

  reset(): void {
    this.currentState.reset();
    this.previousState.reset();
    this.shiftRegister = 0;
    this.strobe = false;
  }
}
