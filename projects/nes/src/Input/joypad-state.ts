export class JoypadState {
  private a: boolean = false;
  private b: boolean = false;
  private select: boolean = false;
  private start: boolean = false;
  private up: boolean = false;
  private down: boolean = false;
  private left: boolean = false;
  private right: boolean = false;

  setButton(button: string, pressed: boolean): void {
    switch (button.toLowerCase()) {
      case 'a':
        this.a = pressed;
        break;
      case 'b':
        this.b = pressed;
        break;
      case 'select':
        this.select = pressed;
        break;
      case 'start':
        this.start = pressed;
        break;
      case 'up':
        this.up = pressed;
        break;
      case 'down':
        this.down = pressed;
        break;
      case 'left':
        this.left = pressed;
        break;
      case 'right':
        this.right = pressed;
        break;
      default:
        throw new Error(`Unknown button: ${button}`);
    }
  }

  getButton(button: string): boolean {
    switch (button.toLowerCase()) {
      case 'a':
        return this.a;
      case 'b':
        return this.b;
      case 'select':
        return this.select;
      case 'start':
        return this.start;
      case 'up':
        return this.up;
      case 'down':
        return this.down;
      case 'left':
        return this.left;
      case 'right':
        return this.right;
      default:
        throw new Error(`Unknown button: ${button}`);
    }
  }

  toByte(): number {
    let byte = 0;
    if (this.a) byte |= 0x01;
    if (this.b) byte |= 0x02;
    if (this.select) byte |= 0x04;
    if (this.start) byte |= 0x08;
    if (this.up) byte |= 0x10;
    if (this.down) byte |= 0x20;
    if (this.left) byte |= 0x40;
    if (this.right) byte |= 0x80;
    return byte;
  }

  fromByte(byte: number): void {
    this.a = (byte & 0x01) !== 0;
    this.b = (byte & 0x02) !== 0;
    this.select = (byte & 0x04) !== 0;
    this.start = (byte & 0x08) !== 0;
    this.up = (byte & 0x10) !== 0;
    this.down = (byte & 0x20) !== 0;
    this.left = (byte & 0x40) !== 0;
    this.right = (byte & 0x80) !== 0;
  }

  reset(): void {
    this.a = false;
    this.b = false;
    this.select = false;
    this.start = false;
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
  }

  clone(): JoypadState {
    const copy = new JoypadState();
    copy.a = this.a;
    copy.b = this.b;
    copy.select = this.select;
    copy.start = this.start;
    copy.up = this.up;
    copy.down = this.down;
    copy.left = this.left;
    copy.right = this.right;
    return copy;
  }
}
