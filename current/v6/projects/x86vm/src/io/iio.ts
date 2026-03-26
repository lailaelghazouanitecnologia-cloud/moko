export interface IDevice {
  readPort(port: number, size: number): number;
  writePort(port: number, value: number, size: number): void;
}

export interface IIo {
  readPort(port: number, size: number): number;
  writePort(port: number, value: number, size: number): void;
  registerDevice(port: number, device: IDevice): void;
  setPortPermission(port: number, allowed: boolean): void;
}
