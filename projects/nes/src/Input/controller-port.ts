export interface ControllerPort {
  read(): number;
  write(value: number): void;
  isStrobeActive(): boolean;
}
