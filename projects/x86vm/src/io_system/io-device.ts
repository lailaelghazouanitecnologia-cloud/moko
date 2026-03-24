readPort(port: number, size: number): number;
  writePort(port: number, value: number, size: number): void;
  handleInterrupt(): boolean;
  getIRQ(): number;
  reset(): void;
}
