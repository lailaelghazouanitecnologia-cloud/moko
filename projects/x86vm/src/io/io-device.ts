read(port: number, size: IOSize): number;
  write(port: number, value: number, size: IOSize): void;
  getBasePort(): number;
  getPortCount(): number;
  getName(): string;
  isPortValid(port: number): boolean;
  reset(): void;
  getIRQ(): number | null;
  canInterrupt(): boolean;
  getInterruptVector(): number;
}
