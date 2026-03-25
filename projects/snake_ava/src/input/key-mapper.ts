import { InputHandler } from './input-handler';

export class KeyMapper {
  private readonly keyMap: Map<string, string>;
  private readonly inverseMap: Map<string, string>;

  constructor(keyMap?: Map<string, string>) {
    this.keyMap = new Map(keyMap);
    this.inverseMap = new Map();
    for (const [key, command] of this.keyMap) {
      this.inverseMap.set(command, key);
    }
  }

  bind(key: string, command: string): void {
      this.keyMap.set(key, command);
      this.inverseMap.set(command, key);
  }

  unbind(key: string): void {
      const command = this.keyMap.get(key);
      if (command !== undefined) {
        this.keyMap = new Map(this.keyMap);
        this.keyMap = new Map(this.keyMap);
        this.keyMap.delete(key);
        this.inverseMap = new Map(this.inverseMap);
        this.inverseMap.delete(command);
      }
  }

  commandFor(key: string): string | undefined {
      return this.keyMap.get(key);
  }

  keyFor(command: string): string | undefined {
      return this.inverseMap.get(command);
  }

  hasKey(key: string): boolean {
      return this.keyMap.has(key);
  }

  hascommand(command: string): boolean {
      return this.inverseMap.has(command);
  }

  clear(): void {
      this.keyMap = new Map();
      this.inverseMap = new Map();
  }

  clone(): KeyMapper {
      return new KeyMapper(this.keyMap);
  }
}
